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

async function person(role: 'member' | 'coach' | 'owner') {
  const token = await login();
  const code = role === 'owner' ? 'change-me' : role === 'coach' ? 'coach-me' : undefined;
  const res = await call(accounts.POST, token, 'POST', { name: role, role, ownerCode: code });
  assert.equal(res.status, 201);
  const { user } = (await res.json()) as { user: { id: string } };
  // The Supabase Auth user id: the person's own folder in media storage.
  const authId = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub as string;
  return { token, id: user.id, authId };
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

// ---------------------------------------------------------------------------
// Coaches
// ---------------------------------------------------------------------------
const assign = (ownerToken: string, memberId: string, coachId: string | null) => call(accounts.POST, ownerToken, 'POST', { action: 'assign', memberId, coachId });

test('coaches: a coach sees only their own members, and a member sees only their coach’s name', { skip }, async () => {
  const o = await person('owner');
  const c1 = await person('coach');
  const c2 = await person('coach');
  const mine = await person('member');
  const theirs = await person('member');
  assert.equal((await assign(o.token, mine.id, c1.id)).status, 200);
  assert.equal((await assign(o.token, theirs.id, c2.id)).status, 200);
  for (const m of [mine, theirs]) await call(data.POST, m.token, 'POST', { collection: 'entries', records: [{ id: `ent_${m.id}`, memberId: m.id, title: 'Hello' }] });

  const seen = (await (await call(data.GET, c1.token)).json()) as { users: any[]; entries: any[] };
  const ids = seen.users.map((u) => u.id);
  assert.ok(ids.includes(mine.id) && !ids.includes(theirs.id), 'only their own members');
  assert.deepEqual(seen.entries.map((e) => e.memberId), [mine.id]);

  const memberView = (await (await call(data.GET, mine.token)).json()) as { users: any[] };
  const coach = memberView.users.find((u) => u.id === c1.id);
  assert.deepEqual(Object.keys(coach).sort(), ['createdAt', 'id', 'name', 'role'], 'a member sees their coach’s name, not their email');
});

test('coaches: reply to their own members only, never change what members wrote, add rows, delete, give Pro or assign', { skip }, async () => {
  const o = await person('owner');
  const c1 = await person('coach');
  const mine = await person('member');
  const other = await person('member');
  await assign(o.token, mine.id, c1.id);
  const entry = (m: { id: string }) => ({ id: `ent_${m.id}`, memberId: m.id, title: 'Original' });
  for (const m of [mine, other]) await call(data.POST, m.token, 'POST', { collection: 'entries', records: [entry(m)] });

  assert.equal((await call(data.POST, c1.token, 'POST', { collection: 'entries', records: [{ ...entry(mine), title: 'Changed', reply: 'Nice' }] })).status, 200);
  assert.deepEqual({ ...(await sql()`select title, reply from entries where id = ${entry(mine).id}`)[0] }, { title: 'Original', reply: 'Nice' });
  assert.equal((await call(data.POST, c1.token, 'POST', { collection: 'entries', records: [{ ...entry(other), reply: 'Not mine' }] })).status, 403);
  assert.equal((await sql()`select reply from entries where id = ${entry(other).id}`)[0].reply, null);
  assert.equal((await call(data.POST, c1.token, 'POST', { collection: 'checkins', records: [{ id: 'chk_coach', memberId: mine.id, date: '2026-01-01' }] })).status, 403);
  assert.equal((await call(data.DELETE, c1.token, 'DELETE', undefined, `?collection=entries&id=${entry(mine).id}`)).status, 403);
  assert.equal((await call(accounts.POST, c1.token, 'POST', { action: 'plan', memberId: mine.id, plan: 'pro' })).status, 403);
  assert.equal((await assign(c1.token, other.id, c1.id)).status, 403);
  // Notes on their own member: yes.
  const me = ((await (await call(data.GET, c1.token)).json()) as any).users.find((u: any) => u.id === mine.id);
  assert.equal((await call(data.POST, c1.token, 'POST', { collection: 'users', records: [{ ...me, ownerNotes: 'Keen' }] })).status, 200);
  assert.equal((await sql()`select owner_notes from accounts where id = ${mine.id}`)[0].owner_notes, 'Keen');
});

test('coaches: the code is needed, and a member can never pick their own coach', { skip }, async () => {
  const token = await login();
  assert.equal((await call(accounts.POST, token, 'POST', { name: 'x', role: 'coach', ownerCode: 'wrong' })).status, 403);
  const c = await person('coach');
  const m = await person('member');
  const me = ((await (await call(data.GET, m.token)).json()) as any).users[0];
  await call(data.POST, m.token, 'POST', { collection: 'users', records: [{ ...me, coachId: c.id }] });
  assert.equal((await sql()`select coach_id from accounts where id = ${m.id}`)[0].coach_id, null);
});

// ---------------------------------------------------------------------------
// Media: uploads go to the uploader's own folder; who may play one is the database's call
// ---------------------------------------------------------------------------
const storageAs = async (token: string) => {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(AUTH_URL!, KEY!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } }).storage.from('member-media');
};
const clip = () => new Blob([new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112])], { type: 'video/mp4' });

