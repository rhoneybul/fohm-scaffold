/**
 * The launch check (scripts/launch-check.mjs): every item's status from the
 * services' answers, "not checked" where a token isn't set, and never a
 * secret's value in what it prints. Every request is answered by a fake
 * fetch; nothing leaves the machine.
 */
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import * as launchScript from '../scripts/launch-check.mjs';

// The script is plain JavaScript; its results are read loosely here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const check = launchScript as any;
type Item = { group: string; name: string; status: string; detail: string; fix: string; required: boolean; warn: boolean };

const SECRET = 'sk_live_FAKE_SECRET_7f3a9c1e';
const NOW = Date.parse('2026-11-25T12:00:00Z');
const inDays = (d: number) => new Date(NOW + d * 86_400_000).toISOString();
const realFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = realFetch; });

type Call = { method: string; url: string; body?: { query?: string } };
/** Answers each request from `routes`: the first whose url part (and, for Expo, query part) matches. */
function fake(routes: [string, unknown][]) {
  const calls: Call[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    calls.push({ method, url, body });
    const hit = routes.find(([key]) => {
      const [m, part, ...rest] = key.split(' ');
      const query = rest.join(' ');
      return m === method && url.includes(part) && (!query || String(body?.query ?? '').includes(query));
    });
    if (!hit) return new Response('not found', { status: 404 });
    if (hit[1] instanceof Error) throw hit[1];
    return new Response(JSON.stringify(hit[1]), { status: 200 });
  }) as typeof fetch;
  return calls;
}

/** An app on disk, as the template makes one, with what each test changes. */
function appDir({ google = true, toFill = false, shots = true, apple = true, ascAppId = '6700000000' } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'launch-'));
  mkdirSync(path.join(dir, 'src/lib'), { recursive: true });
  writeFileSync(path.join(dir, 'app.json'), JSON.stringify({ expo: {
    name: 'Trail', slug: 'trail', scheme: 'trail', owner: 'someone',
    ios: { bundleIdentifier: 'com.trail.app', supportsTablet: false, usesAppleSignIn: apple },
    android: { package: 'com.trail.app' },
    plugins: ['expo-router', 'expo-notifications'],
    extra: { apiUrl: 'https://trail.app', eas: { projectId: 'proj-1' } },
  } }));
  writeFileSync(path.join(dir, 'eas.json'), JSON.stringify({ submit: { production: { ios: { appleTeamId: 'TEAM123', ...(ascAppId ? { ascAppId } : {}) } } } }));
  const file = 'store/apple/screenshot/en-US/APP_IPHONE_67/01-home.png';
  if (shots) { mkdirSync(path.join(dir, path.dirname(file)), { recursive: true }); writeFileSync(path.join(dir, file), ''); }
  writeFileSync(path.join(dir, 'store.config.json'), JSON.stringify({ apple: {
    info: { 'en-US': { title: 'Trail', subtitle: toFill ? 'TO FILL: up to 30 characters' : 'Walk further', screenshots: { APP_IPHONE_67: [file] } } },
    review: { firstName: 'Ann', phone: toFill ? 'TO FILL: +44 and the number' : '+44 20 0000 0000' },
  } }));
  writeFileSync(path.join(dir, 'src/lib/brand.ts'), `export const APP = {\n  routes: false,\n  google: { webClientId: '${google ? 'web-1.apps.googleusercontent.com' : ''}', iosClientId: '${google ? 'ios-1.apps.googleusercontent.com' : ''}' },\n};\n`);
  return dir;
}

const TOKENS = { REPO_ADMIN_TOKEN: 't', GITHUB_REPOSITORY: 'o/trail', SUPABASE_ACCESS_TOKEN: 't', SUPABASE_PROJECT_REF: 'ref1', VERCEL_TOKEN: 't', VERCEL_TEAM: 'team_1', EXPO_TOKEN: 't' };

