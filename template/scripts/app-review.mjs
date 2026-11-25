#!/usr/bin/env node
/**
 * Submit for review: the App Store's side of a release, after the build is on
 * TestFlight. Run on Expo's servers by `.eas/workflows/review.yml` (started
 * with `npx tsx scripts/review.ts`), where the App Store Connect key lives as
 * the account's secret environment variables; never in a Claude session, and
 * the key is never printed.
 *
 *   node scripts/app-review.mjs --listing --version 1.2.0
 *     checks store.config.json (no placeholder left, Apple's lengths, the
 *     screenshots there) and writes the version into it for `eas metadata:push`
 *   node scripts/app-review.mjs --version 1.2.0 [--submit]
 *     the price (free, everywhere), availability, the App Store version and
 *     its build, export compliance and content rights; with --submit, the
 *     review submission. Without it, it stops short and says what it would send.
 *
 * Every step reads before it writes, so a second run changes nothing.
 * The key: EXPO_ASC_API_KEY_PATH (the .p8 as a file variable) or ASC_KEY_P8,
 * with EXPO_ASC_KEY_ID and EXPO_ASC_ISSUER_ID. BASE_TERRITORY (GBR by
 * default) is where the free price is set from; THIRD_PARTY_CONTENT (yes or
 * no) answers Apple's content rights question. Plain Node, no dependencies:
 * every request goes through fetch, so the tests replace it.
 */
