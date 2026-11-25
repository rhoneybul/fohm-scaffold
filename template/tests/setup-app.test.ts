/**
 * Set up app (scripts/setup-app.mjs): each step reads what is there and
 * changes only what is missing, so running it again changes nothing. Every
 * request is answered by a fake fetch; nothing leaves the machine.
 */
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as setupScript from '../scripts/setup-app.mjs';

// The script is plain JavaScript; its options are read loosely here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setup = setupScript as any;

type Call = { method: string; url: string; body?: unknown };
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

/** Answers each request from `routes` (first match on "METHOD url-part"), recording the calls. */
function fake(routes: [string, unknown][]) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, url, body });
    const hit = routes.find(([key]) => { const [m, part] = key.split(' '); return m === method && url.includes(part); });
    if (!hit) return new Response('not found', { status: 404 });
    return new Response(JSON.stringify(hit[1]), { status: 200 });
  }) as typeof fetch;
  return calls;
}

const APP = { name: 'Trail', slug: 'trail', scheme: 'trail', owner: 'someone', bundleId: 'com.trail.app', androidPackage: 'com.trail.app', appleSignIn: false };

test('the database string is the Session pooler on 5432, with the password escaped', () => {
  const url = setup.poolerUrl([{ database_type: 'PRIMARY', db_user: 'postgres.abc', db_host: 'aws-0-eu-west-2.pooler.supabase.com', db_port: 6543, db_name: 'postgres' }], 'p@ss/w');
  assert.equal(url, 'postgresql://postgres.abc:p%40ss%2Fw@aws-0-eu-west-2.pooler.supabase.com:5432/postgres');
});

test('sign-in returns to the site and to the app by its scheme', () => {
  assert.deepEqual(setup.redirectUrls('https://trail.app/', 'trail'), ['https://trail.app/**', 'trail://**']);
  assert.deepEqual(setup.redirectUrls(undefined, 'trail'), ['trail://**']);
});

test('github: a ruleset already on is left alone; the merge buttons are set to rebase only', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'rs-'));
  const file = path.join(dir, 'r.json');
  writeFileSync(file, JSON.stringify({ name: 'main: rebase only' }));
  const calls = fake([['GET /rulesets', [{ name: 'main: rebase only' }]], ['PATCH /repos/o/r', {}]]);
  await setup.github({ repo: 'o/r', token: 't', rulesetFile: file });
  assert.equal(calls.filter((c) => c.method === 'POST').length, 0, 'no second ruleset');
  assert.deepEqual(calls.at(-1)!.body, { allow_merge_commit: false, allow_squash_merge: false, allow_rebase_merge: true, delete_branch_on_merge: true });
});

test('supabase: finds the project by name, sets sign-in, and makes a password only when Vercel needs one', async () => {
  const routes: [string, unknown][] = [
    ['GET /v1/projects/ref1/api-keys', [{ type: 'publishable', api_key: 'sb_publishable_x' }]],
    ['GET /v1/projects/ref1/config/database/pooler', [{ database_type: 'PRIMARY', db_user: 'postgres.ref1', db_host: 'h', db_name: 'postgres' }]],
    ['GET /v1/projects', [{ id: 'ref1', name: 'Trail' }]],
    ['PATCH /config/auth', {}],
    ['PATCH /database/password', {}],
  ];
  let calls = fake(routes);
  const kept = await setup.supabase({ token: 't', app: APP, site: 'https://trail.app', needDbUrl: false });
  assert.equal(kept.publishable, 'sb_publishable_x');
  assert.equal(kept.dbUrl, undefined);
  assert.ok(!calls.some((c) => c.url.includes('/database/password')), 'the password is left alone');
  assert.ok(!calls.some((c) => c.method === 'POST'), 'no project is made');
  assert.equal((calls.find((c) => c.url.includes('/config/auth'))!.body as { uri_allow_list: string }).uri_allow_list, 'https://trail.app/**,trail://**');

  calls = fake(routes);
  const fresh = await setup.supabase({ token: 't', app: APP, needDbUrl: true });
  assert.match(fresh.dbUrl, /^postgresql:\/\/postgres\.ref1:[^@]+@h:5432\/postgres$/);
  assert.ok(calls.some((c) => c.url.includes('/database/password')));
});

test('vercel: links only the shared variables not yet linked, then redeploys', async () => {
  const calls = fake([
    ['GET /v9/projects/trail/env', { envs: [{ key: 'SUPABASE_DB_URL' }] }],
    ['GET /v9/projects/trail', { id: 'prj1' }],
    ['GET /v9/projects/prj1/env', { envs: [{ key: 'SUPABASE_DB_URL' }] }],
    ['GET /v1/env', { data: [{ id: 'e1', key: 'ANTHROPIC_API_KEY', projectId: ['other'] }, { id: 'e2', key: 'RESEND_API_KEY', projectId: ['prj1'] }] }],
    ['PATCH /v1/env', { updated: [{ id: 'e1' }], failed: [] }],
    ['GET /v6/deployments', { deployments: [{ uid: 'dpl1' }] }],
    ['POST /v13/deployments', {}],
  ]);
  await setup.vercel({ token: 't', name: 'trail', set: { OWNER_EMAIL: { value: undefined } }, shared: ['ANTHROPIC_API_KEY', 'RESEND_API_KEY', 'MISSING'] });
  const patches = calls.filter((c) => c.method === 'PATCH');
  assert.deepEqual(patches.map((c) => c.url.split('?')[0]), ['https://api.vercel.com/v1/env']);
  assert.deepEqual(patches[0].body, { updates: { e1: { projectIdUpdates: { link: ['prj1'] } } } });
  assert.ok(!calls.some((c) => c.url.includes('/v10/projects')), 'no empty variable is written');
  assert.deepEqual(calls.find((c) => c.url.includes('/v13/deployments'))!.body, { name: 'trail', deploymentId: 'dpl1', target: 'production' });
});

test('App Store Connect tokens are ES256, for appstoreconnect-v1, signed by the key', async () => {
  const { generateKeyPairSync, verify } = await import('node:crypto');
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const token = setup.ascToken({ keyP8: privateKey.export({ type: 'pkcs8', format: 'pem' }), keyId: 'KEY1', issuerId: 'iss' });
  const [h, p, sig] = token.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(h, 'base64url').toString()), { alg: 'ES256', kid: 'KEY1', typ: 'JWT' });
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString());
  assert.equal(payload.aud, 'appstoreconnect-v1');
  assert.ok(payload.exp - payload.iat <= 1200, 'Apple refuses a token over 20 minutes');
  assert.ok(verify('sha256', Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url')));
});
