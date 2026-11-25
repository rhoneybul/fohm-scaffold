/**
 * The launch screen (src/lib/splash.ts): the phone's splash in app.json, the
 * web page's in public/index.html and LoadingSplash are one picture, and the
 * throb is Naz's. Plain Node: npm test.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';

import { sources } from '../scripts/brand-assets';
import { BOX, markSvg } from '../src/lib/logo';
import { BOOT_WAIT_MS, CSS_EASING, SPLASH, THROB, THROB_MS, phaseAt, splashHtml, throbAt, throbs, VIEWBOX, withSplash } from '../src/lib/splash';

const read = (f: string) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const app = JSON.parse(read('app.json')).expo;
const plugin = app.plugins.find((p: unknown) => Array.isArray(p) && p[0] === 'expo-splash-screen')?.[1];

test('the throb: 92% and 55% bright at rest, whole at the top, 700 ms each way', () => {
  assert.deepEqual(throbAt(1), { scale: 1, opacity: 1 });
  assert.deepEqual(throbAt(0), { scale: 0.92, opacity: 0.55 });
  assert.deepEqual(throbAt(2), throbAt(1), 'held to the top');
  assert.equal(THROB.settleMs + THROB.swellMs, THROB_MS);
  assert.equal(THROB_MS, 1400);
});

test('the phase: the top at 0, the rest at 700 ms, swelling back by 1400; a later launch screen carries on the same throb', () => {
  assert.deepEqual(phaseAt(0), { level: 1, toward: 0, left: 700 });
  assert.deepEqual(phaseAt(700), { level: 0, toward: 1, left: 700 });
  assert.equal(phaseAt(350).level, 0.5, 'half way down the settle, eased in and out');
  assert.equal(phaseAt(1050).level, 0.75, 'the swell eases out');
  assert.deepEqual(phaseAt(1400), phaseAt(0));
  assert.deepEqual(phaseAt(1400 * 3 + 100), phaseAt(100));
});

test('reduced motion stands the mark still', () => {
  assert.equal(throbs(true), false);
  assert.equal(throbs(false), true);
});

test('the phone’s splash is the same picture: the ink, the white mark edge to edge, its width the mark’s size, light and dark', () => {
  assert.ok(plugin, 'expo-splash-screen is configured in app.json');
  assert.equal(plugin.backgroundColor, SPLASH.background);
  assert.equal(plugin.imageWidth, SPLASH.size);
  assert.equal(plugin.resizeMode, 'contain');
  assert.equal(plugin.image, './assets/icon/splash.png');
  assert.deepEqual(plugin.dark, { image: plugin.image, backgroundColor: SPLASH.background });
  assert.ok(fs.existsSync(new URL('../assets/icon/splash.png', import.meta.url)));
  // splash.svg's viewBox is the mark's box, so the image is the mark and nothing else.
  assert.equal(sources()['splash.svg'], markSvg({ size: 1024, color: SPLASH.mark }));
  assert.match(sources()['splash.svg'], new RegExp(`viewBox="${VIEWBOX}"`));
  assert.equal(VIEWBOX, `${BOX.x} ${BOX.y} ${BOX.size} ${BOX.size}`);
});

test('the splash’s ground is the brand’s ink, and the mark is white on it', () => {
  assert.equal(/ink: '(#[0-9A-F]{6})'/.exec(read('src/lib/theme.ts'))?.[1], SPLASH.background);
  assert.equal(SPLASH.mark, '#FFFFFF');
  assert.equal(app.android.adaptiveIcon.backgroundColor, SPLASH.background);
});

test('the web page carries the current splash over #root, throbbing in CSS and still under reduced motion', () => {
  const page = read('public/index.html');
  assert.ok(page.includes(`<div id="root"></div>${splashHtml()}`), 'public/index.html is current: npm run brand');
  assert.equal(withSplash(page), page, 'running it again changes nothing');
  assert.equal(withSplash('<div id="root"></div>'), `<div id="root"></div>${splashHtml()}`);
  const html = splashHtml();
  assert.match(html, new RegExp(`background:${SPLASH.background}`));
  assert.match(html, new RegExp(`width="${SPLASH.size}" height="${SPLASH.size}"`));
  assert.match(html, /50%\{transform:scale\(0\.92\);opacity:0\.55;/);
  assert.match(html, /0%,100%\{transform:scale\(1\);opacity:1;/, 'it starts at the top, as the splash shows it');
  assert.ok(html.includes(CSS_EASING.settle) && html.includes(CSS_EASING.swell), 'the same easings as the app');
  assert.match(html, /prefers-reduced-motion:reduce\)\{#splash svg\{animation:none\}/);
});

test('the launch screen never holds the app up for long', () => {
  assert.ok(BOOT_WAIT_MS <= 5000);
});

test('the layout keeps the phone’s splash until the app’s own is drawn, and whole pages load with the mark', () => {
  const layout = read('src/app/_layout.tsx');
  assert.match(layout, /keepNativeSplash\(\);/);
  assert.match(layout, /<LoadingSplash \/>/);
  assert.match(layout, /<BootSplash \/>/);
  assert.doesNotMatch(read('src/app/index.tsx'), /ActivityIndicator/);
  assert.match(read('src/components/logo-loader.tsx'), /onLayout=\{\(\) => requestAnimationFrame\(hideNativeSplash\)\}/);
});