import { sign as cryptoSign } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = 'https://api.appstoreconnect.apple.com';
const log = (...a) => console.log(...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** What Apple still needs that no API can do, said plainly, for the dry run and the docs. */
export const BY_HAND = [
  'App Privacy: App Store Connect → the app → App Privacy → Get Started, answer for the data the app collects, then Publish (Apple has no API for it).',
  'Agreements: App Store Connect → Business → the Free Apps agreement is accepted; the Paid Apps agreement only once in-app purchases are sold.',
];

// ── The key and the token ───────────────────────────────────────────────────

/** An App Store Connect API token: an ES256 JWT that lasts 20 minutes. */
export function ascToken({ keyP8, keyId, issuerId, now = Math.floor(Date.now() / 1000) }) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${b64({ iss: issuerId, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' })}`;
  return `${unsigned}.${cryptoSign('sha256', Buffer.from(unsigned), { key: keyP8, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}

/** The key from the environment, naming what's missing (never what's there). */
export function keyFromEnv(env, read = (p) => readFileSync(p, 'utf8')) {
  const keyP8 = env.EXPO_ASC_API_KEY_PATH ? read(env.EXPO_ASC_API_KEY_PATH) : env.ASC_KEY_P8?.replace(/\\n/g, '\n');
  const missing = [!keyP8 && 'EXPO_ASC_API_KEY_PATH (or ASC_KEY_P8)', !env.EXPO_ASC_KEY_ID && 'EXPO_ASC_KEY_ID', !env.EXPO_ASC_ISSUER_ID && 'EXPO_ASC_ISSUER_ID'].filter(Boolean);
  if (missing.length) throw new Error(`No App Store Connect key here: ${missing.join(', ')} not set. They live on the Expo account (Settings → Environment variables, production, Secret): the app-launch skill's reference/app-review.md.`);
  return { keyP8, keyId: env.EXPO_ASC_KEY_ID, issuerId: env.EXPO_ASC_ISSUER_ID };
}

// ── Talking to Apple ────────────────────────────────────────────────────────

/** Apple's answer when it says no, with its own errors kept for explainAppleErrors. */
export class AppleError extends Error {
  constructor(status, method, url, errors) {
    super(`${method} ${url.replace(ROOT, '')}: ${status} ${errors.map((e) => e.detail || e.title).join('; ')}`);
    this.status = status;
    this.errors = errors;
  }
}

/** A client for the App Store Connect API: get (null on 404 when asked), post, patch. */
export function appleClient(token) {
  async function call(method, url, body, { allow404 = false } = {}) {
    const res = await fetch(url.startsWith('http') ? url : `${ROOT}${url}`, {
      method,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (allow404 && res.status === 404) return null;
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) throw new AppleError(res.status, method, url, json.errors ?? [{ detail: text }]);
    return json;
  }
  return {
    get: (url, o) => call('GET', url, undefined, o),
    post: (url, body) => call('POST', url, body),
    patch: (url, body) => call('PATCH', url, body),
  };
}

/** Apple's errors, every one (the nested ones a submission returns too), in plain words with what to do. */
export function explainAppleErrors(errors = []) {
  const flat = [];
  const walk = (list) => {
    for (const e of list ?? []) {
      flat.push(e);
      for (const more of Object.values(e.meta?.associatedErrors ?? {})) walk(more);
    }
  };
  walk(errors);
  const said = new Set();
  for (const e of flat) {
    const text = `${e.code ?? ''} ${e.title ?? ''} ${e.detail ?? ''}`;
    if (/AGREEMENT/i.test(text)) said.add('An agreement is missing or expired: App Store Connect → Business, accept it (the Free Apps agreement; the Paid Apps agreement once in-app purchases are sold).');
    else if (/privacy (details|information|questions)|appDataUsage|data (usage|collection)|nutrition/i.test(text)) said.add(BY_HAND[0]);
    else if (/screenshot/i.test(text)) said.add('Screenshots are missing: run `npm run store:screens`, commit them, and run the review again.');
    else if (/ageRating|age rating/i.test(text)) said.add('The age rating is unanswered: check `advisory` in store.config.json and run the review again.');
    else if (/contentRights/i.test(text)) said.add('The content rights answer is missing: set THIRD_PARTY_CONTENT in the review workflow.');
    else if (/price|pricing|availability|territor/i.test(text)) said.add('The price or availability is unset: App Store Connect → the app → Pricing and Availability.');
    else if (/contact|reviewDetail|demo account/i.test(text)) said.add('The App Review contact is incomplete: `review` in store.config.json.');
    else if (/primaryCategory|category/i.test(text)) said.add('The category is missing: `categories` in store.config.json.');
    else if (e.detail || e.title) said.add(`Apple says: ${e.detail || e.title}`);
  }
  return [...said];
}

// ── Decisions, pure ─────────────────────────────────────────────────────────

const stateOf = (v) => v.attributes.appVersionState ?? v.attributes.appStoreState;
/** Versions Apple still lets us change. */
const EDITABLE = ['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED', 'INVALID_BINARY'];
/** Versions on their way through review or out of it already. */
const UNDER_REVIEW = ['WAITING_FOR_REVIEW', 'IN_REVIEW', 'READY_FOR_REVIEW', 'WAITING_FOR_EXPORT_COMPLIANCE', 'PENDING_APPLE_RELEASE', 'PENDING_DEVELOPER_RELEASE', 'ACCEPTED', 'PROCESSING_FOR_DISTRIBUTION'];
const RELEASED = ['READY_FOR_SALE', 'READY_FOR_DISTRIBUTION', 'REPLACED_WITH_NEW_VERSION'];

/**
 * What to do about the App Store version for `wanted`: use it, rename the one
 * editable version to it (Apple allows one at a time), create it, or nothing
 * (it's in review or out already).
 */
export function planVersion(versions, wanted) {
  const same = versions.find((v) => v.attributes.versionString === wanted);
  if (same) {
    const state = stateOf(same);
    if (RELEASED.includes(state)) return { action: 'released', id: same.id, state };
    if (UNDER_REVIEW.includes(state)) return { action: 'in-review', id: same.id, state };
    return { action: 'use', id: same.id, state };
  }
  const editable = versions.find((v) => EDITABLE.includes(stateOf(v)));
  if (editable) return { action: 'rename', id: editable.id, from: editable.attributes.versionString };
  const waiting = versions.find((v) => UNDER_REVIEW.includes(stateOf(v)));
  if (waiting) return { action: 'blocked', id: waiting.id, reason: `${waiting.attributes.versionString} is ${stateOf(waiting)}: Apple takes one version at a time, so ${wanted} waits until it's out or withdrawn.` };
  return { action: 'create' };
}

/** The newest build of the version: ready, still processing (wait), or none. */
export function chooseBuild(builds) {
  const live = builds.filter((b) => !b.attributes.expired && !['FAILED', 'INVALID'].includes(b.attributes.processingState));
  const newest = [...live].sort((a, b) => String(b.attributes.uploadedDate).localeCompare(String(a.attributes.uploadedDate)) || Number(b.attributes.version) - Number(a.attributes.version))[0];
  if (!newest) return { none: true };
  if (newest.attributes.processingState === 'PROCESSING') return { waiting: newest };
  return { build: newest };
}

/** A price point that costs nothing. */
export const isFree = (point) => Number(point?.attributes?.customerPrice) === 0;

/** The review submission to use: one already sent with this version (done), an open draft to add to, or a new one. */
export function planSubmission(submissions, itemsOf) {
  for (const s of submissions) {
    const state = s.attributes.state;
    const hasVersion = itemsOf(s.id);
    if (['WAITING_FOR_REVIEW', 'IN_REVIEW', 'UNRESOLVED_ISSUES'].includes(state) && hasVersion) return { action: 'done', id: s.id, state };
  }
  const draft = submissions.find((s) => s.attributes.state === 'READY_FOR_REVIEW');
  if (draft) return { action: 'reuse', id: draft.id, hasItem: itemsOf(draft.id) };
  return { action: 'create' };
}

// ── The listing (store.config.json) ─────────────────────────────────────────

/** What still stops store.config.json going to Apple: placeholders, Apple's lengths, missing screenshots or contact. */
export function listingProblems(config, appDir = '.') {
  const problems = [];
  const walk = (v, at) => {
    if (typeof v === 'string' && /TO FILL/.test(v)) problems.push(`${at} is still a placeholder: ${v}`);
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${at}.${k}`);
  };
  walk(config, 'store.config.json');
  const apple = config.apple ?? {};
  const locales = Object.entries(apple.info ?? {});
  if (!locales.length) problems.push('apple.info has no language');
  for (const [locale, info] of locales) {
    if (!info.title || info.title.length < 2 || info.title.length > 30) problems.push(`${locale}: the title must be 2 to 30 characters`);
    if (info.subtitle && info.subtitle.length > 30) problems.push(`${locale}: the subtitle is ${info.subtitle.length} characters; Apple allows 30`);
    if (info.promoText && info.promoText.length > 170) problems.push(`${locale}: the promotional text is over 170 characters`);
    if (!info.description || info.description.length < 10 || info.description.length > 4000) problems.push(`${locale}: the description must be 10 to 4,000 characters`);
    if ((info.keywords ?? []).join(',').length > 100) problems.push(`${locale}: the keywords are ${(info.keywords ?? []).join(',').length} characters with their commas; Apple allows 100`);
    for (const key of ['privacyPolicyUrl', 'supportUrl']) if (!/^https:\/\//.test(info[key] ?? '')) problems.push(`${locale}: ${key} must be an https address`);
    const shots = info.screenshots ?? {};
    if (!Object.keys(shots).some((t) => t.startsWith('APP_IPHONE'))) problems.push(`${locale}: no iPhone screenshots: run \`npm run store:screens\``);
    for (const files of Object.values(shots)) for (const f of files) if (!existsSync(path.resolve(appDir, f))) problems.push(`${locale}: the screenshot ${f} isn't there`);
  }
  if (!apple.copyright) problems.push('apple.copyright is empty');
  const r = apple.review;
  if (!r?.firstName || !r?.lastName || !r?.email) problems.push('apple.review needs the contact’s first name, last name and email');
  if (!/^\+\d[\d ]{6,}$/.test(r?.phone ?? '')) problems.push('apple.review.phone must start with + and the country code');
  return problems;
}

/** The listing with its version set: eas metadata:push creates or picks that App Store version. */
export const withVersion = (config, version) => ({ ...config, apple: { ...config.apple, version } });

// ── The run ─────────────────────────────────────────────────────────────────

/** The app on App Store Connect: by its Apple ID from eas.json, else by bundle id. */
async function findApp(asc, { appId, bundleId }) {
  if (appId) return (await asc.get(`/v1/apps/${appId}`)).data;
  const found = (await asc.get(`/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}`)).data.find((a) => a.attributes.bundleId === bundleId);
  if (!found) throw new Error(`No app with the bundle id ${bundleId} on App Store Connect: App Store Connect → Apps → + → New App first.`);
  return found;
}

/** Free in every territory, from the base territory, unless a price is set already (a set price is left alone). */
async function ensureFree(asc, app, territory, changes) {
  const schedule = await asc.get(`/v1/apps/${app.id}/appPriceSchedule`, { allow404: true });
  if (schedule?.data) {
    const prices = await asc.get(`/v1/appPriceSchedules/${schedule.data.id}/manualPrices?include=appPricePoint&limit=200`);
    const points = (prices.included ?? []).filter((x) => x.type === 'appPricePoints');
    if (points.length && !points.every(isFree)) log('- Price: a price is set already; left as it is (this script only ever sets free).');
    else log('- Price: free already');
    return;
  }
  const points = (await asc.get(`/v1/apps/${app.id}/appPricePoints?filter[territory]=${territory}&limit=200`)).data;
  const free = points.find(isFree);
  if (!free) throw new Error(`Apple lists no free price point in ${territory}`);
  await asc.post('/v1/appPriceSchedules', {
    data: { type: 'appPriceSchedules', relationships: { app: { data: { type: 'apps', id: app.id } }, baseTerritory: { data: { type: 'territories', id: territory } }, manualPrices: { data: [{ type: 'appPrices', id: '${free}' }] } } },
    included: [{ type: 'appPrices', id: '${free}', attributes: { startDate: null }, relationships: { appPricePoint: { data: { type: 'appPricePoints', id: free.id } } } }],
  });
  changes.push(`price set to free in every territory, from ${territory}`);
  log(`- Price: set to free, from ${territory}`);
}

/** Available in every territory, and in new ones as Apple adds them, unless availability is set already. */
async function ensureAvailable(asc, app, changes) {
  const existing = await asc.get(`/v1/apps/${app.id}/appAvailabilityV2`, { allow404: true });
  if (existing?.data) return log('- Availability: set already; left as it is');
  const territories = (await asc.get('/v1/territories?limit=200')).data;
  await asc.post('/v2/appAvailabilities', {
    data: {
      type: 'appAvailabilities',
      attributes: { availableInNewTerritories: true },
      relationships: { app: { data: { type: 'apps', id: app.id } }, territoryAvailabilities: { data: territories.map((t) => ({ type: 'territoryAvailabilities', id: `\${${t.id}}` })) } },
    },
    included: territories.map((t) => ({ type: 'territoryAvailabilities', id: `\${${t.id}}`, attributes: { available: true }, relationships: { territory: { data: { type: 'territories', id: t.id } } } })),
  });
  changes.push(`available in all ${territories.length} territories`);
  log(`- Availability: all ${territories.length} territories`);
}

async function ensureContentRights(asc, app, thirdParty, changes) {
  const answer = thirdParty ? 'USES_THIRD_PARTY_CONTENT' : 'DOES_NOT_USE_THIRD_PARTY_CONTENT';
  if (app.attributes.contentRightsDeclaration) return log(`- Content rights: answered already (${app.attributes.contentRightsDeclaration})`);
  await asc.patch(`/v1/apps/${app.id}`, { data: { type: 'apps', id: app.id, attributes: { contentRightsDeclaration: answer } } });
  changes.push(`content rights answered: ${answer}`);
  log(`- Content rights: ${answer}`);
}

async function ensureVersion(asc, app, version, changes) {
  const versions = (await asc.get(`/v1/apps/${app.id}/appStoreVersions?filter[platform]=IOS&limit=50`)).data;
  const plan = planVersion(versions, version);
  if (plan.action === 'blocked') throw new Error(plan.reason);
  if (plan.action === 'released') throw new Error(`${version} is on the App Store already (${plan.state}): release a new version first (scripts/release.ts).`);
  if (plan.action === 'create') {
    const made = await asc.post('/v1/appStoreVersions', { data: { type: 'appStoreVersions', attributes: { platform: 'IOS', versionString: version }, relationships: { app: { data: { type: 'apps', id: app.id } } } } });
    changes.push(`App Store version ${version} created`);
    log(`- Version: ${version} created`);
    return { id: made.data.id, inReview: false };
  }
  if (plan.action === 'rename') {
    await asc.patch(`/v1/appStoreVersions/${plan.id}`, { data: { type: 'appStoreVersions', id: plan.id, attributes: { versionString: version } } });
    changes.push(`App Store version ${plan.from} renamed ${version}`);
    log(`- Version: the editable ${plan.from} is now ${version}`);
    return { id: plan.id, inReview: false };
  }
  log(`- Version: ${version} there already (${plan.state})`);
  return { id: plan.id, inReview: plan.action === 'in-review' };
}

/** The newest processed build of the version, waiting while Apple processes it. */
async function newestBuild(asc, app, version, { timeoutMs, everyMs, wait = sleep }) {
  const url = `/v1/builds?filter[app]=${app.id}&filter[preReleaseVersion.version]=${encodeURIComponent(version)}&filter[preReleaseVersion.platform]=IOS&sort=-uploadedDate&limit=20`;
  const until = Date.now() + timeoutMs;
  for (;;) {
    const choice = chooseBuild((await asc.get(url)).data);
    if (choice.build) return choice.build;
    if (choice.none) throw new Error(`No build of ${version} on App Store Connect: release it first (npx tsx scripts/release.ts ios), then run the review again.`);
    if (Date.now() >= until) throw new Error(`Build ${choice.waiting.attributes.version} of ${version} is still processing at Apple after ${Math.round(timeoutMs / 60000)} minutes: run the review again later.`);
    log(`- Build ${choice.waiting.attributes.version}: Apple is still processing it; waiting`);
    await wait(everyMs);
  }
}

async function ensureBuild(asc, versionId, build, changes) {
  if (build.attributes.usesNonExemptEncryption == null) {
    await asc.patch(`/v1/builds/${build.id}`, { data: { type: 'builds', id: build.id, attributes: { usesNonExemptEncryption: false } } });
    changes.push(`build ${build.attributes.version}: export compliance answered (no non-exempt encryption)`);
  }
  const current = await asc.get(`/v1/appStoreVersions/${versionId}/relationships/build`);
  if (current.data?.id === build.id) return log(`- Build ${build.attributes.version}: on the version already`);
  await asc.patch(`/v1/appStoreVersions/${versionId}/relationships/build`, { data: { type: 'builds', id: build.id } });
  changes.push(`build ${build.attributes.version} set on the version`);
  log(`- Build ${build.attributes.version}: set on the version`);
}

/** What the version still lacks that the listing should have given it, read from Apple. */
async function versionGaps(asc, app, versionId, { tablet }) {
  const gaps = [];
  const locale = app.attributes.primaryLocale;
  const locs = (await asc.get(`/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations?limit=50`)).data;
  const primary = locs.find((l) => l.attributes.locale === locale);
  if (!primary) return [`No listing in the app's primary language (${locale}): add it under apple.info in store.config.json.`];
  for (const key of ['description', 'keywords', 'supportUrl']) if (!primary.attributes[key]) gaps.push(`The ${locale} listing has no ${key}.`);
  const sets = (await asc.get(`/v1/appStoreVersionLocalizations/${primary.id}/appScreenshotSets?limit=50`)).data.map((s) => s.attributes.screenshotDisplayType);
  if (!sets.some((t) => ['APP_IPHONE_67', 'APP_IPHONE_65'].includes(t))) gaps.push('No 6.9-inch iPhone screenshots: `npm run store:screens`.');
  if (tablet && !sets.some((t) => t.startsWith('APP_IPAD_PRO'))) gaps.push('No 13-inch iPad screenshots, and the app runs on iPad (ios.supportsTablet): `npm run store:screens`.');
  const detail = await asc.get(`/v1/appStoreVersions/${versionId}/appStoreReviewDetail`, { allow404: true });
  if (!detail?.data?.attributes?.contactEmail || !detail.data.attributes.contactPhone) gaps.push('The App Review contact is incomplete: `review` in store.config.json.');
  return gaps;
}

async function submitForReview(asc, app, versionId, changes) {
  const submissions = (await asc.get(`/v1/reviewSubmissions?filter[app]=${app.id}&filter[platform]=IOS&limit=20`)).data;
  const items = {};
  for (const s of submissions.filter((x) => ['READY_FOR_REVIEW', 'WAITING_FOR_REVIEW', 'IN_REVIEW', 'UNRESOLVED_ISSUES'].includes(x.attributes.state))) {
    const list = (await asc.get(`/v1/reviewSubmissions/${s.id}/items?limit=50`)).data;
    items[s.id] = list.some((i) => i.relationships?.appStoreVersion?.data?.id === versionId);
  }
  const plan = planSubmission(submissions, (id) => items[id] ?? false);
  if (plan.action === 'done') return log(`- Review: submitted already (${plan.state})`);
  const id = plan.action === 'reuse' ? plan.id : (await asc.post('/v1/reviewSubmissions', { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: { data: { type: 'apps', id: app.id } } } } })).data.id;
  if (!plan.hasItem) await asc.post('/v1/reviewSubmissionItems', { data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id } }, appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } } } } });
  await asc.patch(`/v1/reviewSubmissions/${id}`, { data: { type: 'reviewSubmissions', id, attributes: { submitted: true } } });
  changes.push('submitted for review');
  log('- Review: submitted');
}

