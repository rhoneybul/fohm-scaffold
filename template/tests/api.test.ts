/**
 * Backend rules against the local Supabase stack: who may read and write
 * what. Skipped without SUPABASE_DB_URL. Each test signs real people up
 * through local Supabase Auth, as the app does.
 *   npx supabase start …  (see AGENTS.md), then npm test
 */
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

const DB_URL = process.env.SUPABASE_DB_URL;
const AUTH_URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
const skip = !DB_URL || !AUTH_URL || !KEY ? 'needs the local Supabase stack (SUPABASE_DB_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)' : false;

let accounts: typeof import('../api/accounts');
let ai: typeof import('../api/ai');
let webhook: typeof import('../api/stripe-webhook');
let stripe: typeof import('../api/_lib/stripe');
let data: typeof import('../api/data');
let sql: typeof import('../api/_lib/db').sql;

before(async () => {
  if (skip) return;
  accounts = await import('../api/accounts');
  ai = await import('../api/ai');
  webhook = await import('../api/stripe-webhook');
  stripe = await import('../api/_lib/stripe');
  data = await import('../api/data');
  ({ sql } = await import('../api/_lib/db'));
});
after(async () => {
  if (!skip) await sql().end();
});

async function login(): Promise<string> {
  const email = `t${Date.now()}${Math.random().toString(36).slice(2, 6)}@example.com`;
  const res = await fetch(`${AUTH_URL}/auth/v1/signup`, { method: 'POST', headers: { apikey: KEY!, 'content-type': 'application/json' }, body: JSON.stringify({ email, password: 'password-123' }) });
  const body = (await res.json()) as { access_token?: string };
  assert.ok(body.access_token, 'local Auth should sign up without email confirmation');
  return body.access_token!;
}
const call = (fn: (r: Request) => Promise<Response>, token: string, method = 'GET', body?: unknown, query = '') =>
  fn(new Request(`http://local/api${query}`, { method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }));

async function person(role: 'member' | 'owner') {
  const token = await login();
  const res = await call(accounts.POST, token, 'POST', { name: role, role, ownerCode: role === 'owner' ? 'change-me' : undefined });
  assert.equal(res.status, 201);
  const { user } = (await res.json()) as { user: { id: string } };
  return { token, id: user.id };
}
const entry = (memberId: string, extra = {}) => ({ id: `ent_${Math.random().toString(36).slice(2)}`, memberId, title: 'Hi', ...extra });

test('a member writes their own entries, and only theirs', { skip }, async () => {
  const a = await person('member');
  const b = await person('member');
  assert.equal((await call(data.POST, a.token, 'POST', { collection: 'entries', records: [entry(a.id)] })).status, 200);
  assert.equal((await call(data.POST, a.token, 'POST', { collection: 'entries', records: [entry(b.id)] })).status, 403);
  const seen = (await (await call(data.GET, b.token)).json()) as { entries: unknown[] };
  assert.equal(seen.entries.length, 0, 'b never sees a’s entries');
});

test('a member cannot write the owner’s reply', { skip }, async () => {
  const a = await person('member');
  const e = entry(a.id, { reply: 'I replied to myself' });
  await call(data.POST, a.token, 'POST', { collection: 'entries', records: [e] });
  const [row] = await sql()`select reply from entries where id = ${e.id}`;
  assert.equal(row.reply, null);
});

test('the owner sees everything and replies; private notes never reach the member', { skip }, async () => {
  const a = await person('member');
  const o = await person('owner');
  const e = entry(a.id);
  await call(data.POST, a.token, 'POST', { collection: 'entries', records: [e] });
  const all = (await (await call(data.GET, o.token)).json()) as { entries: any[]; users: any[] };
  const mine = all.entries.find((x) => x.id === e.id);
  assert.ok(mine, 'the owner sees the member’s entry');
  assert.equal((await call(data.POST, o.token, 'POST', { collection: 'entries', records: [{ ...mine, title: 'changed', reply: 'Well done' }] })).status, 200);
  const [row] = await sql()`select title, reply from entries where id = ${e.id}`;
  assert.deepEqual({ ...row }, { title: 'Hi', reply: 'Well done' }, 'the owner writes the reply but never the member’s words');

  const me = all.users.find((u) => u.id === a.id);
  await call(data.POST, o.token, 'POST', { collection: 'users', records: [{ ...me, ownerNotes: 'private' }] });
  const theirs = (await (await call(data.GET, a.token)).json()) as { users: any[] };
  assert.equal(theirs.users[0].ownerNotes, undefined);
});

