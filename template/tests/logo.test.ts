/** The mark (src/lib/logo.ts): one shape, one colour, well formed, the size it's asked for. Plain Node: npm test. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BOX, FILL_RULE, GRID, MARK_PATH, iconSvg, markGroup, markSvg } from '../src/lib/logo';

test('the mark sits on the 1024 grid, inside its box', () => {
  assert.equal(GRID, 1024);
  assert.ok(BOX.x >= 0 && BOX.y >= 0 && BOX.x + BOX.size <= GRID && BOX.y + BOX.size <= GRID);
  const nums = [...MARK_PATH.matchAll(/-?\d+(\.\d+)?/g)].map((m) => Number(m[0]));
  assert.ok(nums.every((n) => Number.isFinite(n) && n >= 0 && n <= GRID));
  assert.match(MARK_PATH, /^M .* Z$/);
  assert.equal(FILL_RULE, 'evenodd');
});

test('one colour, whatever it is given, and on a ground the ground is the only other', () => {
  for (const svg of [markSvg({ size: 64, color: '#111113' }), markGroup({ size: 64, color: '#111113' }), iconSvg({ size: 1024, color: '#111113' })]) {
    assert.deepEqual([...new Set([...svg.matchAll(/(?:fill|stroke)="([^"]+)"/g)].map((m) => m[1]))], ['#111113']);
    assert.doesNotMatch(svg, /stroke=|mask|clip|<text/);
  }
  const icon = iconSvg({ size: 1024, ground: '#111113', color: '#FFFFFF' });
  assert.deepEqual(new Set([...icon.matchAll(/fill="([^"]+)"/g)].map((m) => m[1])), new Set(['#111113', '#FFFFFF']));
});

test('the SVG is well formed and named only when asked', () => {
  const svg = markSvg({ size: 29, label: 'Starter' });
  assert.match(svg, new RegExp(`^<svg xmlns="http://www.w3.org/2000/svg" width="29" height="29" viewBox="${BOX.x} ${BOX.y} ${BOX.size} ${BOX.size}" role="img" aria-label="Starter">`));
  assert.ok(svg.endsWith('</svg>'));
  assert.equal((svg.match(/<(svg|g|path)\b/g) ?? []).length, (svg.match(/<\/(svg|g|path)>|\/>/g) ?? []).length);
  assert.match(markSvg({ size: 29 }), /aria-hidden="true"/);
});

test('markGroup puts the mark size across at x, y; the app icon centres it at 60%', () => {
  assert.match(markGroup({ size: BOX.size / 2, x: 10, y: 20, color: '#fff' }), new RegExp(`^<g transform="translate\\(10 20\\) scale\\(0\\.5\\) translate\\(${-BOX.x} ${-BOX.y}\\)">`));
  assert.match(iconSvg({ size: 1000, ground: '#000', color: '#fff' }), /translate\(200 200\)/);
});

test('the app signs itself with the mark: the landing, sign-in and the dashboard use the kit, never the name typed alone', async () => {
  const { readFileSync } = await import('node:fs');
  const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  assert.match(read('src/components/logo-loader.tsx'), /export function Lockup[\s\S]*<Mark /, 'Lockup draws the Mark beside the name');
  for (const file of ['src/components/landing.tsx', 'src/app/sign-in.tsx', 'src/components/admin.tsx'])
    assert.match(read(file), /<Lockup\b/, `${file} carries the lockup`);
  assert.doesNotMatch(read('src/components/landing.tsx'), />\{APP\.name\}<\/Text>/, "the landing's header is the lockup, not the name in type");
});