test('media: upload to your own folder only; attach only your own uploads', { skip }, async () => {
  const a = await person('member');
  const b = await person('member');
  const store = await storageAs(a.token);
  assert.equal((await store.upload(`${a.authId}/clip.mp4`, clip(), { contentType: 'video/mp4' })).error, null);
  assert.ok((await store.upload(`${b.authId}/sneaky.mp4`, clip(), { contentType: 'video/mp4' })).error, 'not into someone else’s folder');
  const entry = { id: `ent_media_${a.id}`, memberId: a.id, title: 'My pop-up', mediaType: 'video' };
  assert.equal((await call(data.POST, a.token, 'POST', { collection: 'entries', records: [{ ...entry, mediaPath: `${b.authId}/x.mp4` }] })).status, 403);
  assert.equal((await call(data.POST, a.token, 'POST', { collection: 'entries', records: [{ ...entry, mediaPath: `${a.authId}/clip.mp4` }] })).status, 200);
});

test('media: the member’s coach and the owner can play it; another member or coach can’t', { skip }, async () => {
  const o = await person('owner');
  const coach = await person('coach');
  const otherCoach = await person('coach');
  const m = await person('member');
  const stranger = await person('member');
  await assign(o.token, m.id, coach.id);
  const path = `${m.authId}/swing.mp4`;
  await (await storageAs(m.token)).upload(path, clip(), { contentType: 'video/mp4' });
  await call(data.POST, m.token, 'POST', { collection: 'entries', records: [{ id: `ent_play_${m.id}`, memberId: m.id, title: 'Swing', mediaPath: path, mediaType: 'video' }] });
  const canPlay = async (token: string) => !!(await (await storageAs(token)).createSignedUrl(path, 60)).data?.signedUrl;
  assert.equal(await canPlay(m.token), true, 'the member');
  assert.equal(await canPlay(coach.token), true, 'their coach');
  assert.equal(await canPlay(o.token), true, 'the owner');
  assert.equal(await canPlay(otherCoach.token), false, 'another coach');
  assert.equal(await canPlay(stranger.token), false, 'another member');

  // The coach's video reply: the member can play it.
  const reply = `${coach.authId}/answer.mp4`;
  await (await storageAs(coach.token)).upload(reply, clip(), { contentType: 'video/mp4' });
  const row = ((await (await call(data.GET, coach.token)).json()) as any).entries.find((e: any) => e.id === `ent_play_${m.id}`);
  assert.equal((await call(data.POST, coach.token, 'POST', { collection: 'entries', records: [{ ...row, replyMediaPath: `${m.authId}/swing.mp4` }] })).status, 403, 'a reply is the coach’s own upload');
  assert.equal((await call(data.POST, coach.token, 'POST', { collection: 'entries', records: [{ ...row, replyMediaPath: reply, replyMediaType: 'video' }] })).status, 200);
  assert.equal(!!(await (await storageAs(m.token)).createSignedUrl(reply, 60)).data?.signedUrl, true, 'the member plays the reply');
});

