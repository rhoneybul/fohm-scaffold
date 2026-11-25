/**
 * The app's dashboards in PostHog, from Naz's scripts/posthog-lib.mjs, built
 * from the event catalogue (src/lib/events.ts) and docs/ANALYTICS.md rather
 * than written per app:
 *
 *  - Overview: sign-ups a week and by method, people active a week, their
 *    platforms, and checkout to Pro.
 *  - Onboarding: the funnel from its first screen to finishing it, a program
 *    built and a first session, and where people skip and leave.
 *  - Programs (an app that builds them): asked for, built, opened, a session
 *    started and finished, and why builds fall back or fail.
 *
 * A step names the events that can fill it, the first in the catalogue taken
 * (a first session is `session_finished`, else `checked_in`); a step with none
 * is left out, a funnel with fewer than two steps, a dashboard without the
 * event it `needs` and one with no insights too. Every property an insight filters or breaks down by must be
 * named, in backticks, on its event's row in docs/ANALYTICS.md, or the insight
 * is left out: tests/posthog.test.ts holds the template's to the doc.
 *
 * `npm run posthog` makes them through PostHog's API (scripts/posthog.ts);
 * `--json` prints them for the PostHog connector instead (the app-launch
 * skill's reference/posthog.md). Safe to run again: each is found by its name
 * and changed in place.
 */

export type Catalogue = Record<string, string>;
/** Each event's documented properties: the backticked words on its row in docs/ANALYTICS.md. */
export type Documented = Record<string, Set<string>>;

type Where = Record<string, string | number | boolean | string[]>;
interface StepSpec {
  events: string[];
  label: string;
  where?: Where;
}
interface TrendSpec {
  kind: 'trend';
  name: string;
  description: string;
  /** The events that can fill it, the first in the catalogue taken; `null` counts every event. */
  events: string[] | null;
  breakdown?: string;
  display?: 'ActionsLineGraph' | 'ActionsBarValue' | 'ActionsPie' | 'ActionsBar';
  people?: boolean;
  interval?: 'day' | 'week' | 'month';
  from?: string;
}
interface FunnelSpec {
  kind: 'funnel';
  name: string;
  description: string;
  steps: StepSpec[];
  days: number;
  from?: string;
}
type InsightSpec = TrendSpec | FunnelSpec;
interface DashboardSpec {
  name: string;
  description: string;
  /** An event the catalogue must have for the dashboard to be made at all. */
  needs?: string;
  insights: InsightSpec[];
}

export interface Insight {
  name: string;
  description: string;
  query: Record<string, unknown>;
  /** The events and properties the query reads, for the test. */
  reads: { event: string; properties: string[] }[];
}
export interface Dashboard {
  name: string;
  description: string;
  insights: Insight[];
}

const FIRST_SESSION = ['session_finished', 'checked_in'];

