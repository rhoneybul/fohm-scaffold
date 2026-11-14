/** The wizard: options, generating an app, steps and state, the CLI in JSON mode. Plain Node: npm test. */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { check, markDone, names, newApp, overview, references } from '../lib/core.mjs';
import { resolveOptions } from '../lib/options.mjs';

const CLI = path.join(import.meta.dirname, '..', 'bin', 'fohm-scaffold.mjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'fohm-'));
const read = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');

test('options: only the name is required, the rest follow from it', () => {
  const { options } = resolveOptions({ name: 'Tide Pool', domain: 'https://tidepool.app/' });
  assert.equal(options.slug, 'tide-pool');
  assert.equal(options.kind, 'coaching');
  assert.equal(options.domain, 'tidepool.app');
  assert.equal(options.bundleId, 'app.tidepool');
  assert.equal(options.supportEmail, 'hello@tidepool.app');
  assert.equal(options.ownerWord, 'coach', 'a coaching app calls its owner the coach');
  assert.equal(resolveOptions({ name: 'X', kind: 'app' }).options.ownerWord, 'owner');
});

test('options: bad answers come back as errors, all at once', () => {
  const { errors } = resolveOptions({ name: '', kind: 'film', accent: 'red', bundleId: 'no' });
  assert.equal(errors.length, 4);
});

test('a new app carries its name, ids, colour and kind into the right files', () => {
  const dir = path.join(tmp(), 'tide');
  const r = newApp({ name: 'Tide Pool', kind: 'game', accent: '#3355AA', bundleId: 'app.tidepool', ownerWord: 'coach' }, { dir, git: false });
  assert.equal(r.ok, true);
  const app = JSON.parse(read(dir, 'app.json')).expo;
  assert.equal(app.name, 'Tide Pool');
  assert.equal(app.ios.bundleIdentifier, 'app.tidepool');
  assert.equal(app.android.package, 'app.tidepool');
  assert.equal(JSON.parse(read(dir, 'package.json')).name, 'tide-pool');
  assert.match(read(dir, 'src/lib/brand.ts'), /kind: 'game' as/);
  assert.match(read(dir, 'src/lib/brand.ts'), /ownerWord: 'coach'/);
  assert.match(read(dir, 'src/lib/theme.ts'), /accent: '#3355AA'/);
  assert.match(read(dir, '.github/workflows/test.yml'), /supabase_db_tide-pool/);
  assert.ok(!fs.existsSync(path.join(dir, 'node_modules')));
  assert.equal(r.next.id, 'research', 'research comes first: discover, then design, then build');
});

test('a new app refuses a folder that already has things in it', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'x'), '');
  assert.throws(() => newApp({ name: 'X' }, { dir, git: false }), /isn't empty/);
});

test('steps: checks mark what passes; manual steps are marked by hand, with their values', async () => {
  const dir = path.join(tmp(), 'a');
  newApp({ name: 'A' }, { dir, git: false });
  const r = await check(dir, 'product');
  assert.equal(r.results[0].ok, false, 'the template PRODUCT.md is not filled in');
  fs.writeFileSync(path.join(dir, 'PRODUCT.md'), '# Product\n\nReal words.\n');
  assert.equal((await check(dir, 'product')).results[0].ok, true);
  assert.throws(() => markDone(dir, 'vercel', 'not-a-url'), /https/);
  markDone(dir, 'vercel', 'https://a.example.com');
  const o = overview(dir);
  assert.equal(o.steps.find((s) => s.id === 'vercel').value, 'https://a.example.com');
  const mobile = await check(dir, 'mobile-config');
  assert.equal(mobile.results[0].ok, false, 'the bundle id is still com.example');
});

test('the CLI speaks JSON when asked, and never prompts', () => {
  const dir = path.join(tmp(), 'cli-app');
  const made = JSON.parse(execFileSync('node', [CLI, 'new', dir, '--name', 'Cli App', '--kind', 'game', '--no-git', '--json'], { encoding: 'utf8' }));
  assert.equal(made.ok, true);
  assert.equal(made.options.kind, 'game');
  const status = JSON.parse(execFileSync('node', [CLI, 'status', '--dir', dir, '--json'], { encoding: 'utf8' }));
  assert.equal(status.total, status.steps.length);
  const bad = spawnSync('node', [CLI, 'new', path.join(tmp(), 'b'), '--accent', 'red', '--name', 'B', '--json'], { encoding: 'utf8' });
  assert.equal(bad.status, 1, 'a bad answer exits non-zero');
  assert.equal(JSON.parse(bad.stdout).ok, false);
});

test('integrations: optional steps can be skipped, required ones can’t; checks read the live site', async () => {
  const http = await import('node:http');
  const health = { db: 'ok', auth: {}, integrations: { billing: { priceCents: 1000, currency: 'usd' }, posthog: null, sentry: { dsn: 'x' }, email: false, ai: true, google: false, push: true } };
  const server = http.createServer((req, res) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(health)));
  await new Promise((r) => server.listen(0, r));
  try {
    const dir = path.join(tmp(), 'i');
    newApp({ name: 'I' }, { dir, git: false });
    assert.throws(() => markDone(dir, 'vercel', undefined, false, true), /isn't optional/);
    markDone(dir, 'posthog', undefined, false, true);
    assert.equal(overview(dir).steps.find((s) => s.id === 'posthog').skipped, true);
    // https is required for the vercel value; the test server is http, so write it straight in.
    const statePath = path.join(dir, '.fohm', 'state.json');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    state.values.vercel = `http://localhost:${server.address().port}`;
    fs.writeFileSync(statePath, JSON.stringify(state));
    assert.equal((await check(dir, 'stripe')).results[0].ok, true);
    assert.equal((await check(dir, 'ai')).results[0].ok, true);
    const email = (await check(dir, 'email')).results[0];
    assert.equal(email.ok, false);
    assert.match(email.detail, /RESEND_API_KEY/);
    assert.equal((await check(dir, 'push')).results[0].ok, false, 'push is marked by hand');
  } finally {
    server.close();
  }
});

