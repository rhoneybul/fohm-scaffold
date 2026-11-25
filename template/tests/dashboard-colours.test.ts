/** The dashboard's colours (`A` in src/lib/theme.ts) keep their contrast whatever accent the brand has. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import ts from 'typescript';

const theme = readFileSync(new URL('../src/lib/theme.ts', import.meta.url), 'utf8');
const between = (from: string, to: string) => theme.slice(theme.indexOf(from), theme.indexOf(to));

/** The theme's colour helpers and `A`, compiled and run with the accent swapped in (the theme itself imports React Native). */
function dashboardFor(accent: string) {
  const C = { ink: '#111113', bg: '#F2F2F6', onInkMid: '#C9CCD1', accent };
  const source = ts.transpileModule(between("/** WCAG's relative luminance", "/** Etapa's radius scale").replace(/export /g, ''), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function('C', `${source}; return { A, contrast };`)(C) as { A: Record<string, string>; contrast: (a: string, b: string) => number };
}

for (const accent of ['#2F6B4F', '#C2410C', '#3355AA', '#111113', '#F2D777']) {
  test(`with the accent ${accent}, text keeps 4.5:1 and fills 3:1 on every surface`, () => {
    const { A, contrast } = dashboardFor(accent);
    for (const ground of [A.sidebar, A.bg, A.surface, A.surfaceLight]) {
      for (const text of [A.text, A.textMid, A.textFaint, A.primaryText, A.needsYou, A.danger]) assert.ok(contrast(text, ground) >= 4.5, `${text} on ${ground}`);
      assert.ok(contrast(A.primary, ground) >= 3, `the accent's fill ${A.primary} on ${ground}`);
    }
    assert.ok(contrast(A.onPrimary, A.primary) >= 4.5, 'a label on the accent');
    assert.ok(contrast(A.onNeedsYou, A.needsYou) >= 4.5, 'a count on Needs you');
  });
}

test('Needs you turns amber for a blue brand, so it never reads as the accent', () => {
  assert.equal(dashboardFor('#2F6B4F').A.needsYou, '#6CB6FF');
  assert.equal(dashboardFor('#3355AA').A.needsYou, '#F5C451');
});

test('nothing on the dashboard is coloured by hand', () => {
  for (const file of ['src/components/admin.tsx']) {
    assert.doesNotMatch(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8'), /#[0-9a-fA-F]{3,8}\b|rgba?\(/, file);
  }
});
