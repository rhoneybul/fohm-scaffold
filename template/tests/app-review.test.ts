/**
 * Submit for review (scripts/app-review.mjs): the token, the decisions, the
 * listing's checks, and a whole run against a fake App Store Connect that
 * keeps state, so a second run is seen to change nothing. Nothing leaves the
 * machine; no real key is used.
 */
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import * as reviewScript from '../scripts/app-review.mjs';
import { lastReleased, parseArgs as parseReviewArgs } from '../scripts/review';

// The script is plain JavaScript; its exports are read loosely here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const r = reviewScript as any;
const realFetch = globalThis.fetch;
const realLog = console.log;
afterEach(() => {
  globalThis.fetch = realFetch;
  console.log = realLog;
});
const quiet = () => (console.log = () => undefined);

test('the token is an ES256 JWT Apple can verify, for 20 minutes', () => {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  const token = r.ascToken({ keyP8: privateKey.export({ type: 'pkcs8', format: 'pem' }), keyId: 'KEY123', issuerId: 'iss-1', now: 1000 });
  const [head, body, sig] = token.split('.');
  assert.deepEqual(JSON.parse(Buffer.from(head, 'base64url').toString()), { alg: 'ES256', kid: 'KEY123', typ: 'JWT' });
  assert.deepEqual(JSON.parse(Buffer.from(body, 'base64url').toString()), { iss: 'iss-1', iat: 1000, exp: 2200, aud: 'appstoreconnect-v1' });
  assert.ok(verify('sha256', Buffer.from(`${head}.${body}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(sig, 'base64url')));
});

test('the key comes from the file variable or the text one, and what is missing is named, never shown', () => {
  assert.deepEqual(r.keyFromEnv({ EXPO_ASC_API_KEY_PATH: '/k.p8', EXPO_ASC_KEY_ID: 'K', EXPO_ASC_ISSUER_ID: 'I' }, () => 'PEM'), { keyP8: 'PEM', keyId: 'K', issuerId: 'I' });
  assert.equal(r.keyFromEnv({ ASC_KEY_P8: 'a\\nb', EXPO_ASC_KEY_ID: 'K', EXPO_ASC_ISSUER_ID: 'I' }).keyP8, 'a\nb');
  assert.throws(() => r.keyFromEnv({ ASC_KEY_P8: 'secret' }), (e: Error) => /EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID/.test(e.message) && !e.message.includes('secret'));
});

const version = (id: string, versionString: string, state: string) => ({ id, attributes: { versionString, appVersionState: state } });

test('the version: used, renamed from the one editable, created, or left while another is in review', () => {
  assert.deepEqual(r.planVersion([version('1', '1.0.0', 'PREPARE_FOR_SUBMISSION')], '1.0.0'), { action: 'use', id: '1', state: 'PREPARE_FOR_SUBMISSION' });
  assert.deepEqual(r.planVersion([version('1', '1.0.0', 'PREPARE_FOR_SUBMISSION')], '1.0.1'), { action: 'rename', id: '1', from: '1.0.0' });
  assert.deepEqual(r.planVersion([version('1', '1.0.0', 'READY_FOR_DISTRIBUTION')], '1.1.0'), { action: 'create' });
  assert.equal(r.planVersion([version('1', '1.0.0', 'WAITING_FOR_REVIEW')], '1.0.0').action, 'in-review');
  assert.equal(r.planVersion([version('1', '1.0.0', 'READY_FOR_DISTRIBUTION')], '1.0.0').action, 'released');
  assert.match(r.planVersion([version('1', '1.0.0', 'IN_REVIEW')], '1.0.1').reason, /one version at a time/);
});

const build = (id: string, number: string, processingState: string, uploadedDate: string, extra = {}) => ({ id, attributes: { version: number, processingState, uploadedDate, expired: false, ...extra } });

test('the build: the newest that Apple has processed, wait while it processes, never a failed or expired one', () => {
  assert.equal(r.chooseBuild([build('a', '2', 'VALID', '2026-11-01'), build('b', '3', 'VALID', '2026-11-02')]).build.id, 'b');
  assert.equal(r.chooseBuild([build('a', '2', 'VALID', '2026-11-01'), build('b', '3', 'PROCESSING', '2026-11-02')]).waiting.id, 'b');
  assert.equal(r.chooseBuild([build('a', '2', 'VALID', '2026-11-01'), build('b', '3', 'FAILED', '2026-11-02'), build('c', '4', 'VALID', '2026-11-03', { expired: true })]).build.id, 'a');
  assert.deepEqual(r.chooseBuild([]), { none: true });
});

test('the submission: done when sent with this version, an open draft reused, or a new one', () => {
  const s = (id: string, state: string) => ({ id, attributes: { state } });
  assert.equal(r.planSubmission([s('x', 'WAITING_FOR_REVIEW')], () => true).action, 'done');
  assert.deepEqual(r.planSubmission([s('x', 'COMPLETE'), s('y', 'READY_FOR_REVIEW')], () => false), { action: 'reuse', id: 'y', hasItem: false });
  assert.equal(r.planSubmission([s('x', 'COMPLETE')], () => false).action, 'create');
});

test('Apple’s refusals become what to do, the nested ones too', () => {
  const said = r.explainAppleErrors([
    { code: 'STATE_ERROR.ENTITY_STATE_INVALID', detail: 'The submission has errors', meta: { associatedErrors: { '/v1/apps/1': [{ code: 'ENTITY_ERROR', detail: 'You must provide answers to the app privacy questions (appDataUsages).' }] } } },
    { code: 'FORBIDDEN.REQUIRED_AGREEMENTS_MISSING_OR_EXPIRED', detail: 'A required agreement is missing or has expired.' },
  ]);
  assert.ok(said.some((s: string) => /App Privacy/.test(s)));
  assert.ok(said.some((s: string) => /Business/.test(s)));
  assert.ok(said.some((s: string) => /Apple says: The submission has errors/.test(s)));
});

const goodListing = () => ({
  configVersion: 0,
  apple: {
    copyright: '2026 Someone Ltd',
    info: { 'en-US': { title: 'Name', subtitle: 'Short', description: 'A description long enough.', keywords: ['a', 'b'], supportUrl: 'https://x.app', privacyPolicyUrl: 'https://x.app/privacy', screenshots: { APP_IPHONE_67: ['package.json'] } } },
    review: { firstName: 'A', lastName: 'B', email: 'a@x.app', phone: '+44 20 7946 0000' },
  },
});

test('the listing: placeholders, Apple’s lengths, screenshots and the contact are checked before anything is pushed', () => {
  const root = path.join(import.meta.dirname, '..');
  assert.deepEqual(r.listingProblems(goodListing(), root), []);
  const bad = goodListing();
  Object.assign(bad.apple.info['en-US'], { subtitle: 'A subtitle far longer than Apple allows', keywords: ['x'.repeat(101)], screenshots: { APP_IPHONE_67: ['missing.png'] }, description: 'TO FILL: words' });
  bad.apple.review.phone = '020 7946';
  const problems = r.listingProblems(bad, root).join('\n');
  for (const p of [/placeholder/, /subtitle/, /keywords/, /missing\.png/, /phone/]) assert.match(problems, p);
  assert.equal(r.withVersion(goodListing(), '1.2.0').apple.version, '1.2.0');
});

test('the template’s listing holds to the brand, and refuses to go to Apple until its placeholders are written', async () => {
  const root = path.join(import.meta.dirname, '..');
  const config = JSON.parse(readFileSync(path.join(root, 'store.config.json'), 'utf8'));
  const { APP } = await import('../src/lib/brand');
  const info = config.apple.info['en-US'];
  assert.equal(info.title, APP.name);
  assert.ok(config.apple.copyright.endsWith(APP.operator), 'the copyright is the operator’s');
  assert.equal(config.apple.review.email, APP.supportEmail);
  assert.match(info.privacyPolicyUrl, /\/privacy$/);
  assert.equal(config.apple.advisory.messagingAndChat, APP.coach, 'chat with a coach only when there is one');
  if (JSON.stringify(config).includes('TO FILL')) assert.ok(r.listingProblems(config, root).length > 0);
});

/** A fake App Store Connect that keeps what it's told, and records every write. */
function fakeApple(start: { priced?: boolean; available?: boolean; versions?: ReturnType<typeof version>[]; builds?: ReturnType<typeof build>[]; contentRights?: string } = {}) {
  const state = {
    priced: start.priced ?? false,
    available: start.available ?? false,
    contentRights: start.contentRights ?? null,
    versions: start.versions ?? [],
    builds: start.builds ?? [build('b1', '3', 'VALID', '2026-11-20', { usesNonExemptEncryption: false })],
    versionBuild: {} as Record<string, string>,
    submissions: [] as { id: string; attributes: { state: string }; items: string[] }[],
  };
  const writes: string[] = [];
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
  globalThis.fetch = (async (input: string, init: RequestInit = {}) => {
    const url = new URL(input);
    const p = url.pathname;
    const method = init.method ?? 'GET';
    const body = typeof init.body === 'string' ? JSON.parse(init.body) : undefined;
    if (method !== 'GET') writes.push(`${method} ${p}`);
    if (method === 'GET' && p === '/v1/apps/app1') return json({ data: { id: 'app1', attributes: { name: 'Starter', bundleId: 'com.example.starter', primaryLocale: 'en-US', contentRightsDeclaration: state.contentRights } } });
    if (method === 'PATCH' && p === '/v1/apps/app1') return (state.contentRights = body.data.attributes.contentRightsDeclaration), json({});
    if (p === '/v1/apps/app1/appPriceSchedule') return state.priced ? json({ data: { id: 'ps1' } }) : json({ errors: [] }, 404);
    if (p === '/v1/appPriceSchedules/ps1/manualPrices') return json({ data: [{ id: 'p' }], included: [{ type: 'appPricePoints', id: 'pp0', attributes: { customerPrice: '0.0' } }] });
    if (p === '/v1/apps/app1/appPricePoints') return json({ data: [{ id: 'pp1', attributes: { customerPrice: '0.99' } }, { id: 'pp0', attributes: { customerPrice: '0.0' } }] });
    if (method === 'POST' && p === '/v1/appPriceSchedules') {
      assert.equal(body.included[0].relationships.appPricePoint.data.id, 'pp0', 'the free point');
      assert.equal(body.data.relationships.baseTerritory.data.id, 'GBR');
      return (state.priced = true), json({ data: { id: 'ps1' } }, 201);
    }
    if (p === '/v1/apps/app1/appAvailabilityV2') return state.available ? json({ data: { id: 'av1' } }) : json({ errors: [] }, 404);
    if (p === '/v1/territories') return json({ data: [{ id: 'GBR' }, { id: 'USA' }] });
    if (method === 'POST' && p === '/v2/appAvailabilities') {
      assert.equal(body.included.length, 2);
      return (state.available = true), json({ data: { id: 'av1' } }, 201);
    }
    if (p === '/v1/apps/app1/appStoreVersions') return json({ data: state.versions });
    if (method === 'POST' && p === '/v1/appStoreVersions') {
      const v = version(`v${state.versions.length + 1}`, body.data.attributes.versionString, 'PREPARE_FOR_SUBMISSION');
      state.versions.push(v);
      return json({ data: v }, 201);
    }
    if (method === 'PATCH' && /^\/v1\/appStoreVersions\/[^/]+$/.test(p)) {
      state.versions.find((v) => v.id === body.data.id)!.attributes.versionString = body.data.attributes.versionString;
      return json({});
    }
    if (p === '/v1/builds') return json({ data: state.builds });
    if (method === 'PATCH' && p.startsWith('/v1/builds/')) return (state.builds[0].attributes = { ...state.builds[0].attributes, ...body.data.attributes }), json({});
    const rel = /^\/v1\/appStoreVersions\/([^/]+)\/relationships\/build$/.exec(p);
    if (rel) return method === 'GET' ? json({ data: state.versionBuild[rel[1]] ? { type: 'builds', id: state.versionBuild[rel[1]] } : null }) : ((state.versionBuild[rel[1]] = body.data.id), json({}));
    if (/appStoreVersionLocalizations$/.test(p)) return json({ data: [{ id: 'loc1', attributes: { locale: 'en-US', description: 'd', keywords: 'k', supportUrl: 'https://x' } }] });
    if (p === '/v1/appStoreVersionLocalizations/loc1/appScreenshotSets') return json({ data: [{ attributes: { screenshotDisplayType: 'APP_IPHONE_67' } }, { attributes: { screenshotDisplayType: 'APP_IPAD_PRO_3GEN_129' } }] });
    if (/appStoreReviewDetail$/.test(p)) return json({ data: { attributes: { contactEmail: 'a@x', contactPhone: '+44 1' } } });
    if (p === '/v1/reviewSubmissions' && method === 'GET') return json({ data: state.submissions });
    if (p === '/v1/reviewSubmissions' && method === 'POST') {
      const s = { id: `s${state.submissions.length + 1}`, attributes: { state: 'READY_FOR_REVIEW' }, items: [] as string[] };
      state.submissions.push(s);
      return json({ data: s }, 201);
    }
    const items = /^\/v1\/reviewSubmissions\/([^/]+)\/items$/.exec(p);
    if (items) return json({ data: state.submissions.find((s) => s.id === items[1])!.items.map((v) => ({ relationships: { appStoreVersion: { data: { id: v } } } })) });
    if (method === 'POST' && p === '/v1/reviewSubmissionItems') {
      state.submissions.find((s) => s.id === body.data.relationships.reviewSubmission.data.id)!.items.push(body.data.relationships.appStoreVersion.data.id);
      return json({}, 201);
    }
    const sub = /^\/v1\/reviewSubmissions\/([^/]+)$/.exec(p);
    if (sub && method === 'PATCH') return (state.submissions.find((s) => s.id === sub[1])!.attributes.state = 'WAITING_FOR_REVIEW'), json({});
    return json({ errors: [{ detail: `no fake for ${method} ${p}` }] }, 500);
  }) as typeof fetch;
  return { state, writes };
}

const args = { token: 't', appId: 'app1', bundleId: 'com.example.starter', version: '1.0.0', tablet: true, wait: async () => undefined };

test('a first run sets the price, availability, content rights, version and build, and stops short without submit', async () => {
  quiet();
  const { state, writes } = fakeApple();
  const out = await r.review(args);
  assert.equal(out.submitted, false);
  assert.deepEqual(out.missing, []);
  assert.ok(state.priced && state.available);
  assert.equal(state.contentRights, 'USES_THIRD_PARTY_CONTENT');
  assert.equal(state.versionBuild.v1, 'b1');
  assert.ok(!writes.some((w) => w.includes('reviewSubmission')), 'nothing sent to review without submit');
});

test('a second run changes nothing, and submit sends it once', async () => {
  quiet();
  const { state, writes } = fakeApple();
  await r.review(args);
  const before = writes.length;
  const again = await r.review(args);
  assert.deepEqual(again.changes, []);
  assert.equal(writes.length, before, 'no write the second time');
  const sent = await r.review({ ...args, submit: true });
  assert.equal(sent.submitted, true);
  assert.equal(state.submissions[0].attributes.state, 'WAITING_FOR_REVIEW');
  const count = writes.length;
  const third = await r.review({ ...args, submit: true });
  assert.equal(third.submitted, true);
  assert.equal(writes.length, count, 'in review already: nothing more sent');
});

test('a price already set is left alone, an editable version renamed, and a build still processing waited for', async () => {
  quiet();
  const processing = build('b2', '4', 'PROCESSING', '2026-11-21', { usesNonExemptEncryption: null });
  const { state, writes } = fakeApple({ priced: true, available: true, contentRights: 'DOES_NOT_USE_THIRD_PARTY_CONTENT', versions: [version('v9', '0.9.0', 'PREPARE_FOR_SUBMISSION')], builds: [processing] });
  let waits = 0;
  const out = await r.review({ ...args, wait: async () => void (waits++, (processing.attributes.processingState = 'VALID')) });
  assert.equal(waits, 1);
  assert.equal(state.versions[0].attributes.versionString, '1.0.0');
  assert.equal(state.versionBuild.v9, 'b2');
  assert.equal((processing.attributes as { usesNonExemptEncryption?: boolean | null }).usesNonExemptEncryption, false, 'export compliance answered on a build that had none');
  assert.ok(!writes.some((w) => /appPriceSchedules|appAvailabilities|PATCH \/v1\/apps\//.test(w)));
  assert.ok(out.changes.some((c: string) => /renamed/.test(c)));
});

test('no build of the version is said plainly, with what to do', async () => {
  quiet();
  fakeApple({ builds: [] });
  await assert.rejects(r.review(args), /No build of 1\.0\.0.*release\.ts/);
});

test('review.ts: the last version released, from the tags and Expo’s builds, and its command line', () => {
  assert.equal(lastReleased({ tags: ['app-v1.0.0', 'app-v1.2.0'], prefix: 'app-', built: ['1.1.0'] }), '1.2.0');
  assert.equal(lastReleased({ tags: [], prefix: 'app-', built: ['1.0.3'] }), '1.0.3');
  assert.equal(lastReleased({ tags: [], prefix: 'app-', built: [] }), null);
  assert.deepEqual(parseReviewArgs([]), { version: undefined, ref: 'HEAD', submit: false, dryRun: false });
  assert.deepEqual(parseReviewArgs(['1.2.0', '--submit']), { version: '1.2.0', ref: 'HEAD', submit: true, dryRun: false });
  assert.deepEqual(parseReviewArgs(['--ref', 'abc', '--dry-run']), { version: undefined, ref: 'abc', submit: false, dryRun: true });
});

test('the workflow pushes the listing, then runs the review step with the account’s key, submitting only when asked', () => {
  const yml = readFileSync(path.join(import.meta.dirname, '..', '.eas/workflows/review.yml'), 'utf8');
  assert.match(yml, /app-review\.mjs --listing --version "\$\{\{ inputs\.version \}\}"/);
  assert.match(yml, /eas-cli@latest metadata:push --non-interactive/);
  assert.match(yml, /needs: \[listing\]/);
  assert.match(yml, /\$\{\{ inputs\.submit && '--submit' \|\| '' \}\}/);
  assert.equal((yml.match(/environment: production/g) ?? []).length, 2, 'both jobs read the production environment, where the key is');
  assert.doesNotMatch(yml, /BEGIN PRIVATE KEY|EXPO_ASC_KEY_ID:/, 'no key in the file');
});
