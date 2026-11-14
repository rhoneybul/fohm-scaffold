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
let data: typeof import('../api/data');
let sql: typeof import('../api/_lib/db').sql;

before(async () => {
  if (skip) return;
  accounts = await import('../api/accounts');
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
