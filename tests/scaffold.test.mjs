/** The wizard: options, generating an app, steps and state, the CLI in JSON mode. Plain Node: npm test. */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { check, explain, markDone, names, newApp, overview, references } from '../lib/core.mjs';
import { countryCode, resolveOptions } from '../lib/options.mjs';
import { linesFor, stepById } from '../lib/steps.mjs';

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
  // The server's copy for emails and Tapp's links, and Supabase's auth emails.
  assert.match(read(dir, 'api/_lib/app.ts'), /ACCENT = '#3355AA'/);
  assert.match(read(dir, 'api/_lib/app.ts'), /BUNDLE_ID = 'app.tidepool'/);
  for (const f of fs.readdirSync(path.join(dir, 'supabase/templates'))) {
    const t = read(dir, `supabase/templates/${f}`);
    assert.ok(t.includes('Tide Pool') && t.includes('#3355AA') && !/Starter|#2F6B4F/.test(t), `${f} carries the app's name and accent`);
  }
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

test('design: the direction contract in .impeccable/surfaces must have its blocks and name a reference', async () => {
  const dir = path.join(tmp(), 'dc');
  newApp({ name: 'D' }, { dir, git: false });
  references(dir, [{ app: 'Pushr', screen: 'Home', url: 'https://mobbin.com/screens/p' }]);
  assert.match((await check(dir, 'design')).results[0].detail, /No surface brief/);
  const surfaces = path.join(dir, '.impeccable', 'surfaces');
  fs.mkdirSync(surfaces, { recursive: true });
  fs.writeFileSync(path.join(surfaces, 'home.md'), '# Member app\n\n## Direction contract\n\nTHESIS: plain.\n');
  assert.match((await check(dir, 'design')).results[0].detail, /OWN-WORLD:, STORY:, FIRST VIEWPORT:/);
  const contract = '## Direction contract\n\nTHESIS: x\nOWN-WORLD: y\nSTORY: Home follows z\nFIRST VIEWPORT: w\n';
  fs.writeFileSync(path.join(surfaces, 'home.md'), contract);
  assert.match((await check(dir, 'design')).results[0].detail, /doesn’t name a reference/);
  fs.writeFileSync(path.join(surfaces, 'home.md'), contract.replace('follows z', 'follows Pushr’s week of circles'));
  assert.equal((await check(dir, 'design')).results[0].ok, true);
  assert.equal(stepById('design').phase, 'Design');
  assert.ok(linesFor(stepById('inspiration'), null).some((l) => /the type .*the navigation .*the colour/.test(l)), 'inspiration asks the three questions');
});

test('inside an existing repository: the workflows go to its root, scoped to the folder, and no git init', () => {
  const root = tmp();
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  fs.mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
  fs.writeFileSync(path.join(root, '.github', 'workflows', 'test.yml'), 'name: The game\n');
  const dir = path.join(root, 'app');
  const r = newApp({ name: 'Inside' }, { dir });
  assert.equal(r.ok, true);
  assert.deepEqual(r.repo.workflows, ['.github/workflows/app-test.yml', '.github/workflows/app-smoke.yml']);
  assert.equal(r.repo.folder, 'app');
  assert.ok(!fs.existsSync(path.join(dir, '.git')), 'no git init inside the repository');
  assert.ok(!fs.existsSync(path.join(dir, '.github')), 'GitHub reads workflows only at the root');
  assert.equal(read(root, '.github/workflows/test.yml'), 'name: The game\n', 'the repository’s own workflow is left alone');
  const test = read(root, '.github/workflows/app-test.yml');
  assert.match(test, /pull_request:\n    paths: \['app\/\*\*', '\.github\/workflows\/app-test\.yml'\]/);
  assert.match(test, /push:\n    branches: \[main\]\n    paths: \['app\/\*\*'/);
  assert.match(test, /defaults:\n  run:\n    working-directory: app\n/);
  assert.match(test, /cache-dependency-path: app\/package-lock\.json/);
  assert.match(test, /supabase_db_inside/);
  const smoke = read(root, '.github/workflows/app-smoke.yml');
  assert.match(smoke, /^on:\n  workflow_dispatch:\n\n/m, 'run by hand: another project here deploys too');
  assert.doesNotMatch(smoke, /^  deployment_status:/m);
  assert.match(smoke, /working-directory: app/);
  assert.match(smoke, /vars\.APP_SMOKE_URL/);
  assert.match(smoke, /npm run test:smoke/);
  assert.match(read(dir, 'AGENTS.md'), /\.github\/workflows\/app-test\.yml` at the repository's root/);
  assert.ok(linesFor(stepById('vercel'), r && JSON.parse(read(dir, '.fohm/state.json')), dir).some((l) => /Root Directory = app/.test(l)));
  assert.ok(linesFor(stepById('smoke'), JSON.parse(read(dir, '.fohm/state.json')), dir).some((l) => /APP_SMOKE_URL/.test(l)));
  // A second app in the same repository gets its own workflow names.
  const second = newApp({ name: 'Other' }, { dir: path.join(root, 'other') });
  assert.deepEqual(second.repo.workflows, ['.github/workflows/other-test.yml', '.github/workflows/other-smoke.yml']);
  // And outside any repository, --in-repo is refused.
  assert.throws(() => newApp({ name: 'Out' }, { dir: path.join(tmp(), 'out'), inRepo: true }), /isn't in a git repository/);
});

test('programs, not coaching: --coach no makes an app with nobody behind it, speaking as itself', () => {
  const { options } = resolveOptions({ name: 'P', coach: 'no' });
  assert.equal(options.coach, false);
  assert.equal(options.ownerWord, 'team', 'the people who run it are the team');
  assert.equal(resolveOptions({ name: 'P' }).options.coach, true, 'a coach unless told otherwise');
  assert.match(resolveOptions({ name: 'P', coach: 'maybe' }).errors[0], /coach is yes/);
  const dir = path.join(tmp(), 'p');
  newApp({ name: 'P', coach: 'no' }, { dir, git: false });
  assert.match(read(dir, 'src/lib/brand.ts'), /^  coach: false,$/m);
  assert.match(read(dir, 'src/lib/brand.ts'), /ownerWord: 'team'/);
  assert.match(read(dir, 'AGENTS.md'), /There is no coach: no coach is shown or offered/);
  const cli = JSON.parse(execFileSync('node', [CLI, 'new', path.join(tmp(), 'q'), '--name', 'Q', '--coach', 'no', '--no-git', '--json'], { encoding: 'utf8' }));
  assert.equal(cli.options.coach, false);
  const coached = path.join(tmp(), 'c');
  newApp({ name: 'C' }, { dir: coached, git: false });
  assert.match(read(coached, 'src/lib/brand.ts'), /^  coach: true,$/m);
});

test('previews: the owner gets a share link past Vercel Authentication, and screenshots after each feature', () => {
  const vercel = linesFor(stepById('vercel'), null).join('\n');
  assert.match(vercel, /get_access_to_vercel_url/);
  assert.match(vercel, /demo mode/);
  assert.match(linesFor(stepById('review'), null).join('\n'), /npm run screens/);
  const dir = path.join(tmp(), 'shots');
  newApp({ name: 'Shots' }, { dir, git: false });
  assert.ok(fs.existsSync(path.join(dir, 'scripts', 'screens.mjs')));
  assert.equal(JSON.parse(read(dir, 'package.json')).scripts.screens, 'node scripts/screens.mjs');
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

test('names behind a proxy: lookups go through it, and one the network refuses says so and where to check instead', async () => {
  const { checkNames, proxyFor } = await import('../lib/names.mjs');
  const env = { HTTPS_PROXY: 'http://127.0.0.1:9', NO_PROXY: 'localhost,.internal' };
  assert.equal(proxyFor('https://rdap.org/domain/x.com', env), 'http://127.0.0.1:9');
  assert.equal(proxyFor('https://api.internal/x', env), null, 'NO_PROXY is respected');
  assert.equal(proxyFor('https://rdap.org/domain/x.com', { https_proxy: 'http://p:1' }), 'http://p:1', 'the lower-case name too');
  const fetched = [];
  const curled = [];
  const via = {
    env,
    undici: async () => false,
    fetch: async (url) => (fetched.push(url), { status: 404 }),
    curl: async (url) => (curled.push(url), url.includes('swell.com') ? { status: 200 } : url.includes('swell.app') ? { status: 404 } : { error: 'the network refused rdap.org' }),
  };
  const [swell] = await checkNames(['Swell'], { owner: 'me', via });
  assert.equal(fetched.length, 0, 'Node’s fetch ignores the proxy, so it isn’t used behind one');
  assert.equal(curled.length, 4);
  assert.deepEqual(swell.domains, { 'swell.com': 'taken', 'swell.app': 'free', 'swell.co': 'couldn’t check: the network refused rdap.org' });
  assert.deepEqual(swell.unchecked, ['swell.co']);
  assert.match(swell.checkWith, /get_bulk_availability/);
  // With undici to hand, fetch goes through its ProxyAgent instead.
  const [again] = await checkNames(['Swell'], { owner: 'me', via: { ...via, undici: async () => true } });
  assert.equal(again.domains['swell.com'], 'free');
  assert.equal(again.checkWith, undefined);
  // No proxy, no network: still said plainly.
  const [off] = await checkNames(['Off'], { owner: 'me', via: { env: {}, fetch: async () => Promise.reject(new TypeError('fetch failed')) } });
  assert.match(off.domains['off.com'], /^couldn’t check: the network couldn’t reach /);
  assert.ok(linesFor(stepById('domain'), null).some((l) => /get_bulk_availability/.test(l)));
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

test('options: the country is a code where the steps know it, as typed elsewhere; the registration passes through', () => {
  assert.equal(countryCode('Australia'), 'AU');
  assert.equal(countryCode(' U.K. '), 'GB');
  assert.equal(countryCode('england'), 'GB');
  assert.equal(countryCode('USA'), 'US');
  assert.equal(countryCode('Portugal'), 'Portugal');
  assert.equal(countryCode(''), '');
  const { options } = resolveOptions({ name: 'X', country: 'australia', registration: 'ABN 51 824 753 556' });
  assert.equal(options.country, 'AU');
  assert.equal(options.registration, 'ABN 51 824 753 556');
  assert.match(resolveOptions({ name: 'X', registration: 'a "quoted" number' }).errors[0], /registration/);
});

test('a registered business: its step is done from the start, and the terms show its number', () => {
  const dir = path.join(tmp(), 'reg');
  newApp({ name: 'Reg', operator: 'Reg Ltd', registration: 'company number 01234567' }, { dir, git: false });
  const business = overview(dir).steps.find((s) => s.id === 'business');
  assert.equal(business.done, true);
  assert.equal(business.value, 'company number 01234567');
  assert.match(read(dir, 'src/lib/brand.ts'), /registration: 'company number 01234567',/);
  assert.match(read(dir, 'src/lib/legal.ts'), /APP\.registration \? `\$\{APP\.operator\} \(\$\{APP\.registration\}\)`/);
  const open = path.join(tmp(), 'open');
  newApp({ name: 'Open' }, { dir: open, git: false });
  assert.equal(overview(open).steps.find((s) => s.id === 'business').done, false, 'not registered yet: the step walks them through it');
  assert.match(read(open, 'src/lib/brand.ts'), /registration: '',/);
});

test('the business step walks through registering it where the business is, and can be skipped', () => {
  const lines = (country) => linesFor(stepById('business'), { options: { country }, values: {} }).join('\n');
  assert.match(lines('AU'), /abr\.gov\.au/);
  assert.match(lines('AU'), /A\$75,000/);
  assert.match(lines('GB'), /Companies House/);
  assert.match(lines('GB'), /£90,000/);
  assert.match(lines('US'), /EIN/);
  assert.match(lines('Portugal'), /Portugal’s business registry/);
  assert.match(lines(''), /the country’s business registry/);
  assert.match(linesFor(stepById('domain'), { options: { country: 'AU' }, values: {} }).join('\n'), /\.com\.au/);
  assert.doesNotMatch(linesFor(stepById('domain'), { options: { country: 'GB' }, values: {} }).join('\n'), /\.com\.au/);
  const dir = path.join(tmp(), 'skip');
  newApp({ name: 'Skip' }, { dir, git: false });
  assert.equal(markDone(dir, 'business', undefined, false, true).steps.find((s) => s.id === 'business').skipped, true);
});

test('the domain: kept as the bare name, refused when it isn’t one, and written into the steps that need it', () => {
  const dir = path.join(tmp(), 'dom');
  newApp({ name: 'Dom' }, { dir, git: false });
  assert.match(explain('supabase', dir).do.join('\n'), /https:\/\/<your domain>\/\*\*/, 'unknown until it’s bought');
  assert.throws(() => markDone(dir, 'domain', 'not a domain'), /like tidepool\.app/);
  markDone(dir, 'domain', 'https://TidePool.app/anything');
  assert.equal(overview(dir).steps.find((s) => s.id === 'domain').value, 'tidepool.app');
  assert.match(explain('supabase', dir).do.join('\n'), /https:\/\/tidepool\.app\/\*\*/);
  markDone(dir, 'supabase', 'abcdefghij');
  assert.match(explain('google', dir).do.join('\n'), /https:\/\/abcdefghij\.supabase\.co\/auth\/v1\/callback/);
  assert.match(explain('email', dir).do.join('\n'), /"Dom <hello@[^>]*>"|<support email>/);
});

test('who does what: the person’s steps are marked, and the agent carries on past them', () => {
  const dir = path.join(tmp(), 'who');
  newApp({ name: 'Who', domain: 'who.example.org' }, { dir, git: false });
  const who = Object.fromEntries(overview(dir).steps.map((s) => [s.id, s.who]));
  assert.equal(who.supabase, 'both', 'the agent makes the project; the database password stays with the person');
  assert.equal(who.domain, 'you');
  assert.equal(who['store-accounts'], 'you');
  assert.equal(who.research, 'both');
  assert.equal(who.tests, 'agent');
  markDone(dir, 'research');
  const o = markDone(dir, 'product');
  assert.equal(o.next.id, 'domain', 'next is the person’s');
  assert.equal(o.nextForAgent.id, 'inspiration', 'the agent gets on with design meanwhile');
  assert.ok(o.manual.waiting > 10);
});

test('inbox: passes once the support address takes mail, and says why when it doesn’t', async () => {
  const http = await import('node:http');
  const answers = {
    'tidepool.app': [{ name: 'tidepool.app', type: 15, TTL: 300, data: '20 mx2.example.net.' }, { name: 'tidepool.app', type: 15, TTL: 300, data: '10 mx1.example.net.' }],
    'nomail.app': [],
    'nullmx.app': [{ name: 'nullmx.app', type: 15, TTL: 300, data: '0 .' }],
  };
  const statuses = { 'gone.app': 3, 'broken.app': 2 };
  const server = http.createServer((req, res) => {
    const name = new URL(req.url, 'http://x').searchParams.get('name');
    res.writeHead(200, { 'content-type': 'application/dns-json' }).end(JSON.stringify({ Status: statuses[name] ?? 0, Answer: answers[name] }));
  });
  await new Promise((r) => server.listen(0, r));
  process.env.FOHM_DOH_URL = `http://localhost:${server.address().port}/dns-query`;
  try {
    const dir = path.join(tmp(), 'mail');
    newApp({ name: 'Mail', domain: 'tidepool.app' }, { dir, git: false });
    const good = (await check(dir, 'inbox')).results[0];
    assert.equal(good.ok, true);
    assert.match(good.detail, /mx1\.example\.net/, 'the best server first');
    const brand = path.join(dir, 'src/lib/brand.ts');
    for (const domain of ['nomail.app', 'nullmx.app']) {
      fs.writeFileSync(brand, read(dir, 'src/lib/brand.ts').replace(/supportEmail: '.*?'/, `supportEmail: 'hello@${domain}'`));
      const r = (await check(dir, 'inbox')).results[0];
      assert.equal(r.ok, false, domain);
      assert.match(r.detail, /no MX records/);
    }
    const setEmail = (email) => fs.writeFileSync(brand, read(dir, 'src/lib/brand.ts').replace(/supportEmail: '.*?'/, `supportEmail: '${email}'`));
    setEmail('hello@gone.app');
    assert.match((await check(dir, 'inbox')).results[0].detail, /gone\.app doesn't exist yet/);
    setEmail('hello@broken.app');
    assert.match((await check(dir, 'inbox')).results[0].detail, /Couldn't look up where mail for broken\.app goes/);
    setEmail('support@example.com');
    assert.match((await check(dir, 'inbox')).results[0].detail, /Set supportEmail/);
  } finally {
    delete process.env.FOHM_DOH_URL;
    server.close();
  }
});

test('registration: "no" or "not yet" leaves the business step open; a bare "yes" is asked for the number', () => {
  for (const answer of ['no', 'Not yet', 'none', 'N/A']) {
    const dir = path.join(tmp(), 'no');
    newApp({ name: 'No', registration: answer }, { dir, git: false });
    assert.equal(overview(dir).steps.find((s) => s.id === 'business').done, false, answer);
    assert.match(read(dir, 'src/lib/brand.ts'), /registration: '',/, answer);
  }
  assert.match(resolveOptions({ name: 'X', registration: 'yes' }).errors[0], /the number itself/);
});

test('what people type goes in as typed: $& and $1 are text, and line breaks are refused', () => {
  const dir = path.join(tmp(), 'dollar');
  newApp({ name: 'Cash $& Carry', operator: 'Cash $1 Ltd', registration: 'ABN 51 $& 556', idea: 'Costs $$ less' }, { dir, git: false });
  const brand = read(dir, 'src/lib/brand.ts');
  assert.match(brand, /name: 'Cash \$& Carry',/);
  assert.match(brand, /operator: 'Cash \$1 Ltd',/);
  assert.match(brand, /registration: 'ABN 51 \$& 556',/);
  assert.match(read(dir, 'PRODUCT.md'), /Costs \$\$ less/);
  assert.match(read(dir, 'api/_lib/app.ts'), /APP_NAME = 'Cash \$& Carry'/);
  assert.match(explain('email', dir).do.join('\n'), /"Cash \$& Carry </);
  assert.match(resolveOptions({ name: 'X', registration: 'company 1,\nregistered in England' }).errors.join(), /line breaks/);
});

test('the agent carries on past the live checks until the site is deployed', () => {
  const dir = path.join(tmp(), 'live');
  newApp({ name: 'Live' }, { dir, git: false });
  for (const id of ['research', 'product', 'inspiration', 'design', 'brand', 'install', 'progression', 'github', 'tests', 'review', 'mobile-config']) markDone(dir, id);
  assert.equal(overview(dir).nextForAgent.id, 'supabase', 'the agent makes the Supabase and Vercel projects itself');
  markDone(dir, 'supabase', 'abcdefghij');
  assert.equal(overview(dir).nextForAgent.id, 'vercel');
  for (const id of ['posthog', 'sentry']) markDone(dir, id);
  assert.notEqual(overview(dir).nextForAgent.id, 'live', 'live and smoke wait for the deploy');
  markDone(dir, 'vercel', 'https://live.example.org');
  assert.equal(overview(dir).nextForAgent.id, 'live');
});

test('an app made before these steps: what its finished steps settle is done, the rest stays open', () => {
  const dir = path.join(tmp(), 'old');
  newApp({ name: 'Old' }, { dir, git: false });
  const statePath = path.join(dir, '.fohm', 'state.json');
  const old = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  old.version = 1;
  delete old.steps.business;
  old.steps.vercel = { done: true, at: '2026-11-01T00:00:00Z' };
  old.steps['mobile-build'] = { done: true, at: '2026-11-02T00:00:00Z' };
  old.steps.stores = { done: true, at: '2026-11-03T00:00:00Z' };
  old.values.vercel = 'https://www.old-app.example.org';
  fs.writeFileSync(statePath, JSON.stringify(old));
  fs.writeFileSync(path.join(dir, 'src/lib/brand.ts'), read(dir, 'src/lib/brand.ts').replace(/\n\s*\/\*\*\n\s*\* The business's registration[\s\S]*?registration: '',/, ''));
  const steps = Object.fromEntries(overview(dir).steps.map((s) => [s.id, s]));
  for (const id of ['store-accounts', 'business', 'domain']) assert.equal(steps[id].done, true, `${id} is settled by what's done`);
  assert.equal(steps.domain.value, 'old-app.example.org');
  assert.equal(steps.inbox.done, false, 'nothing settles the inbox: its check will');
  markDone(dir, 'business', undefined, true);
  assert.match(explain('business', dir).do.join('\n'), /made before brand\.ts had a registration/);
});

test('explain, inside an app, speaks for it: its country’s steps and its own support address', () => {
  const dir = path.join(tmp(), 'au');
  newApp({ name: 'Au', country: 'Australia', domain: 'au-app.example.org' }, { dir, git: false });
  assert.match(explain('business', dir).do.join('\n'), /abr\.gov\.au/);
  assert.match(explain('business').do.join('\n'), /the country’s business registry/, 'outside an app, the general version');
  fs.writeFileSync(path.join(dir, 'src/lib/brand.ts'), read(dir, 'src/lib/brand.ts').replace(/supportEmail: '.*?'/, "supportEmail: 'help@elsewhere.example.org'"));
  assert.match(explain('inbox', dir).do[0], /help@elsewhere\.example\.org/);
});

test('a domain other than the one the app was made for says what else to change; undo forgets it', () => {
  const dir = path.join(tmp(), 'moved');
  newApp({ name: 'Moved', domain: 'moved.app' }, { dir, git: false });
  assert.equal(markDone(dir, 'domain', 'moved.app').note, undefined, 'the same domain needs nothing');
  const r = markDone(dir, 'domain', 'moved.co');
  assert.match(r.note, /made for moved\.app/);
  assert.match(r.note, /supportEmail/);
  markDone(dir, 'domain', undefined, true);
  assert.equal(overview(dir).steps.find((s) => s.id === 'domain').value, undefined);
  assert.match(explain('supabase', dir).do.join('\n'), /https:\/\/moved\.app\/\*\*/, 'back to the domain it was made for');
});

test('a site that can’t be reached: a domain pointing nowhere is told how to point it, a blocked network is told so', async () => {
  const http = await import('node:http');
  let answer = { Status: 3 };
  const server = http.createServer((req, res) => res.writeHead(200, { 'content-type': 'application/dns-json' }).end(JSON.stringify(answer)));
  await new Promise((r) => server.listen(0, r));
  process.env.FOHM_DOH_URL = `http://localhost:${server.address().port}/dns-query`;
  try {
    const dir = path.join(tmp(), 'nowhere');
    newApp({ name: 'Nowhere' }, { dir, git: false });
    markDone(dir, 'vercel', 'https://fohm-test.invalid');
    assert.match((await check(dir, 'live')).results[0].detail, /doesn't point anywhere yet/);
    answer = { Status: 0, Answer: [{ name: 'fohm-test.invalid', type: 1, TTL: 60, data: '76.76.21.21' }] };
    assert.match((await check(dir, 'live')).results[0].detail, /this machine couldn't look it up/);
    answer = { Status: 2 };
    assert.match((await check(dir, 'live')).results[0].detail, /the DNS lookup over HTTPS failed too/);
  } finally {
    delete process.env.FOHM_DOH_URL;
    server.close();
  }
});

test('tapp and email: Tapp is checked on the live site; email also wants a DMARC record on the domain', async () => {
  const http = await import('node:http');
  const health = { db: 'ok', auth: {}, integrations: { email: true, tapp: { authToken: 'a', tappToken: 't' } } };
  const dmarc = { '_dmarc.tidepool.app': [{ name: '_dmarc.tidepool.app', type: 16, TTL: 300, data: '"v=DMARC1; p=none"' }] };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/health') return res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(health));
    res.writeHead(200, { 'content-type': 'application/dns-json' }).end(JSON.stringify({ Status: 0, Answer: dmarc[url.searchParams.get('name')] ?? [] }));
  });
  await new Promise((r) => server.listen(0, r));
  const base = `http://localhost:${server.address().port}`;
  process.env.FOHM_DOH_URL = `${base}/dns-query`;
  try {
    const live = (domain) => {
      const dir = path.join(tmp(), domain);
      newApp({ name: 'Tide', domain }, { dir, git: false });
      const statePath = path.join(dir, '.fohm', 'state.json');
      const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
      state.values.vercel = base;
      fs.writeFileSync(statePath, JSON.stringify(state));
      return dir;
    };
    const dir = live('tidepool.app');
    assert.equal(overview(dir).steps.find((s) => s.id === 'tapp').who, 'both', 'the person brings the account and keys; the agent builds');
    assert.equal(overview(dir).steps.find((s) => s.id === 'tapp').optional, true);
    assert.equal((await check(dir, 'tapp')).results[0].ok, true);
    const good = (await check(dir, 'email')).results[0];
    assert.equal(good.ok, true);
    assert.match(good.detail, /v=DMARC1; p=none/);
    const bare = (await check(live('nodmarc.app'), 'email')).results[0];
    assert.equal(bare.ok, false);
    assert.match(bare.detail, /_dmarc\.nodmarc\.app/);
    health.integrations.tapp = null;
    assert.match((await check(dir, 'tapp')).results[0].detail, /TAPP_AUTH_TOKEN/);
    assert.ok(linesFor(stepById('email'), null).some((l) => /DMARC/.test(l)) && linesFor(stepById('email'), null).some((l) => /smtp\.resend\.com/.test(l)));
  } finally {
    delete process.env.FOHM_DOH_URL;
    server.close();
  }
});
