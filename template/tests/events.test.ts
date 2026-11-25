/**
 * The analytics catalogue (src/lib/events.ts), the code that sends events and
 * docs/ANALYTICS.md are one list, as Naz holds its own: every event sent is
 * catalogued with its why, every catalogued event is sent, and the doc names
 * each. Read from the source: plain Node can't load the app's modules.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';

import { EVENTS } from '../src/lib/events';

const root = new URL('../', import.meta.url);
const files = (dir: string) =>
  readdirSync(new URL(dir, root), { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !f.endsWith('events.ts'))
    .map((f) => readFileSync(new URL(`${dir}/${f}`, root), 'utf8'));
const code = [...files('src'), ...files('api')];
const doc = readFileSync(new URL('docs/ANALYTICS.md', root), 'utf8');

/** The event names in each track(...) and capture(...) call: the quoted words before its properties, leaving out a comparison's ('checkout' in action === 'checkout'). */
function sent(): string[] {
  const names = new Set<string>();
  for (const source of code)
    for (const call of source.matchAll(/\b(?:track|capture)\(([^\n]*)/g)) {
      const head = call[1].replace(/`[^`]*`/g, '').split('{')[0];
      for (const m of head.matchAll(/(?<!=== )'([a-z_]+)'/g)) names.add(m[1]);
    }
  return [...names];
}

test('every event has a snake_case name and says why it exists', () => {
  for (const [name, why] of Object.entries(EVENTS)) {
    assert.match(name, /^[a-z]+(_[a-z]+)*$/, name);
    assert.ok(why.length > 10, `${name}: why it exists`);
  }
});

test('every event the code sends is in the catalogue', () => {
  const names = sent();
  assert.ok(names.length > 10, 'the scan found the calls');
  for (const name of names) assert.ok(EVENTS[name], `${name} is sent but not in src/lib/events.ts`);
});

test('every catalogued event is sent from somewhere', () => {
  const names = new Set(sent());
  for (const name of Object.keys(EVENTS)) assert.ok(names.has(name), `${name} is catalogued but nothing sends it`);
});

test('docs/ANALYTICS.md describes every event', () => {
  for (const name of Object.keys(EVENTS)) assert.ok(doc.includes(`\`${name}\``), `docs/ANALYTICS.md has no \`${name}\``);
});