test('an owner account needs the owner code', { skip }, async () => {
  const token = await login();
  assert.equal((await call(accounts.POST, token, 'POST', { name: 'x', role: 'owner', ownerCode: 'wrong' })).status, 403);
});

test('a member adds scores but can never change one', { skip }, async () => {
  const a = await person('member');
  const s = { id: `scr_${Math.random().toString(36).slice(2)}`, memberId: a.id, game: 'catch-the-dot', points: 10, seconds: 30 };
  assert.equal((await call(data.POST, a.token, 'POST', { collection: 'scores', records: [s] })).status, 200);
  assert.equal((await call(data.POST, a.token, 'POST', { collection: 'scores', records: [{ ...s, points: 9999 }] })).status, 409);
  assert.equal((await call(data.POST, a.token, 'POST', { collection: 'scores', records: [{ ...s, id: 'scr_bad', points: -1 }] })).status, 400);
  const [row] = await sql()`select points from scores where id = ${s.id}`;
  assert.equal(row.points, 10);
});

test('a member can never give themselves Pro; the owner can', { skip }, async () => {
  const a = await person('member');
  const me = ((await (await call(data.GET, a.token)).json()) as any).users[0];
  await call(data.POST, a.token, 'POST', { collection: 'users', records: [{ ...me, plan: 'pro', planSource: 'owner' }] });
  assert.equal((await sql()`select plan from accounts where id = ${a.id}`)[0].plan, 'free');
  assert.equal((await call(accounts.POST, a.token, 'POST', { action: 'plan', memberId: a.id, plan: 'pro' })).status, 403);
  const o = await person('owner');
  assert.equal((await call(accounts.POST, o.token, 'POST', { action: 'plan', memberId: a.id, plan: 'pro' })).status, 200);
  assert.equal((await sql()`select plan, plan_source from accounts where id = ${a.id}`)[0].plan_source, 'owner');
});

test('the AI assistant needs Pro, then the key', { skip }, async () => {
  const a = await person('member');
  assert.equal((await call(ai.POST, a.token, 'POST', { question: 'Hi?' })).status, 402);
  await sql()`update accounts set plan = 'pro' where id = ${a.id}`;
  const key = process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  try {
    assert.equal((await call(ai.POST, a.token, 'POST', { question: 'Hi?' })).status, 503);
  } finally {
    if (key) process.env.ANTHROPIC_API_KEY = key;
  }
  // Members never write questions and answers themselves.
  assert.equal((await call(data.POST, a.token, 'POST', { collection: 'ai', records: [{ id: 'ai_fake', memberId: a.id, question: 'q', answer: 'made up' }] })).status, 403);
});