/**
 * Everything between a build on TestFlight and Apple's review. Returns what
 * it changed and what is still missing; `submitted` once it has sent it.
 */
export async function review({ token, appId, bundleId, version, submit = false, territory = 'GBR', thirdParty = true, tablet = false, timeoutMs = 45 * 60_000, everyMs = 60_000, wait }) {
  const asc = appleClient(token);
  const changes = [];
  const app = await findApp(asc, { appId, bundleId });
  log(`${app.attributes.name} (${app.attributes.bundleId}, Apple ID ${app.id}), version ${version}`);
  await ensureFree(asc, app, territory, changes);
  await ensureAvailable(asc, app, changes);
  await ensureContentRights(asc, app, thirdParty, changes);
  const v = await ensureVersion(asc, app, version, changes);
  if (v.inReview) return { changes, missing: [], submitted: true };
  const build = await newestBuild(asc, app, version, { timeoutMs, everyMs, wait });
  await ensureBuild(asc, v.id, build, changes);
  const missing = await versionGaps(asc, app, v.id, { tablet });
  if (missing.length) return { changes, missing, submitted: false };
  if (!submit) {
    log(`\nWould submit ${app.attributes.name} ${version} (build ${build.attributes.version}) for review. Run with submit to send it.`);
    log(`Before that, by hand (Apple has no API for these):\n${BY_HAND.map((l) => `  - ${l}`).join('\n')}`);
    return { changes, missing: [], submitted: false };
  }
  try {
    await submitForReview(asc, app, v.id, changes);
  } catch (e) {
    if (e instanceof AppleError) return { changes, missing: explainAppleErrors(e.errors), submitted: false };
    throw e;
  }
  return { changes, missing: [], submitted: true };
}

