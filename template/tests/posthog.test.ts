/**
 * The PostHog dashboards (scripts/posthogDashboards.ts, `npm run posthog`):
 * every event they read is in the catalogue and every property on its row in
 * docs/ANALYTICS.md, as Naz's posthog-lib test holds its own; what an app's
 * catalogue lacks drops out; and the API calls find each by name.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { EVENTS } from '../src/lib/events';
import { createPostHogSetup, dashboardsFor, documented } from '../scripts/posthogDashboards';

const doc = documented(readFileSync(new URL('../docs/ANALYTICS.md', import.meta.url), 'utf8'));
const dashboards = dashboardsFor(EVENTS, doc);
const insight = (name: string) => dashboards.flatMap((d) => d.insights).find((i) => i.name === name);

test('every event and property the dashboards read is catalogued and documented', () => {
  const reads = dashboards.flatMap((d) => d.insights.flatMap((i) => i.reads));
  assert.ok(reads.length > 10, 'the dashboards read the catalogue');
  for (const { event, properties } of reads) {
    assert.ok(EVENTS[event], `${event} is in src/lib/events.ts`);
    for (const p of properties) if (!p.startsWith('$')) assert.ok(doc[event]?.has(p), `docs/ANALYTICS.md names \`${p}\` on \`${event}\``);
  }
});

test('the template gets its Overview and Onboarding, and no Programs dashboard without programs', () => {
  assert.deepEqual(dashboards.map((d) => d.name), ['Overview', 'Onboarding']);
  for (const name of ['Sign-ups a week', 'Sign-ups by method', 'Active people a week', 'Platforms', 'Checkout to Pro', 'Onboarding: ways out', 'Onboarding: steps skipped', 'Onboarding: where people leave'])
    assert.ok(insight(name), name);
  const funnel = insight('Onboarding to a first session')!.query as { series: { event: string; properties: unknown[] }[]; funnelsFilter: { funnelWindowInterval: number } };
  assert.deepEqual(funnel.series.map((s) => s.event), ['onboarding_step_seen', 'onboarding_finished', 'checked_in'], 'no program step; a check-in is the first session');
  assert.deepEqual(funnel.series[0].properties, [{ key: 'position', value: [1], operator: 'exact', type: 'event' }]);
  const weekly = insight('Active people a week')!.query as { series: { event: null; math: string }[]; interval: string };
  assert.deepEqual([weekly.series[0].event, weekly.series[0].math, weekly.interval], [null, 'dau', 'week']);
});

test('an app with programs gets the program funnel, and a property the doc doesn’t name drops its insight', () => {
  const catalogue = { ...EVENTS, program_build_started: 'x', program_build_finished: 'x', program_build_failed: 'x', program_started: 'x', session_started: 'x', session_finished: 'x' };
  const withDoc = { ...doc, program_build_finished: new Set(['fallback']), program_build_failed: new Set(['reason']), program_build_started: new Set<string>() };
  const app = dashboardsFor(catalogue, withDoc);
  assert.deepEqual(app.map((d) => d.name), ['Overview', 'Onboarding', 'Programs']);
  const programs = app.find((d) => d.name === 'Programs')!;
  const funnel = programs.insights.find((i) => i.name === 'Program funnel')!.query as { series: { event: string }[] };
  assert.deepEqual(funnel.series.map((s) => s.event), ['program_build_started', 'program_build_finished', 'program_started', 'session_started', 'session_finished']);
  const onboarding = app.find((d) => d.name === 'Onboarding')!.insights[0].query as { series: { event: string }[] };
  assert.deepEqual(onboarding.series.map((s) => s.event), ['onboarding_step_seen', 'onboarding_finished', 'program_build_finished', 'session_finished']);
  assert.ok(programs.insights.some((i) => i.name === 'Programs: who wrote them'));
  assert.ok(!programs.insights.some((i) => i.name === 'Programs: goals asked for'), '`goal` isn’t on program_build_started’s row');
});

test('documented() reads each event’s row', () => {
  const rows = documented('| Event | Sent from | Why |\n| `a_b` | API | x (`method`: `apple`) |\nnot a row `c`');
  assert.deepEqual([...rows.a_b], ['method', 'apple']);
  assert.equal(rows.c, undefined);
});

test('makes each dashboard and insight once, and updates them in place on a second run', async () => {
  const existing = new Map<string, number>();
  const calls: string[] = [];
  let id = 0;
  const fetchImpl = (async (url: string, init: RequestInit) => {
    const u = new URL(url);
    const kind = u.pathname.includes('/dashboards/') ? 'dashboard' : 'insight';
    calls.push(`${init.method} ${kind}`);
    if (init.method === 'GET') {
      const name = u.searchParams.get('search')!;
      return Response.json({ results: existing.has(`${kind}:${name}`) ? [{ id: existing.get(`${kind}:${name}`), name }] : [] });
    }
    const body = JSON.parse(String(init.body));
    assert.match(String((init.headers as Record<string, string>).authorization), /^Bearer phx_/);
    if (kind === 'insight') assert.equal(body.query.kind, 'InsightVizNode');
    const made = existing.get(`${kind}:${body.name}`) ?? ++id;
    existing.set(`${kind}:${body.name}`, made);
    return Response.json({ id: made, ...body });
  }) as unknown as typeof globalThis.fetch;
  const setup = createPostHogSetup({ apiKey: 'phx_test', projectId: '42', fetchImpl, log: () => {} });
  const made = await setup.run(dashboards);
  assert.equal(made[0].url, `https://us.posthog.com/project/42/dashboard/${made.length && existing.get('dashboard:Overview')}`);
  const posts = calls.filter((c) => c.startsWith('POST')).length;
  assert.equal(posts, dashboards.length + dashboards.reduce((n, d) => n + d.insights.length, 0));
  calls.length = 0;
  await setup.run(dashboards);
  assert.equal(calls.filter((c) => c.startsWith('POST')).length, 0, 'nothing made twice');
  assert.ok(calls.some((c) => c.startsWith('PATCH')));
});