/** Every service answering as for an app that is ready, with a secret tucked into each answer it could hide in. */
function allGood({ profileExpires = inDays(200), health = true as boolean | Error } = {}): [string, unknown][] {
  return [
    ['GET api.github.com/repos/o/trail/rulesets', [{ name: 'main — rebase only, linear history', target: 'branch' }]],
    ['GET api.github.com/repos/o/trail', { allow_rebase_merge: true, allow_merge_commit: false, allow_squash_merge: false, secret_scanning_token: SECRET }],
    ['GET /v1/projects/ref1/config/auth', {
      site_url: 'https://trail.app', uri_allow_list: 'https://trail.app/**,trail://**',
      external_apple_enabled: true, external_apple_client_id: 'com.trail.app', external_apple_secret: SECRET,
      external_google_enabled: true, external_google_client_id: 'web-1.apps.googleusercontent.com,ios-1.apps.googleusercontent.com', external_google_secret: SECRET,
      smtp_pass: SECRET,
    }],
    ['GET /v1/projects', [{ id: 'ref1', name: 'Trail', status: 'ACTIVE_HEALTHY' }]],
    ['GET /v9/projects/trail/env', { envs: [
      { key: 'SUPABASE_DB_URL', value: SECRET, target: ['production', 'preview'] },
      { key: 'SUPABASE_PUBLISHABLE_KEY', value: SECRET, target: ['production'] },
      { key: 'OWNER_EMAIL', value: SECRET, target: ['production'] },
      { key: 'SENTRY_DSN', value: SECRET, target: ['production'] },
    ] }],
    ['GET /v9/projects/trail', { id: 'trail', name: 'trail', rootDirectory: null, env: [{ key: 'X', value: SECRET }] }],
    ['GET /v1/env', { data: [{ id: 'e1', key: 'ANTHROPIC_API_KEY', value: SECRET, projectId: ['trail'] }, { id: 'e2', key: 'RESEND_API_KEY', value: SECRET, projectId: [] }, { id: 'e3', key: 'SLACK_WEBHOOK_URL', value: SECRET, projectId: ['trail'] }] }],
    ['GET trail.app/api/health', health instanceof Error ? health : health
      ? { db: 'ok', migration: '20260101000009', auth: { url: 'https://ref1.supabase.co', key: 'sb_publishable_x' }, integrations: { sentry: { dsn: 'https://pub@sentry.io/1' }, posthog: { key: SECRET }, email: false, billing: null, ai: true, tapp: null, maps: null } }
      : { db: 'off', migration: null, auth: null, integrations: {} }],
    ['POST api.expo.dev byFullName(fullName: $f) { id }', { data: { app: { byFullName: { id: 'proj-1' } } } }],
    ['POST api.expo.dev appStoreConnectApiKeysPaginated', { data: { account: { byName: {
      appStoreConnectApiKeysPaginated: { edges: [{ node: { id: 'k1', keyIdentifier: 'KEY1', keyP8: SECRET, appleTeam: { appleTeamIdentifier: 'TEAM123' } } }] },
      environmentVariables: [
        { name: 'EXPO_ASC_API_KEY_PATH', environments: ['PRODUCTION'], visibility: 'SECRET', type: 'FILE_BASE64', value: SECRET },
        { name: 'EXPO_ASC_KEY_ID', environments: ['PRODUCTION'], visibility: 'SECRET', type: 'STRING' },
        { name: 'EXPO_ASC_ISSUER_ID', environments: ['PRODUCTION'], visibility: 'SECRET', type: 'STRING' },
      ],
    } } } }],
    ['POST api.expo.dev iosAppCredentials', { data: { app: { byFullName: {
      iosAppCredentials: [{
        appleAppIdentifier: { bundleIdentifier: 'com.trail.app' },
        appStoreConnectApiKeyForSubmissions: { keyIdentifier: 'KEY1', keyP8: SECRET },
        iosAppBuildCredentialsList: [{ iosDistributionType: 'APP_STORE', distributionCertificate: { validityNotAfter: inDays(300), certificateP12: SECRET }, provisioningProfile: { expiration: profileExpires, status: 'ACTIVE' } }],
      }],
      androidAppCredentials: [],
    } } } }],
  ];
}

/** The item by its name, or by "Group: name" where several groups have one of that name. */
const byName = (items: Item[], name: string) => {
  const hit = items.find((i) => i.name === name || `${i.group}: ${i.name}` === name);
  assert.ok(hit, `an item named ${name}`);
  return hit!;
};