/** Reads the command line: --listing, --submit, --version x.y.z. */
export function parseArgs(argv) {
  const at = argv.indexOf('--version');
  return { listing: argv.includes('--listing'), submit: argv.includes('--submit'), version: at >= 0 ? argv[at + 1] : undefined };
}

export async function main(argv = process.argv.slice(2), env = process.env, appDir = process.cwd()) {
  const { listing, submit, version } = parseArgs(argv);
  if (!/^\d+\.\d+\.\d+$/.test(version ?? '')) throw new Error('Which version? --version x.y.z (scripts/review.ts passes the last one released).');
  const file = path.join(appDir, 'store.config.json');
  if (listing) {
    const config = JSON.parse(readFileSync(file, 'utf8'));
    const problems = listingProblems(config, appDir);
    if (problems.length) throw new Error(`store.config.json isn't ready for Apple:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    writeFileSync(file, JSON.stringify(withVersion(config, version), null, 2) + '\n');
    log(`store.config.json is ready, for version ${version}.`);
    return 0;
  }
  const appJson = JSON.parse(readFileSync(path.join(appDir, 'app.json'), 'utf8')).expo;
  const eas = JSON.parse(readFileSync(path.join(appDir, 'eas.json'), 'utf8'));
  const token = ascToken(keyFromEnv(env));
  const result = await review({
    token,
    appId: eas.submit?.production?.ios?.ascAppId,
    bundleId: appJson.ios.bundleIdentifier,
    version,
    submit,
    territory: env.BASE_TERRITORY || 'GBR',
    thirdParty: (env.THIRD_PARTY_CONTENT ?? 'yes') !== 'no',
    tablet: appJson.ios.supportsTablet === true,
    timeoutMs: Number(env.BUILD_WAIT_MINUTES || 45) * 60_000,
  });
  if (result.changes.length) log(`\nChanged: ${result.changes.join('; ')}.`);
  else log('\nNothing to change.');
  if (result.missing.length) {
    console.error(`\nApple still needs, before it can be submitted:\n${result.missing.map((m) => `  - ${m}`).join('\n')}`);
    return 1;
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  main().then(
    (code) => (process.exitCode = code),
    (e) => {
      const plain = e instanceof AppleError ? explainAppleErrors(e.errors) : [];
      console.error(plain.length ? `Apple still needs:\n${plain.map((m) => `  - ${m}`).join('\n')}` : e.message);
      process.exitCode = 1;
    },
  );
}
