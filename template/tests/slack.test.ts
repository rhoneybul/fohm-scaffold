/** The team's Slack pings (docs/SLACK.md): every line, escaping, and the sender's rules, with fetch mocked. Plain Node: npm test. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { APP_NAME } from '../api/_lib/app';
import { DOWNLOADS_AN_HOUR, createDownloadGate, downloadPing, escapeForSlack, paymentPing, programBuiltPing, programStartedPing, signUpPing, subscriptionChange } from '../api/_lib/pings';
import { createSlack, slackConfigured } from '../api/_lib/slack';

const HOOK = 'https://hooks.slack.com/services/T/B/x';
const app = `*${APP_NAME}* · `;

test('every line starts with the app’s name, so one channel holds every app', () => {
  const lines = [
    signUpPing({ id: 'usr_1', email: 'kai@example.com', method: 'google' }),
    downloadPing({ platform: 'ios', version: '1.2.0', build: '34' }, 'a'),
    programStartedPing({ memberId: 'usr_1', email: 'kai@example.com', programId: 'pgm_1', program: 'Haute Route', detail: '8 weeks, 3 a week' }),
    programBuiltPing({ memberId: 'usr_1', email: 'kai@example.com', programId: 'pgm_1', seconds: 41.2, ok: true, title: 'Haute Route', weeks: 8, sessions: 24, model: 'claude-haiku-5-5' }),
    paymentPing({ kind: 'started', accountId: 'usr_1', email: 'kai@example.com', subscriptionId: 'sub_1' }),
  ];
  for (const ping of lines) assert.ok(ping!.text.startsWith(app), ping!.text);
});

test('each line reads as the team expects', () => {
  assert.equal(signUpPing({ id: 'usr_1', email: 'kai@example.com', method: 'google' }).text, `${app}New sign-up — kai@example.com (Google)`);
  assert.equal(signUpPing({ id: 'usr_1', email: 'c@example.com', method: 'email', role: 'coach' }).text, `${app}New sign-up — c@example.com (email, as coach)`);
  assert.equal(signUpPing({ id: 'usr_abcdefghijklmnop', method: 'saml' }).text, `${app}New sign-up — member usr_abcdefgh (another way)`);
  assert.equal(downloadPing({ platform: 'android', version: '1.2.0', build: '34' }, 'a')!.text, `${app}New download — Android app (1.2.0, build 34)`);
  assert.equal(downloadPing({ platform: 'ios' }, 'a')!.text, `${app}New download — iPhone app`);
  assert.equal(downloadPing({ platform: 'web' }, 'a'), null, 'the web app has no download');
  assert.equal(downloadPing(null, 'a'), null);
  assert.equal(
    programBuiltPing({ memberId: 'u', email: 'kai@example.com', programId: 'p', seconds: 41.2, ok: true, title: 'Haute Route', weeks: 8, sessions: 24, model: 'claude-haiku-5-5' }).text,
    `${app}Program ready — kai@example.com — Haute Route — 24 sessions / 8 wks — 41s · \`haiku-5-5\``,
  );
  assert.equal(
    programBuiltPing({ memberId: 'u', email: 'kai@example.com', programId: 'p', seconds: 52, ok: false, reason: 'the draft had `6` weeks' }).text,
    `${app}Program FAILED — kai@example.com — \`the draft had '6' weeks\` — after 52s`,
  );
  const until = new Date('2027-01-31T10:00:00Z');
  assert.equal(paymentPing({ kind: 'renewed', accountId: 'u', email: 'kai@example.com', subscriptionId: 's', until }).text, `${app}Pro renewed — kai@example.com — until 2027-01-31`);
  assert.equal(paymentPing({ kind: 'cancelled', accountId: 'u', email: 'kai@example.com', subscriptionId: 's', until }).text, `${app}Pro cancelled — kai@example.com — ends 2027-01-31`);
  assert.equal(paymentPing({ kind: 'ended', accountId: 'u', email: null, subscriptionId: 's' }).text, `${app}Pro ended — member u`);
  assert.equal(paymentPing({ kind: 'started', accountId: 'u', subscriptionId: 's' }).channel, 'payments');
});

test('nothing sent can mention @channel, dress up a link or add a line', () => {
  assert.equal(escapeForSlack('<!channel> <https://evil|bank> & co'), '&lt;!channel&gt; &lt;https://evil|bank&gt; &amp; co');
  assert.equal(escapeForSlack('one\ntwo\r\nthree'), 'one two three');
  assert.equal(escapeForSlack('x'.repeat(500)).length, 200);
  const text = programStartedPing({ memberId: 'u', email: '<!here>@x.com', programId: 'p', program: '<https://x|Click>' }).text;
  assert.ok(!/[<>]/.test(text.replace(/&lt;|&gt;/g, '')), text);
  const release = downloadPing({ platform: 'ios', version: '<!channel>', build: '1\n2' }, 'a')!.text;
  assert.equal(release, `${app}New download — iPhone app`, 'a version or build that isn’t one is left out');
});

test('downloads: one an hour from an address, and a cap an hour in all', () => {
  let t = 0;
  const allowed = createDownloadGate({ now: () => t });
  assert.equal(allowed('1.1.1.1'), true);
  assert.equal(allowed('1.1.1.1'), false);
  t += 60 * 60 * 1000;
  assert.equal(allowed('1.1.1.1'), true);
  let taken = 1;
  for (let i = 0; i < DOWNLOADS_AN_HOUR + 10; i++) if (allowed(`2.0.0.${i}`)) taken++;
  assert.equal(taken, DOWNLOADS_AN_HOUR);
});

test('Stripe: renewed when the period moves on, cancelled once when set to end, else nothing', () => {
  const was = new Date('2026-12-01T00:00:00Z');
  const next = new Date('2027-01-01T00:00:00Z');
  assert.equal(subscriptionChange({ wasPro: true, wasUntil: was, until: next, sub: {} }), 'renewed');
  assert.equal(subscriptionChange({ wasPro: true, wasUntil: was, until: was, sub: {} }), null, 'a card changed');
  assert.equal(subscriptionChange({ wasPro: false, wasUntil: null, until: next, sub: {} }), null, 'the start is pinged as started');
  assert.equal(subscriptionChange({ wasPro: true, wasUntil: was, until: was, sub: { cancel_at_period_end: true }, previous: { cancel_at_period_end: false } }), 'cancelled');
  assert.equal(subscriptionChange({ wasPro: true, wasUntil: was, until: was, sub: { cancel_at: 1798761600 }, previous: { cancel_at: null } }), 'cancelled');
  assert.equal(subscriptionChange({ wasPro: true, wasUntil: was, until: was, sub: { cancel_at_period_end: true }, previous: { metadata: {} } }), null, 'already cancelled: said once');
  assert.equal(subscriptionChange({ wasPro: true, wasUntil: was, until: was, sub: { cancel_at_period_end: false }, previous: { cancel_at_period_end: true } }), null, 'taken back');
});

/** A mocked fetch: answers with each status in turn (a string throws, as a dropped connection). */
function mockFetch(...answers: (number | string)[]) {
  const calls: { url: string; body: string }[] = [];
  const fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, body: String(init.body) });
    const answer = answers.shift() ?? 200;
    if (typeof answer === 'string') throw new Error(answer);
    return new Response('ok', { status: answer });
  }) as unknown as typeof globalThis.fetch;
  return { fetch, calls };
}
const quiet = () => {};
const noWait = async () => {};
const signUp = signUpPing({ id: 'usr_1', email: 'kai@example.com', method: 'email' });