/** The dashboards every app gets; what its catalogue lacks drops out. */
export const DASHBOARDS: DashboardSpec[] = [
  {
    name: 'Overview',
    description: 'Who joins, how, who comes back, on what, and who pays.',
    insights: [
      { kind: 'trend', name: 'Sign-ups a week', description: 'New accounts each week.', events: ['signed_up'], display: 'ActionsLineGraph', interval: 'week', from: '-90d' },
      { kind: 'trend', name: 'Sign-ups by method', description: 'Email, Google or Apple.', events: ['signed_up'], breakdown: 'method', display: 'ActionsPie' },
      { kind: 'trend', name: 'Sign-ups by role', description: 'Members, coaches and owners.', events: ['signed_up'], breakdown: 'role', display: 'ActionsPie' },
      { kind: 'trend', name: 'Active people a week', description: 'People who did anything in the app each week, signed in or not.', events: null, people: true, display: 'ActionsLineGraph', interval: 'week', from: '-90d' },
      { kind: 'trend', name: 'Platforms', description: 'People active in the last 30 days, by the platform they were on: web, iOS or Android.', events: null, people: true, breakdown: '$os', display: 'ActionsPie' },
      { kind: 'trend', name: 'Sign-ins by method', description: 'Which ways in people use.', events: ['signed_in'], breakdown: 'method', display: 'ActionsPie' },
      {
        kind: 'funnel',
        name: 'Checkout to Pro',
        description: 'Stripe Checkout opened, then Pro started, within a day.',
        steps: [
          { events: ['checkout_started'], label: 'Opened checkout' },
          { events: ['pro_started'], label: 'Pro started' },
        ],
        days: 1,
      },
      { kind: 'trend', name: 'Pro started a week', description: 'Subscriptions started each week.', events: ['pro_started'], display: 'ActionsLineGraph', interval: 'week', from: '-90d' },
    ],
  },
  {
    name: 'Onboarding',
    description: 'A new member’s first open (docs/ONBOARDING.md): how many get through it, into a program and a first session, and where they leave.',
    insights: [
      {
        kind: 'funnel',
        name: 'Onboarding to a first session',
        description: 'The first screen of onboarding, finishing it, a program built and a first session, within a week.',
        steps: [
          { events: ['onboarding_step_seen'], label: 'Opened onboarding', where: { position: 1 } },
          { events: ['onboarding_finished'], label: 'Finished onboarding' },
          { events: ['program_build_finished'], label: 'Program built' },
          { events: FIRST_SESSION, label: 'First session' },
        ],
        days: 7,
      },
      { kind: 'trend', name: 'Onboarding: how far people get', description: 'People who saw each step, by its place in the flow.', events: ['onboarding_step_seen'], breakdown: 'position', people: true, display: 'ActionsBarValue' },
      { kind: 'trend', name: 'Onboarding: ways out', description: 'How people leave onboarding: building, looking around, signing in, or where they’re here for.', events: ['onboarding_finished'], breakdown: 'how', display: 'ActionsPie' },
      { kind: 'trend', name: 'Onboarding: steps skipped', description: 'Which questions people won’t answer.', events: ['onboarding_skipped'], breakdown: 'step', display: 'ActionsBarValue' },
      { kind: 'trend', name: 'Onboarding: where people leave', description: 'The step people were on when they closed the app or went elsewhere.', events: ['onboarding_left'], breakdown: 'step', display: 'ActionsBarValue' },
    ],
  },
  {
    name: 'Programs',
    needs: 'program_build_started',
    description: 'Programs built for members (docs/PROGRAMS.md): asked for, built, opened and trained, and how the builder does.',
    insights: [
      {
        kind: 'funnel',
        name: 'Program funnel',
        description: 'A program asked for, built, opened, a session started and one finished, within two weeks.',
        steps: [
          { events: ['program_build_started'], label: 'Asked for a program' },
          { events: ['program_build_finished'], label: 'Program built' },
          { events: ['program_started'], label: 'Opened it' },
          { events: ['session_started'], label: 'Started a session' },
          { events: FIRST_SESSION, label: 'Finished a session' },
        ],
        days: 14,
      },
      { kind: 'trend', name: 'Programs asked for a week', description: 'Programs asked for each week.', events: ['program_build_started'], display: 'ActionsLineGraph', interval: 'week', from: '-90d' },
      { kind: 'trend', name: 'Programs: who wrote them', description: 'Built by the AI, or by the rules when its draft didn’t fit.', events: ['program_build_finished'], breakdown: 'fallback', display: 'ActionsPie' },
      { kind: 'trend', name: 'Programs: why builds failed', description: 'Builds that failed, by reason.', events: ['program_build_failed'], breakdown: 'reason', display: 'ActionsBarValue' },
      { kind: 'trend', name: 'Programs: goals asked for', description: 'What members build programs for.', events: ['program_build_started'], breakdown: 'goal', display: 'ActionsPie' },
      { kind: 'trend', name: 'Sessions finished a week', description: 'The habit the app is for.', events: FIRST_SESSION, display: 'ActionsLineGraph', interval: 'week', from: '-90d' },
    ],
  },
];

