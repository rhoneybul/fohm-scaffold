/** Colour schemes: every one readable, suggested from what the app is about and the apps the owner likes, and written whole into a new app. Plain Node: npm test. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { newApp } from '../lib/generate.mjs';
import { resolveOptions } from '../lib/options.mjs';
import { INK, NEUTRALS, SCHEMES, contrast, neutralsFor, pickedScheme, schemeFrom, suggestSchemes, tokensOf } from '../lib/schemes.mjs';

const CLI = path.join(import.meta.dirname, '..', 'bin', 'fohm-scaffold.mjs');
const read = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');

test('every neutral family keeps its text at 4.5:1 on its canvas and on white', () => {
  for (const [name, n] of Object.entries(NEUTRALS))
    for (const text of [INK, n.inkMid, n.inkFaint])
      for (const ground of [n.bg, n.raised, '#FFFFFF']) assert.ok(contrast(text, ground) >= 4.5, `${name}: ${text} on ${ground}`);
});

test('every scheme is a whole palette: its accent at 4.5:1 on white and readable on its canvas', () => {
  assert.equal(new Set(SCHEMES.map((s) => s.id)).size, SCHEMES.length);
  for (const s of SCHEMES) {
    const t = tokensOf(s);
    assert.equal(t.accent, s.accent, `${s.id}'s accent is used as written`);
    assert.ok(contrast(t.accent, '#FFFFFF') >= 4.5, `${s.id} on white`);
    assert.ok(contrast(t.accent, t.bg) >= 4, `${s.id} on its canvas`);
    assert.ok(NEUTRALS[s.neutrals], `${s.id} sits on a known family`);
  }
});

test('a scheme is suggested from what the app is about and the apps the owner likes', () => {
  assert.equal(suggestSchemes({ idea: 'A pocket surf coach for beginners' })[0].id, 'ocean');
  assert.equal(suggestSchemes({ idea: 'Backcountry ski touring plans' })[0].id, 'alpine');
  assert.equal(suggestSchemes({ idea: 'A practice app', inspiration: 'Strava, Runna' })[0].id, 'ember');
  const [first] = suggestSchemes({ idea: 'Guitar lessons', inspiration: 'Yousician' });
  assert.match(first.why, /Yousician/, 'says why, with the app as typed');
  assert.deepEqual(
    suggestSchemes({}).map((s) => s.id),
    SCHEMES.slice(0, 4).map((s) => s.id),
    'nothing known: the first four, forest first',
  );
  assert.equal(suggestSchemes({}, 6).length, 6);
});

test('a scheme built around the owner’s own colour gets the neutrals that suit it, and is kept readable', () => {
  assert.equal(neutralsFor('#C2410C'), 'warm');
  assert.equal(neutralsFor('#2F6B4F'), 'sage');
  assert.equal(neutralsFor('#1F5F8B'), 'mist');
  assert.equal(neutralsFor('#555555'), 'cool');
  const own = tokensOf(schemeFrom({ accent: '#F2D777' }));
  assert.ok(contrast(own.accent, '#FFFFFF') >= 4.5, 'a pale yellow is darkened until it reads');
  assert.equal(schemeFrom({ scheme: 'ocean', accent: '#3355AA' }).neutrals, 'mist', 'a named scheme with the owner’s colour keeps its neutrals');
  assert.equal(schemeFrom({ scheme: 'nope' }), undefined);
});

test('options: the scheme follows the app unless one is named, and an unknown one is an error', () => {
  assert.equal(resolveOptions({ name: 'X' }).options.accent, '#2F6B4F', 'no clue: forest, as before');
  assert.equal(resolveOptions({ name: 'X', idea: 'Freediving breath training' }).options.scheme, 'ocean');
  assert.equal(resolveOptions({ name: 'X', scheme: 'Plum' }).options.accent, '#7B2D6E');
  assert.equal(resolveOptions({ name: 'X', accent: '3355aa' }).options.scheme, 'custom');
  assert.match(resolveOptions({ name: 'X', scheme: 'neon' }).errors.join(), /scheme must be one of/);
});

test('a new app carries its whole scheme into the theme and DESIGN.md', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fohm-')), 'surf');
  assert.equal(newApp({ name: 'Swell', scheme: 'ocean' }, { dir, git: false }).ok, true);
  const theme = read(dir, 'src/lib/theme.ts');
  for (const [k, v] of Object.entries(tokensOf(schemeFrom({ scheme: 'ocean' })))) assert.match(theme, new RegExp(`^  ${k}: '${v}',$`, 'm'), `${k} is the scheme's`);
  assert.match(theme, /ink: '#111113'/, 'the ink stays the house’s');
  const design = read(dir, 'DESIGN.md');
  assert.match(design, /in the Ocean scheme \(`ocean`/);
  assert.match(design, /`#EFF2F6`\): every screen's ground, a misty blue-grey/);
  assert.match(read(dir, 'api/_lib/app.ts'), /ACCENT = '#1F5F8B'/);
});

test('the CLI lists the schemes that suit an app, as JSON for an agent', () => {
  const r = JSON.parse(execFileSync('node', [CLI, 'schemes', '--idea', 'A surf coach', '--count', '3', '--json'], { encoding: 'utf8' }));
  assert.equal(r.ok, true);
  assert.equal(r.schemes.length, 3);
  assert.equal(r.schemes[0].id, 'ocean');
  assert.ok(r.schemes[0].tokens.bg && r.schemes[0].mood);
});

test('in a terminal, a scheme is picked by its number, its name or Enter for the best', () => {
  const offered = suggestSchemes({ idea: 'A surf coach' });
  assert.equal(pickedScheme('', offered), 'ocean');
  assert.equal(pickedScheme('2', offered), offered[1].id);
  assert.equal(pickedScheme('Tide', offered), 'tide');
  assert.equal(pickedScheme('plum ', offered), 'plum');
});