test('profile photo: a member sets their own from their own folder; their coach and the owner see it; nobody else', { skip }, async () => {
  const o = await person('owner');
  const coach = await person('coach');
  const otherCoach = await person('coach');
  const m = await person('member');
  const stranger = await person('member');
  await assign(o.token, m.id, coach.id);
  const path = `${m.authId}/me.jpg`;
  const jpeg = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], { type: 'image/jpeg' });
  assert.equal((await (await storageAs(m.token)).upload(path, jpeg, { contentType: 'image/jpeg' })).error, null);
  const mine = ((await (await call(data.GET, m.token)).json()) as any).users.find((u: any) => u.id === m.id);
  assert.equal((await call(data.POST, m.token, 'POST', { collection: 'users', records: [{ ...mine, photoPath: `${stranger.authId}/x.jpg` }] })).status, 403, 'only from their own folder');
  assert.equal((await call(data.POST, m.token, 'POST', { collection: 'users', records: [{ ...mine, photoPath: path }] })).status, 200);
  const seen = async (who: { token: string }) => ((await (await call(data.GET, who.token)).json()) as any).users.find((u: any) => u.id === m.id)?.photoPath;
  assert.equal(await seen(m), path);
  assert.equal(await seen(o), path, 'on the owner’s People');
  assert.equal(await seen(coach), path, 'on their coach’s');
  const canPlay = async (token: string) => !!(await (await storageAs(token)).createSignedUrl(path, 60)).data?.signedUrl;
  assert.equal(await canPlay(coach.token), true, 'their coach plays it');
  assert.equal(await canPlay(o.token), true, 'the owner plays it');
  assert.equal(await canPlay(otherCoach.token), false, 'another coach');
  assert.equal(await canPlay(stranger.token), false, 'another member');
  // The owner's save of the account never overwrites the photo the member set.
  const asOwner = ((await (await call(data.GET, o.token)).json()) as any).users.find((u: any) => u.id === m.id);
  await call(data.POST, o.token, 'POST', { collection: 'users', records: [{ ...asOwner, photoPath: null, ownerNotes: 'Keen' }] });
  assert.equal(await seen(m), path);
  // Removed: null.
  assert.equal((await call(data.POST, m.token, 'POST', { collection: 'users', records: [{ ...mine, photoPath: null }] })).status, 200);
  assert.equal(await seen(m), undefined, 'removed');
});

test('saves: a member saves and changes their own; never someone else’s; the owner and their coach see them', { skip }, async () => {
  const o = await person('owner');
  const coach = await person('coach');
  const m = await person('member');
  const other = await person('member');
  await assign(o.token, m.id, coach.id);
  const now = new Date().toISOString();
  const save = { id: `sav_${m.id}_goal_alps`, memberId: m.id, kind: 'goal', itemId: 'alps', createdAt: now, updatedAt: now };
  assert.equal((await call(data.POST, m.token, 'POST', { collection: 'saved', records: [save] })).status, 200);
  assert.equal((await call(data.POST, m.token, 'POST', { collection: 'saved', records: [{ ...save, status: 'going' }] })).status, 200);
  assert.equal((await call(data.POST, other.token, 'POST', { collection: 'saved', records: [{ ...save, memberId: other.id }] })).status, 403, 'not into someone else’s row');
  assert.equal((await call(data.POST, m.token, 'POST', { collection: 'saved', records: [{ ...save, id: 'sav_bad', kind: 'Not a kind!' }] })).status, 400, 'the database refuses a kind that isn’t a word');
  const seen = async (who: { token: string }) => ((await (await call(data.GET, who.token)).json()) as any).saved.filter((x: any) => x.memberId === m.id);
  assert.equal((await seen(o))[0]?.status, 'going', 'the owner sees it');
  assert.equal((await seen(coach)).length, 1, 'their coach sees it');
  assert.equal((await seen(other)).length, 0, 'another member doesn’t');
  assert.equal((await call(data.DELETE, m.token, 'DELETE', undefined, `?collection=saved&id=${save.id}`)).status, 200);
  assert.equal((await seen(o)).length, 0);
});

test('invites: a friend’s code is claimed once, never one’s own; a channel is kept once; neither can be saved as a record', { skip }, async () => {
  const inviter = await person('member');
  const friend = await person('member');
  const db = sql();
  // Tapp is off in tests: the code is kept, the link is null, and nothing fails.
  const off = await call(accounts.POST, inviter.token, 'POST', { action: 'invite' });
  assert.equal(off.status, 200);
  assert.deepEqual(await off.json(), { link: null, joined: 0 });
  const [{ invite_code: code }] = await db`select invite_code from accounts where id = ${inviter.id}`;
  assert.match(code, /^[0-9a-f]{12}$/);

  const claim = async (who: { token: string }, body: object) => ((await (await call(accounts.POST, who.token, 'POST', { action: 'claim', ...body })).json()) as { outcome: string }).outcome;
  assert.equal(await claim(inviter, { code }), 'own_code');
  assert.equal(await claim(friend, { code: 'ffffffffffff' }), 'unknown');
  assert.equal(await claim(friend, { code }), 'claimed');
  assert.equal(await claim(friend, { code }), 'already_invited');
  assert.equal(await claim(friend, { channel: 'newsletter' }), 'channel_recorded');
  assert.equal(await claim(friend, { channel: 'instagram' }), 'already_recorded');
  const [row] = await db`select invited_by, came_from from accounts where id = ${friend.id}`;
  assert.deepEqual({ ...row }, { invited_by: inviter.id, came_from: 'newsletter' });
  assert.equal(((await (await call(accounts.POST, inviter.token, 'POST', { action: 'invite' })).json()) as { joined: number }).joined, 1);

  // Too late: an account older than 14 days opening a friend's link wasn't invited.
  const old = await person('member');
  await db`update accounts set created_at = now() - interval '20 days' where id = ${old.id}`;
  assert.equal(await claim(old, { code }), 'too_late');

  // A record save never sets who invited someone, where they came from, or when they were seen.
  const owner = await person('owner');
  await call(data.POST, friend.token, 'POST', { collection: 'users', records: [{ id: friend.id, role: 'member', name: 'Friend', invitedBy: friend.id, cameFrom: 'x', lastPlatform: 'ios' }] });
  await call(data.POST, owner.token, 'POST', { collection: 'users', records: [{ id: friend.id, role: 'member', name: 'Friend', invitedBy: owner.id, cameFrom: 'y' }] });
  const [after] = await db`select invited_by, came_from from accounts where id = ${friend.id}`;
  assert.deepEqual({ ...after }, { invited_by: inviter.id, came_from: 'newsletter' });
});

