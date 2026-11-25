/** The brand's PNGs, rendered from its SVGs (scripts/brand-assets.ts). Plain Node: npm test. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { buildAssets, FAVICON, OUTPUTS, pngSize, render, sheet, SHEET_SIZES, sources, writeSources, writeWebSplash } from '../scripts/brand-assets';

const MARK = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><path d="M40 448 L256 84 L472 448 Z" fill="#1C1F1D"/></svg>';

test('an SVG renders to a PNG of the width asked, down to 29 px', () => {
  for (const w of [1024, 29]) assert.deepEqual(pngSize(render(MARK, w)), { width: w, height: w });
});

test('the comparison sheet: each concept a row, every size on light and dark', () => {
  const svg = sheet([MARK, MARK]);
  const png = render(svg, Number(/width="(\d+)"/.exec(svg)![1]));
  const { width, height } = pngSize(png);
  const sizes = [...SHEET_SIZES, FAVICON];
  assert.equal(width, 2 * sizes.reduce((sum, s) => sum + s + 24, 24));
  assert.equal(height, 2 * (SHEET_SIZES[0] + 48));
  assert.equal(svg.match(/width="29"/g)?.length, 4, '29 px, on both grounds, for both concepts');
  assert.deepEqual(SHEET_SIZES.at(-1), 29);
});

test('every output is drawn from its source, and a missing source is skipped', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-'));
  fs.mkdirSync(path.join(dir, 'assets', 'brand'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'assets', 'brand', 'icon.svg'), MARK);
  const wrote = buildAssets(dir);
  assert.deepEqual(wrote, OUTPUTS.filter((o) => o.source === 'icon.svg').map((o) => o.out));
  assert.equal(pngSize(fs.readFileSync(path.join(dir, 'assets/icon/icon.png'))).width, 1024);
  assert.equal(pngSize(fs.readFileSync(path.join(dir, 'public/apple-touch-icon.png'))).width, 180);
});

test('npm run brand draws every source from logo.ts, every PNG but the hand-made wordmark from them, and the web splash', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brand-'));
  fs.mkdirSync(path.join(dir, 'public'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'public', 'index.html'), '<body><div id="root"></div></body>');
  assert.deepEqual(writeSources(dir), Object.keys(sources()));
  const wrote = buildAssets(dir);
  assert.deepEqual(wrote, OUTPUTS.filter((o) => o.source !== 'wordmark.svg').map((o) => o.out));
  for (const out of wrote) assert.ok(pngSize(fs.readFileSync(path.join(dir, out))).width > 0, out);
  writeWebSplash(dir);
  assert.match(fs.readFileSync(path.join(dir, 'public', 'index.html'), 'utf8'), /<div id="root"><\/div><!-- splash -->/);
});

test('the template’s images are current: what npm run brand would write', () => {
  const here = path.join(import.meta.dirname, '..');
  for (const [name, svg] of Object.entries(sources())) assert.equal(fs.readFileSync(path.join(here, 'assets', 'brand', name), 'utf8'), `${svg}\n`, `${name}: npm run brand`);
});
