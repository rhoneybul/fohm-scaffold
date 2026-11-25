/**
 * The landing page's data and its tags for search and shared links
 * (src/lib/landing.ts), and the visit-counting choice (src/lib/consent.ts).
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { APP } from '../src/lib/brand';
import { CONSENT_ANSWERS, consentFrom, keepsId } from '../src/lib/consent';
import { canonicalFor, landingGoals, landingWays, priceLine, proofScreens, seoDescription, seoTags, seoTitle, siteOrigin, storeButtons, structuredData, withSeo } from '../src/lib/landing';

const APPLE = { store: 'app-store' as const, url: 'https://apps.apple.com/app/id123' };
const PLAY = { store: 'google-play' as const, url: 'https://play.google.com/store/apps/details?id=com.example' };

test('the store pills: App Store first, worded as the badges, only real https listings', () => {
  const b = storeButtons([PLAY, APPLE, { store: 'app-store', url: 'not a url' }]);
  assert.deepEqual(b.map((x) => x.store), ['app-store', 'google-play']);
  assert.equal(b[0].label, 'Download on the App Store');
  assert.equal(b[1].label, 'Get it on Google Play');
  assert.deepEqual(storeButtons([{ store: 'app-store', url: 'http://insecure' }]), []);
});

test('the way in: no stores means the ink pill to the web app; stores lead, with the web app a quiet link', () => {
  const none = landingWays([]);
  assert.equal(none.primary?.href, '/sign-in?mode=up');
  assert.equal(none.quiet.href, '/sign-in');
  const both = landingWays([APPLE, PLAY]);
  assert.equal(both.primary, null);
  assert.equal(both.stores.length, 2);
  assert.match(both.quiet.label, /browser/);
  assert.equal(both.quiet.href, '/sign-in?mode=up');
});

test('the template starts with no stores, three steps, a description that fits search, and no screenshots', () => {
  assert.deepEqual(APP.stores, []);
  assert.equal(APP.steps.length, 3);
  assert.ok(APP.description.length >= 80 && APP.description.length <= 160, 'a description search shows whole');
  assert.deepEqual(APP.screens, []);
});

test('the price line shows only once payments are on, in the currency Stripe charges', () => {
  assert.equal(priceLine(null), null);
  assert.equal(priceLine({ priceCents: 0, currency: 'gbp' }), null);
  assert.match(priceLine({ priceCents: 999, currency: 'gbp' })!, /£9\.99 a month/);
});

test('Inside the app: real screenshots once listed, else the app’s own screens drawn live', () => {
  const live = proofScreens('coaching', [], { owner: 'coach' });
  assert.deepEqual(live.map((p) => (p.kind === 'live' ? p.screen : p.file)), ['assessment', 'path', 'library']);
  assert.deepEqual(proofScreens('app', [], { owner: 'team' }).map((p) => p.kind), ['live']);
  const shots = proofScreens('coaching', [{ file: 'home.png', title: 'Home', line: 'Your week' }, { file: '../x.png', title: 'Bad', line: '' }], { owner: 'coach' });
  assert.deepEqual(shots, [{ kind: 'shot', file: 'home.png', title: 'Home', line: 'Your week' }]);
});

test('the goals section shows only photos the licence allows, six at most', () => {
  const ok = { url: 'https://example.com/a.jpg', page: 'https://commons.wikimedia.org/wiki/File:A.jpg', caption: 'A', credit: 'Jane Doe / Wikimedia Commons', licence: 'CC BY-SA 4.0' };
  const goals = Array.from({ length: 8 }, (_, i) => ({ id: `g${i}`, title: `Goal ${i}`, photo: ok }));
  assert.equal(landingGoals(goals).length, 6);
  assert.equal(landingGoals([{ id: 'x', title: 'X', photo: { ...ok, licence: 'All rights reserved' } }]).length, 0);
  assert.equal(landingGoals([{ id: 'y', title: 'Y' }]).length, 0);
});

const SEO = { name: 'Starter', tagline: 'Get ready for the big days.', description: APP.description, origin: 'https://example.com', operator: 'Example Ltd', image: 'https://example.com/og.png', imageSize: { width: 1200, height: 630 }, stores: [] };

test('search: a title within 60 characters, a description within 160, cut at a word', () => {
  assert.equal(seoTitle('Starter', 'Get ready for the big days.'), 'Starter: Get ready for the big days');
  assert.equal(seoTitle('Starter', 'x'.repeat(80)), 'Starter');
  const long = seoDescription('word '.repeat(60));
  assert.ok(long.length <= 160 && long.endsWith('…'));
  assert.equal(siteOrigin('http://example.com/'), 'https://example.com');
});

test('the head’s tags: title, description, canonical, Open Graph with its image, Twitter and JSON-LD, escaped', () => {
  const tags = seoTags({ ...SEO, name: 'A & B "C"' });
  for (const t of ['<title>', 'name="description"', 'rel="canonical" href="https://example.com/"', 'og:title', 'og:description', 'og:url', 'og:image" content="https://example.com/og.png"', 'og:image:width', 'twitter:card" content="summary_large_image"', 'application/ld+json'])
    assert.ok(tags.includes(t), t);
  assert.ok(tags.includes('A &amp; B &quot;C&quot;'));
  assert.ok(!seoTags({ ...SEO, image: undefined }).includes('og:image'));
});

test('structured data: the site and who runs it, and the app once it is in a store', () => {
  assert.equal(structuredData(SEO)['@graph'].length, 2);
  const listed = structuredData({ ...SEO, stores: [APPLE, PLAY] })['@graph'][2] as Record<string, unknown>;
  assert.equal(listed['@type'], 'SoftwareApplication');
  assert.equal(listed.operatingSystem, 'iOS, Android');
});

test('the export gets its tags once, however often the script runs, and keeps the rest of the page', () => {
  const page = '<html><head><title>Starter</title><style>x</style></head><body></body></html>';
  const once = withSeo(page, SEO);
  assert.equal(withSeo(once, SEO), once);
  assert.equal(once.match(/<title>/g)?.length, 1);
  assert.ok(once.includes('<style>x</style>'));
});

test('each route names its own address as canonical, never its query', () => {
  assert.equal(canonicalFor('https://example.com', '/'), 'https://example.com/');
  assert.equal(canonicalFor('https://example.com/', '/privacy/'), 'https://example.com/privacy');
});

test('counting visits: nothing kept on the web until allow all; the apps keep their id', () => {
  assert.equal(consentFrom(null), 'pending');
  assert.equal(consentFrom('all'), 'all');
  assert.equal(consentFrom('yes'), 'pending');
  assert.equal(keepsId('pending', true), false);
  assert.equal(keepsId('counting', true), false);
  assert.equal(keepsId('all', true), true);
  assert.equal(keepsId('pending', false), true);
  assert.deepEqual(CONSENT_ANSWERS.map((a) => a.title), ['Counting only', 'Allow all']);
});

test('analytics follows the choice, and the privacy policy says so', () => {
  const analytics = readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8');
  assert.match(analytics, /keepsId\(consentFrom\(/);
  const legal = readFileSync(new URL('../src/lib/legal.ts', import.meta.url), 'utf8');
  assert.match(legal, /Allow all/);
});

test('every web export gets its tags: the build and the local server run scripts/seo.ts', () => {
  const vercel = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
  const pkg = readFileSync(new URL('../package.json', import.meta.url), 'utf8');
  assert.match(vercel, /expo export --platform web && npx tsx scripts\/seo\.ts/);
  assert.match(pkg, /"serve:local": "[^"]*scripts\/seo\.ts/);
});
