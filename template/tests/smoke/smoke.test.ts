/**
 * Smoke tests: a few basic checks against a running deployment, not the
 * code. CI runs them against production after every production deploy
 * (.github/workflows/smoke.yml); run them by hand with
 *   SMOKE_URL=https://your-app.vercel.app npm run test:smoke
 *
 * SMOKE_URL           the site to check (required)
 * SMOKE_COMMIT        the commit that should be live; the health check waits
 *                     for it (up to SMOKE_WAIT_SECONDS, default 120)
 * SMOKE_REQUIRE_DB=0  allow a site with no database (demo mode)
 *
 * They only read: nothing here signs up, writes or pays.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

const BASE = process.env.SMOKE_URL?.replace(/\/+$/, '');
if (!BASE) throw new Error('Set SMOKE_URL to the site to check, e.g. https://your-app.vercel.app');
const COMMIT = process.env.SMOKE_COMMIT?.slice(0, 7);
const WAIT_MS = Number(process.env.SMOKE_WAIT_SECONDS ?? 120) * 1000;
const REQUIRE_DB = process.env.SMOKE_REQUIRE_DB !== '0';

const get = (path: string, init?: RequestInit) => fetch(BASE + path, { redirect: 'follow', ...init, signal: AbortSignal.timeout(20_000) });

type Health = { db: 'off' | 'ok' | 'error'; migration: string | null; commit: string | null };

test('the backend is healthy and serving this commit', async () => {
  const deadline = Date.now() + WAIT_MS;
  let health: Health;
  for (;;) {
    const res = await get('/api/health', { cache: 'no-store' });
    assert.equal(res.status, 200, '/api/health should answer 200');
    health = (await res.json()) as Health;
    if (!COMMIT || health.commit === COMMIT || Date.now() > deadline) break;
    await new Promise((r) => setTimeout(r, 10_000));
  }
  if (COMMIT) assert.equal(health.commit, COMMIT, 'the live deployment should be the commit just deployed');
  assert.notEqual(health.db, 'error', 'the database should be reachable');
  if (REQUIRE_DB) {
    assert.equal(health.db, 'ok', 'production should have a database (SUPABASE_DB_URL)');
    assert.match(health.migration ?? '', /^\d{14}$/, 'the migrations should have run');
  }
});

test('the web app loads', async () => {
  const res = await get('/');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /text\/html/);
  const html = await res.text();
  assert.match(html, /<div id="root"/, 'the page should hold the app');
  const script = html.match(/<script[^>]+src="([^"]+\.js)"/)?.[1];
  assert.ok(script, 'the page should load the app bundle');
  const js = await get(new URL(script, BASE + '/').pathname);
  assert.equal(js.status, 200, `the app bundle ${script} should be served`);
});

test('app pages load on a direct visit', async () => {
  for (const path of ['/sign-in', '/admin']) {
    const res = await get(path);
    assert.equal(res.status, 200, path);
    assert.match(res.headers.get('content-type') ?? '', /text\/html/, path);
  }
});

test('member data needs a sign-in', async () => {
  if (!REQUIRE_DB) return;
  const res = await get('/api/data');
  assert.equal(res.status, 401, 'GET /api/data without a token should be refused');
  const bad = await get('/api/data', { headers: { authorization: 'Bearer not-a-real-token' } });
  assert.equal(bad.status, 401, 'GET /api/data with a made-up token should be refused');
});