test('off without a webhook: nothing sent, said once in the logs, and /api/health says false', async () => {
  const { fetch, calls } = mockFetch();
  const logged: unknown[] = [];
  const slack = createSlack({ env: {}, fetch, log: (...a) => logged.push(a) });
  assert.deepEqual(await slack.notify(signUp), { sent: false, reason: 'no_webhook' });
  await slack.notify(signUpPing({ id: 'usr_2', email: 'b@example.com', method: 'email' }));
  assert.equal(calls.length, 0);
  assert.equal(logged.length, 1);
  assert.equal(slackConfigured({}), false);
  assert.equal(slackConfigured({ SLACK_WEBHOOK_URL: HOOK }), true);
  assert.equal(slackConfigured({ SLACK_PAYMENTS_WEBHOOK_URL: HOOK }), true);
});

test('posts the line as JSON to the shared webhook, or a channel’s own', async () => {
  const { fetch, calls } = mockFetch();
  const slack = createSlack({ env: { SLACK_WEBHOOK_URL: HOOK, SLACK_PAYMENTS_WEBHOOK_URL: `${HOOK}/pay` }, fetch, log: quiet });
  assert.deepEqual(await slack.notify(signUp), { sent: true });
  await slack.notify(paymentPing({ kind: 'started', accountId: 'u', subscriptionId: 's' }));
  assert.equal(calls[0].url, HOOK);
  assert.deepEqual(JSON.parse(calls[0].body), { text: signUp.text });
  assert.equal(calls[1].url, `${HOOK}/pay`);
});

test('the same ping within five minutes is sent once', async () => {
  let t = 0;
  const { fetch, calls } = mockFetch();
  const slack = createSlack({ env: { SLACK_WEBHOOK_URL: HOOK }, fetch, now: () => t, log: quiet });
  await slack.notify(signUp);
  assert.deepEqual(await slack.notify(signUp), { sent: false, reason: 'duplicate' });
  t += 5 * 60 * 1000;
  await slack.notify(signUp);
  assert.equal(calls.length, 2);
});

test('one retry on a 5xx or a dropped connection, none on a 4xx', async () => {
  for (const [first, retried] of [[503, true], ['socket hang up', true], [404, false]] as const) {
    const { fetch, calls } = mockFetch(first, 200);
    const slack = createSlack({ env: { SLACK_WEBHOOK_URL: HOOK }, fetch, wait: noWait, log: quiet });
    const result = await slack.notify(signUp);
    assert.equal(calls.length, retried ? 2 : 1, String(first));
    assert.equal(result.sent, retried);
  }
  const { fetch, calls } = mockFetch(500, 500, 500);
  const slack = createSlack({ env: { SLACK_WEBHOOK_URL: HOOK }, fetch, wait: noWait, log: quiet });
  assert.deepEqual(await slack.notify(signUp), { sent: false, reason: '500' });
  assert.equal(calls.length, 2, 'only one retry');
});

test('never throws', async () => {
  const fetch = (() => {
    throw new Error('boom');
  }) as unknown as typeof globalThis.fetch;
  const slack = createSlack({ env: { SLACK_WEBHOOK_URL: HOOK }, fetch, wait: noWait, log: quiet });
  assert.equal((await slack.notify(signUp)).sent, false);
  assert.equal((await slack.notify(null)).sent, false);
  const exploding = createSlack({ env: { SLACK_WEBHOOK_URL: HOOK }, fetch, wait: noWait, now: () => { throw new Error('clock'); }, log: quiet });
  assert.equal((await exploding.notify(signUp)).sent, false);
});