test('last seen: asking who is signed in notes when and on what, for the dashboard', { skip }, async () => {
  const m = await person('member');
  const res = await accounts.GET(new Request('http://local/api', { headers: { authorization: `Bearer ${m.token}`, 'x-app-platform': 'android', 'x-app-version': '1.4.0' } }));
  assert.equal(res.status, 200);
  const [row] = await sql()`select last_seen_at, last_platform, last_app_version from accounts where id = ${m.id}`;
  assert.ok(row.last_seen_at);
  assert.equal(row.last_platform, 'android');
  assert.equal(row.last_app_version, '1.4.0');
  const owner = await person('owner');
  const everyone = (await (await call(data.GET, owner.token)).json()) as { users: { id: string; lastPlatform?: string }[] };
  assert.equal(everyone.users.find((u) => u.id === m.id)?.lastPlatform, 'android');
});

test('the owner resets a member’s onboarding: their level and answers go, what they did stays; nobody else can', { skip }, async () => {
  const o = await person('owner');
  const m = await person('member');
  const c = await person('coach');
  await sql()`update accounts set level = 'building', assessment = ${sql().json({ q: 'a' })}, assessed_at = now(), goal = 'A goal' where id = ${m.id}`;
  await call(data.POST, m.token, 'POST', { collection: 'entries', records: [entry(m.id)] });
  for (const who of [m, c]) assert.equal((await call(accounts.POST, who.token, 'POST', { action: 'reset', memberId: m.id })).status, 403);
  assert.equal((await call(accounts.POST, o.token, 'POST', { action: 'reset', memberId: m.id })).status, 200);
  const [row] = await sql()`select level, assessment, assessed_at, goal from accounts where id = ${m.id}`;
  assert.deepEqual({ ...row }, { level: null, assessment: null, assessed_at: null, goal: 'A goal' });
  assert.equal((await sql()`select count(*)::int as n from entries where member_id = ${m.id}`)[0].n, 1);
  assert.equal((await call(accounts.POST, o.token, 'POST', { action: 'reset', memberId: o.id })).status, 404, 'only a member is reset');
});

test('the owner deletes a member’s account and login for good; never an owner’s, and nobody else can', { skip }, async () => {
  const o = await person('owner');
  const o2 = await person('owner');
  const m = await person('member');
  const c = await person('coach');
  await call(data.POST, m.token, 'POST', { collection: 'entries', records: [entry(m.id)] });
  for (const who of [m, c]) assert.equal((await call(accounts.POST, who.token, 'POST', { action: 'remove', memberId: m.id })).status, 403);
  assert.equal((await call(accounts.POST, o.token, 'POST', { action: 'remove', memberId: o2.id })).status, 403);
  assert.equal((await call(accounts.POST, o.token, 'POST', { action: 'remove', memberId: m.id })).status, 200);
  assert.equal((await sql()`select count(*)::int as n from accounts where id = ${m.id}`)[0].n, 0);
  assert.equal((await sql()`select count(*)::int as n from entries where member_id = ${m.id}`)[0].n, 0);
  assert.equal((await sql()`select count(*)::int as n from auth.users where id = ${m.authId}`)[0].n, 0);
  assert.equal((await call(accounts.POST, o.token, 'POST', { action: 'remove', memberId: c.id })).status, 200, 'a coach’s account too');
  assert.equal((await call(accounts.POST, o.token, 'POST', { action: 'remove', memberId: m.id })).status, 404);
});