test('an app with every account set up: every required item done, and the check passes', async () => {
  fake(allGood());
  const result = await check.launchCheck({ appDir: appDir(), env: TOKENS, now: NOW });
  const missing = result.items.filter((i: Item) => i.status === check.MISSING);
  assert.deepEqual(missing.map((i: Item) => i.name), ['Shared RESEND_API_KEY'], 'only the shared key on the team but not linked');
  assert.equal(missing[0].required, false);
  assert.equal(result.ok, true);
  for (const name of ['The ruleset on main', 'Merge buttons: rebase only', 'The project', 'Site URL', 'Redirect URLs', 'Sign in with Apple', 'Continue with Google', 'SUPABASE_DB_URL', 'OWNER_EMAIL or OWNER_CODE', 'The database', 'iOS distribution certificate', 'iOS provisioning profile', 'App Store Connect key for submissions', 'EXPO_ASC_KEY_ID', 'eas.json ascAppId', 'store.config.json filled in', 'Screenshots: iPhone 6.9-inch', 'APP.google client IDs', 'The iOS URL scheme'])
    assert.equal(byName(result.items, name).status, check.DONE, name);
  assert.equal(byName(result.items, 'Continue with Google').detail, 'on, 2 client IDs, secret present');
  assert.equal(byName(result.items, 'Errors (Sentry)').status, check.DONE, 'on in /api/health');
  assert.equal(byName(result.items, 'Payments (Stripe)').status, check.OFF);
  assert.equal(byName(result.items, 'Shared SLACK_WEBHOOK_URL').status, check.DONE, 'the business’s one Slack channel, linked from the team');
  assert.equal(byName(result.items, 'The team’s Slack pings').status, check.OFF, 'off in /api/health until a redeploy');
  assert.equal(byName(result.items, 'Android keystore').status, check.OFF, 'no Android build yet is optional');
  assert.ok(!result.items.some((i: Item) => i.name === 'Maps (Mapbox)'), 'Mapbox only with APP.routes');
  assert.ok(!result.items.some((i: Item) => i.name.startsWith('Screenshots: iPad')), 'no iPad screenshots for an iPhone-only app');
});

test('never a secret value in the checklist or its JSON, and never one asked of Expo', async () => {
  const calls = fake(allGood());
  const result = await check.launchCheck({ appDir: appDir(), env: TOKENS, now: NOW });
  assert.ok(!check.format(result).includes(SECRET), 'the text');
  assert.ok(!JSON.stringify(result).includes(SECRET), 'the JSON');
  for (const c of calls.filter((x) => x.url.includes('expo.dev'))) {
    assert.doesNotMatch(c.body!.query!, /keyP8|keyJson|\bkeystore\b|keystorePassword|keyPassword|certificateP12|\bvalue\b/, 'only names, ids, dates and statuses');
  }
  assert.ok(calls.every((c) => c.method === 'GET' || c.url.includes('graphql')), 'it only reads');
  assert.ok(!calls.some((c) => c.body?.query?.includes('mutation')), 'no Expo mutation');
});