test('the generated app knows its name on the server too', () => {
  const dir = path.join(tmp(), 'n');
  newApp({ name: 'Named App' }, { dir, git: false });
  assert.match(read(dir, 'api/_lib/app.ts'), /APP_NAME = 'Named App'/);
});

test('the strategy: idea and business go into the product brief; the apps they like into DESIGN.md', () => {
  const dir = path.join(tmp(), 's');
  newApp({ name: 'Swell', idea: 'A pocket surf coach for beginners.', business: 'A surf school', inspiration: 'Speak,  Ahead,' }, { dir, git: false });
  assert.match(read(dir, 'PRODUCT.md'), /## The thesis\n\nA pocket surf coach for beginners\.\n\nThe business: A surf school\n\n## Platform/);
  assert.match(read(dir, 'DESIGN.md'), /Apps the owner likes: Speak, Ahead\./);
  assert.match(read(dir, 'docs/RESEARCH.md'), /A pocket surf coach for beginners\./);
  assert.match(read(dir, 'src/lib/brand.ts'), /kind: 'coaching' as/);
  const phases = [...new Set(overview(dir).steps.map((s) => s.phase))];
  assert.deepEqual(phases, ['Discover', 'Design', 'Build', 'Launch', 'Grow', 'Hand over']);
});

test('references: three Mobbin screens pass the inspiration step; a non-https link is refused', async () => {
  const dir = path.join(tmp(), 'r');
  newApp({ name: 'R' }, { dir, git: false });
  assert.equal((await check(dir, 'inspiration')).results[0].ok, false);
  assert.throws(() => references(dir, [{ app: 'X', url: 'javascript:alert(1)' }]), /https/);
  references(dir, ['a', 'b', 'c'].map((x) => ({ app: `App ${x}`, screen: 'Home', url: `https://mobbin.com/screens/${x}`, take: 'line\nbreaks flattened' })));
  assert.equal((await check(dir, 'inspiration')).results[0].ok, true);
  assert.doesNotMatch(read(dir, 'DESIGN.md'), /line\nbreaks/);
});

test('a plain app or game has no progression step; a coaching app does', () => {
  const ids = (kind) => {
    const dir = path.join(tmp(), kind);
    newApp({ name: kind, kind }, { dir, git: false });
    return overview(dir).steps.map((s) => s.id);
  };
  assert.ok(ids('coaching').includes('progression'));
  assert.ok(!ids('app').includes('progression'));
  assert.ok(!ids('game').includes('progression'));
});

test('github: a clear error without the gh CLI (or before it is signed in)', () => {
  const dir = path.join(tmp(), 'g');
  newApp({ name: 'G' }, { dir, git: false });
  const r = spawnSync('node', [CLI, 'github', '--dir', dir, '--json'], { encoding: 'utf8', env: { ...process.env, PATH: '/nonexistent' } });
  assert.notEqual(r.status, 0);
});

test('names: a domain or repository nobody has is free; one that answers is taken', async () => {
  const http = await import('node:http');
  const taken = new Set(['/domain/swell.com', '/repos/me/swell']);
  const server = http.createServer((req, res) => res.writeHead(taken.has(req.url) ? 200 : 404, { 'content-type': 'application/json' }).end('{}'));
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  process.env.FOHM_RDAP_URL = base;
  process.env.FOHM_GITHUB_API = base;
  try {
    const [swell, other] = await names(['Swell', 'Other Name'], { owner: 'me' });
    assert.deepEqual(swell.domains, { 'swell.com': 'taken', 'swell.app': 'free', 'swell.co': 'free' });
    assert.deepEqual(swell.github, { 'me/swell': 'taken' });
    assert.deepEqual(other.free, ['othername.com', 'othername.app', 'othername.co']);
    assert.deepEqual(other.github, { 'me/other-name': 'free' });
  } finally {
    delete process.env.FOHM_RDAP_URL;
    delete process.env.FOHM_GITHUB_API;
    server.close();
  }
});

test('github: creates a private repository with the app’s name through gh, and marks the step done', () => {
  const bin = tmp();
  // A stand-in gh: answers --version and auth status, and on repo create adds the remote as the real one does.
  fs.writeFileSync(
    path.join(bin, 'gh'),
    `#!/bin/sh\necho "$@" >> "${bin}/calls"\nif [ "$1" = "repo" ]; then\n  src=""; prev=""\n  for a in "$@"; do [ "$prev" = "--source" ] && src="$a"; prev="$a"; done\n  git -C "$src" remote add origin "https://github.com/$3.git"\nfi\nexit 0\n`,
    { mode: 0o755 },
  );
  const dir = path.join(tmp(), 'hub');
  newApp({ name: 'Hub App', tagline: 'Hello there' }, { dir });
  const r = spawnSync('node', [CLI, 'github', '--dir', dir, '--owner', 'acme', '--json'], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const out = JSON.parse(r.stdout);
  assert.equal(out.url, 'https://github.com/acme/hub-app.git');
  assert.equal(out.steps.find((s) => s.id === 'github').done, true);
  const call = fs.readFileSync(path.join(bin, 'calls'), 'utf8').split('\n').find((l) => l.startsWith('repo create'));
  assert.match(call, /^repo create acme\/hub-app --private --source .* --remote origin --push --description Hello there$/);
});