test('a paid checkout switches Pro on; the subscription ending switches it off', { skip }, async () => {
  const a = await person('member');
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  process.env.STRIPE_WEBHOOK_TRUST_PAYLOAD = '1';
  const send = (type: string, object: unknown) => {
    const body = JSON.stringify({ type, data: { object } });
    return webhook.POST(new Request('http://local/api/stripe-webhook', { method: 'POST', headers: { 'stripe-signature': stripe.signForTest(body, 'whsec_test') }, body }));
  };
  assert.equal((await send('checkout.session.completed', { subscription: 'sub_1', customer: 'cus_1', payment_status: 'paid', metadata: { account_id: a.id } })).status, 200);
  assert.deepEqual({ ...(await sql()`select plan, plan_source, stripe_subscription_id from accounts where id = ${a.id}`)[0] }, { plan: 'pro', plan_source: 'stripe', stripe_subscription_id: 'sub_1' });
  // A second paid subscription isn't taken on: it goes to the owner.
  await send('checkout.session.completed', { subscription: 'sub_2', customer: 'cus_1', payment_status: 'paid', metadata: { account_id: a.id } });
  assert.equal((await sql()`select stripe_extra_subscription from accounts where id = ${a.id}`)[0].stripe_extra_subscription, 'sub_2');
  await send('customer.subscription.deleted', { id: 'sub_1', status: 'canceled', customer: 'cus_1', metadata: { account_id: a.id } });
  assert.equal((await sql()`select plan from accounts where id = ${a.id}`)[0].plan, 'free');
  // A forged event is refused.
  const forged = JSON.stringify({ type: 'checkout.session.completed', data: { object: {} } });
  assert.equal((await webhook.POST(new Request('http://local/', { method: 'POST', headers: { 'stripe-signature': 't=1,v1=00' }, body: forged }))).status, 400);
});

test('a phone registers for push; a device moves to whoever signs in on it', { skip }, async () => {
  const a = await person('member');
  const b = await person('member');
  const device = (memberId: string) => ({ id: `dev_${memberId}`, memberId, token: 'ExponentPushToken[shared-phone]', platform: 'ios' });
  assert.equal((await call(data.POST, a.token, 'POST', { collection: 'devices', records: [device(a.id)] })).status, 200);
  assert.equal((await call(data.POST, b.token, 'POST', { collection: 'devices', records: [device(b.id)] })).status, 200);
  const rows = await sql()`select member_id from push_tokens where token = 'ExponentPushToken[shared-phone]'`;
  assert.deepEqual(rows.map((r) => r.member_id), [b.id]);
});

test('progression: a member saves their assessment, check-ins and skills; the coach’s note on a skill is the coach’s', { skip }, async () => {
  const a = await person('member');
  const me = ((await (await call(data.GET, a.token)).json()) as any).users[0];
  assert.equal((await call(data.POST, a.token, 'POST', { collection: 'users', records: [{ ...me, level: 'building', assessment: { experience: 'x' }, goal: 'Go further', assessedAt: new Date().toISOString() }] })).status, 200);
  assert.deepEqual({ ...(await sql()`select level, goal from accounts where id = ${a.id}`)[0] }, { level: 'building', goal: 'Go further' });

  const checkin = { id: `chk_${a.id}`, memberId: a.id, date: '2026-01-10', feel: 1, minutes: 20 };
  assert.equal((await call(data.POST, a.token, 'POST', { collection: 'checkins', records: [checkin] })).status, 200);
  assert.equal((await call(data.POST, a.token, 'POST', { collection: 'checkins', records: [{ ...checkin, feel: 9 }] })).status, 400, 'feel is 1 to 3');

  const p = { id: `prg_${a.id}_start-basics`, memberId: a.id, skillId: 'start-basics', doneAt: new Date().toISOString(), ownerNote: 'self-praise' };
  await call(data.POST, a.token, 'POST', { collection: 'progress', records: [p] });
  assert.equal((await sql()`select owner_note from progress where id = ${p.id}`)[0].owner_note, null, 'a member can’t write the coach’s note');
  const o = await person('owner');
  await call(data.POST, o.token, 'POST', { collection: 'progress', records: [{ ...p, skillId: 'changed', ownerNote: 'Nice work' }] });
  assert.deepEqual({ ...(await sql()`select skill_id, owner_note from progress where id = ${p.id}`)[0] }, { skill_id: 'start-basics', owner_note: 'Nice work' });
  // The member saving the skill again keeps the coach's note.
  await call(data.POST, a.token, 'POST', { collection: 'progress', records: [{ ...p, ownerNote: undefined }] });
  assert.equal((await sql()`select owner_note from progress where id = ${p.id}`)[0].owner_note, 'Nice work');
});