test('without tokens every service is "not checked", and the local files are still read', async () => {
  fake([['GET trail.app/api/health', new TypeError('fetch failed')]]);
  const result = await check.launchCheck({ appDir: appDir({ toFill: true, shots: false, ascAppId: '' }), env: {}, now: NOW });
  for (const group of ['GitHub', 'Supabase', 'Vercel', 'Expo'])
    assert.ok(result.items.filter((i: Item) => i.group === group).every((i: Item) => i.status === check.NOT_CHECKED), group);
  assert.match(byName(result.items, 'The project').detail, /no SUPABASE_ACCESS_TOKEN/);
  assert.equal(byName(result.items, '/api/health').status, check.NOT_CHECKED, 'a site this network can\'t reach is not a finding');
  const fill = byName(result.items, 'store.config.json filled in');
  assert.equal(fill.status, check.MISSING);
  assert.match(fill.detail, /info\.en-US\.subtitle, review\.phone/);
  assert.equal(byName(result.items, 'Screenshots: iPhone 6.9-inch').status, check.MISSING);
  assert.equal(byName(result.items, 'eas.json ascAppId').status, check.MISSING);
  assert.equal(result.ok, false);
  const text = check.format(result);
  assert.match(text, /GitHub\n {2}not checked +The ruleset on main, Merge buttons: rebase only: no REPO_ADMIN_TOKEN/, 'a group nobody could read is one line');
  assert.match(text, /Fix: .*\(the app-launch skill's reference\/app-review\.md\)/);
});

test('missing items say what is missing and how to fix it', async () => {
  const routes = allGood({ health: false });
  routes[2] = ['GET /v1/projects/ref1/config/auth', { site_url: 'http://localhost:3000', uri_allow_list: 'https://trail.app/**', external_apple_enabled: false, external_google_enabled: true, external_google_client_id: 'web-1.apps.googleusercontent.com', external_google_secret: '' }];
  routes[4] = ['GET /v9/projects/trail/env', { envs: [{ key: 'SUPABASE_PUBLISHABLE_KEY', target: ['production'] }, { key: 'SUPABASE_DB_URL', target: ['preview'] }] }];
  fake(routes);
  const { items, ok } = await check.launchCheck({ appDir: appDir(), env: TOKENS, now: NOW });
  assert.equal(ok, false);
  const site = byName(items, 'Site URL');
  assert.equal(site.status, check.MISSING);
  assert.match(site.fix, /https:\/\/trail\.app/);
  assert.match(byName(items, 'Redirect URLs').detail, /trail:\/\/\*\*/);
  assert.equal(byName(items, 'Sign in with Apple').status, check.MISSING);
  const google = byName(items, 'Continue with Google');
  assert.equal(google.status, check.MISSING);
  assert.match(google.detail, /the iOS client ID, no client secret/);
  assert.match(google.fix, /never in the chat/);
  assert.equal(byName(items, 'SUPABASE_DB_URL').status, check.MISSING, 'a preview-only variable isn\'t production\'s');
  assert.equal(byName(items, 'OWNER_EMAIL or OWNER_CODE').status, check.MISSING);
  assert.equal(byName(items, 'The database').status, check.MISSING);
  assert.equal(byName(items, 'Sign-in (Supabase Auth)').status, check.MISSING);
});

test('credentials close to expiry are flagged; expired ones are missing', async () => {
  fake(allGood({ profileExpires: inDays(12) }));
  let items = (await check.launchCheck({ appDir: appDir(), env: TOKENS, now: NOW })).items;
  const soon = byName(items, 'iOS provisioning profile');
  assert.equal(soon.status, check.DONE);
  assert.equal(soon.warn, true);
  assert.match(soon.detail, /in 12 days\): renew soon/);
  fake(allGood({ profileExpires: inDays(-3) }));
  items = (await check.launchCheck({ appDir: appDir(), env: TOKENS, now: NOW })).items;
  assert.equal(byName(items, 'iOS provisioning profile').status, check.MISSING);
});

test('Expo: a project id that differs from app.json, no iOS credentials and no App Store Connect variables', async () => {
  const routes = allGood();
  routes[8] = ['POST api.expo.dev byFullName(fullName: $f) { id }', { data: { app: { byFullName: { id: 'proj-2' } } } }];
  routes[9] = ['POST api.expo.dev appStoreConnectApiKeysPaginated', { data: { account: { byName: { appStoreConnectApiKeysPaginated: { edges: [] }, environmentVariables: [{ name: 'EXPO_ASC_KEY_ID', environments: ['PREVIEW'], visibility: 'PUBLIC' }] } } } }];
  routes[10] = ['POST api.expo.dev iosAppCredentials', { data: { app: { byFullName: { iosAppCredentials: [], androidAppCredentials: [{ applicationIdentifier: 'com.trail.app', androidAppBuildCredentialsList: [{ androidKeystore: { id: 'ks' } }] }] } } } }];
  fake(routes);
  const { items } = await check.launchCheck({ appDir: appDir(), env: TOKENS, now: NOW });
  assert.match(byName(items, 'Expo: The project').fix ?? '', /proj-2/);
  for (const name of ['App Store Connect key on the account', 'EXPO_ASC_KEY_ID', 'iOS distribution certificate', 'iOS provisioning profile', 'App Store Connect key for submissions'])
    assert.equal(byName(items, name).status, check.MISSING, name);
  const play = byName(items, 'Play submission key');
  assert.equal(play.status, check.MISSING, 'once there is an Android build, the Play key is needed');
  assert.equal(play.required, true);
});

test('Google sign-in off, Apple sign-in off: optional, and the capability is missing', async () => {
  fake([]);
  const { items } = await check.launchCheck({ appDir: appDir({ google: false, apple: false }), env: {}, now: NOW });
  assert.equal(byName(items, 'APP.google client IDs').status, check.OFF);
  assert.equal(byName(items, 'Sign in with Apple (ios.usesAppleSignIn)').status, check.MISSING);
  assert.match(byName(items, 'Sign in with Apple (ios.usesAppleSignIn)').fix, /Provisioning Profile: Delete/);
});

test('the summary counts each status', () => {
  const items = [
    { status: 'done', required: true }, { status: 'missing', required: true }, { status: 'missing', required: false },
    { status: 'not checked', required: true }, { status: 'optional, off', required: false },
  ];
  assert.equal(check.summaryLine(items), '1 done, 2 missing (1 required), 1 not checked, 1 optional and off.');
  assert.deepEqual(check.toFill({ a: 'x', b: { c: 'TO FILL: y' }, d: ['TO FILL'] }), ['b.c', 'd']);
});

test('Doppler: each name, the shared project and the sync, read by name only', async () => {
  const routes: [string, unknown][] = [
    ['GET names?project=trail', { names: ['ANTHROPIC_API_KEY', 'SLACK_WEBHOOK_URL'] }],
    ['GET names?project=shared', { names: ['SLACK_WEBHOOK_URL', 'RESEND_API_KEY'] }],
    ['GET api.doppler.com/v3/integrations', { integrations: [{ slug: 'i1', type: 'vercel', enabled: true, syncs: [{ project: 'trail', config: 'prd', description: 'trail / Production / Secret', enabled: true, status: 'synced', lastSyncedAt: '2026-11-25T15:46:56Z' }] }] }],
    ...allGood(),
  ];
  const calls = fake(routes);
  const { items } = await check.launchCheck({ appDir: appDir(), env: { ...TOKENS, DOPPLER_TOKEN: 't' }, now: NOW });
  const doppler = items.filter((i: Item) => i.group === 'Doppler');
  assert.equal(byName(items, 'The trail project').status, check.DONE);
  const own = byName(items, 'ANTHROPIC_API_KEY (the app\'s own)');
  assert.equal(own.status, check.DONE);
  assert.match(own.detail, /can't be read without reading the value/, 'says a value can\'t be checked');
  assert.equal(byName(items, 'Reference to shared SLACK_WEBHOOK_URL').status, check.DONE);
  const lacking = byName(items, 'Reference to shared RESEND_API_KEY');
  assert.equal(lacking.status, check.MISSING);
  assert.match(lacking.fix, /\$\{shared\.prd\.RESEND_API_KEY\}/);
  assert.match(byName(items, 'Shared keys in shared').detail, /SLACK_WEBHOOK_URL, RESEND_API_KEY/);
  assert.match(byName(items, 'The sync to Vercel').detail, /synced, last synced 2026-11-25T15:46:56Z/);
  assert.ok(doppler.every((i: Item) => !i.required), 'optional: the Vercel team\'s shared variables are the fallback');
  assert.equal(byName(items, 'Shared RESEND_API_KEY').status, check.MISSING, 'linked from neither the team nor Doppler');
  const dopplerCalls = calls.filter((c) => c.url.includes('doppler.com'));
  assert.ok(dopplerCalls.length >= 3 && dopplerCalls.every((c) => c.method === 'GET'), 'it only reads');
  assert.ok(!dopplerCalls.some((c) => /\/secrets?(\?|\/download|$)/.test(c.url)), 'never an endpoint that answers with values');
});

test('Doppler: no project and no sync are missing with their fix; no token is off', async () => {
  fake([['GET names?project=shared', { names: [] }], ['GET api.doppler.com/v3/integrations', { integrations: [] }]]);
  let items = (await check.launchCheck({ appDir: appDir(), env: { DOPPLER_TOKEN: 't' }, now: NOW })).items;
  assert.equal(byName(items, 'The trail project').status, check.MISSING);
  assert.match(byName(items, 'The trail project').fix, /Set up app/);
  assert.match(byName(items, 'The sync to Vercel').fix, /Integrations → Vercel/);
  fake([]);
  items = (await check.launchCheck({ appDir: appDir(), env: {}, now: NOW })).items;
  assert.equal(byName(items, 'Doppler').status, check.OFF);
});