/** Each event's row in docs/ANALYTICS.md → the backticked words on it: its properties (and their values). */
export function documented(doc: string): Documented {
  const out: Documented = {};
  for (const line of doc.split('\n')) {
    const row = line.match(/^\|\s*`([a-z_]+)`\s*\|(.*)$/);
    if (!row) continue;
    out[row[1]] = new Set([...row[2].matchAll(/`([^`]+)`/g)].map((m) => m[1]));
  }
  return out;
}

const LAST_30_DAYS = '-30d';
/** PostHog's own properties, which every event carries: never in the doc. */
const posthogsOwn = (property: string) => property.startsWith('$');

/** A property filter: equal to the value, or one of the values. */
const filtersOf = (where: Where = {}) =>
  Object.entries(where).map(([key, value]) => ({ key, value: Array.isArray(value) ? value : [value], operator: 'exact', type: 'event' }));

/** The dashboards this app's catalogue and doc can fill. */
export function dashboardsFor(catalogue: Catalogue, doc: Documented): Dashboard[] {
  const pick = (events: string[]) => events.find((e) => e in catalogue) ?? null;
  const knows = (event: string, properties: string[]) => properties.every((p) => posthogsOwn(p) || doc[event]?.has(p));

  function trend(spec: TrendSpec): Insight | null {
    const event = spec.events ? pick(spec.events) : null;
    if (spec.events && !event) return null;
    const properties = spec.breakdown ? [spec.breakdown] : [];
    if (event && !knows(event, properties)) return null;
    const node = event ? { kind: 'EventsNode', event, name: event } : { kind: 'EventsNode', event: null, name: 'All events' };
    return {
      name: spec.name,
      description: spec.description,
      query: {
        kind: 'TrendsQuery',
        series: [{ ...node, ...(spec.people && { math: 'dau' }) }],
        ...(spec.breakdown && { breakdownFilter: { breakdown: spec.breakdown, breakdown_type: 'event' } }),
        trendsFilter: { display: spec.display ?? 'ActionsLineGraph' },
        interval: spec.interval ?? 'day',
        dateRange: { date_from: spec.from ?? LAST_30_DAYS },
        filterTestAccounts: true,
      },
      reads: event ? [{ event, properties }] : [],
    };
  }

  function funnel(spec: FunnelSpec): Insight | null {
    const steps = spec.steps
      .map((step) => ({ step, event: pick(step.events) }))
      .filter((s): s is { step: StepSpec; event: string } => !!s.event && knows(s.event, Object.keys(s.step.where ?? {})));
    if (steps.length < 2) return null;
    return {
      name: spec.name,
      description: spec.description,
      query: {
        kind: 'FunnelsQuery',
        series: steps.map(({ step, event }) => ({ kind: 'EventsNode', event, name: event, custom_name: step.label, properties: filtersOf(step.where) })),
        funnelsFilter: { funnelWindowInterval: spec.days, funnelWindowIntervalUnit: 'day', funnelOrderType: 'ordered' },
        dateRange: { date_from: spec.from ?? LAST_30_DAYS },
        filterTestAccounts: true,
      },
      reads: steps.map(({ step, event }) => ({ event, properties: Object.keys(step.where ?? {}) })),
    };
  }

  return DASHBOARDS.filter((d) => !d.needs || d.needs in catalogue)
    .map((d) => ({
      name: d.name,
      description: d.description,
      insights: d.insights.map((i) => (i.kind === 'trend' ? trend(i) : funnel(i))).filter((i): i is Insight => !!i),
    }))
    .filter((d) => d.insights.length > 0);
}

type Fetch = typeof globalThis.fetch;

/** Makes or updates each dashboard and its insights through PostHog's API, found by name (Naz's createPostHogSetup). */
export function createPostHogSetup({
  apiKey,
  projectId,
  host = 'https://us.posthog.com',
  fetchImpl = globalThis.fetch,
  dryRun = false,
  log = console.log,
}: { apiKey: string; projectId: string; host?: string; fetchImpl?: Fetch; dryRun?: boolean; log?: (line: string) => void }) {
  const base = host.replace(/\/$/, '');
  const project = `${base}/api/projects/${encodeURIComponent(projectId)}`;
  const headers = { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' };

  async function call(method: string, url: string, body?: unknown) {
    const res = await fetchImpl(url, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    const json = (await res.json().catch(() => ({}))) as Record<string, any>;
    if (!res.ok) throw new Error(`${method} ${url.replace(base, '')}: ${res.status} ${json.detail ?? ''}`.trim());
    return json;
  }

  async function upsert(path: string, what: string, body: { name: string } & Record<string, unknown>) {
    const page = await call('GET', `${project}${path}?search=${encodeURIComponent(body.name)}&limit=100`);
    const found = ((page.results ?? []) as { id: number; name: string; deleted?: boolean }[]).find((r) => r.name === body.name && !r.deleted) ?? null;
    log(`${dryRun ? 'would ' : ''}${found ? 'update' : 'make'} ${what} "${body.name}"`);
    if (dryRun) return found ?? { id: `dry:${body.name}` };
    return found ? call('PATCH', `${project}${path}${found.id}/`, body) : call('POST', `${project}${path}`, body);
  }

  async function run(dashboards: Dashboard[]) {
    const made: { name: string; url: string }[] = [];
    for (const dashboard of dashboards) {
      const d = await upsert('/dashboards/', 'dashboard', { name: dashboard.name, description: dashboard.description });
      for (const insight of dashboard.insights)
        await upsert('/insights/', 'insight', { name: insight.name, description: insight.description, query: { kind: 'InsightVizNode', source: insight.query }, dashboards: [d.id], saved: true });
      const url = `${base}/project/${projectId}/dashboard/${d.id}`;
      log(`${dashboard.name}: ${url}`);
      made.push({ name: dashboard.name, url });
    }
    return made;
  }

  return { run };
}
