/**
 * Migration files: one 14-digit version each. `supabase db push` records a
 * migration by its version alone, so two files sharing one (two branches that
 * picked the same timestamp) means one of them is never applied. Plain Node:
 * npm test.
 */
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const dir = path.join(import.meta.dirname, '..', 'supabase', 'migrations');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql'));

test('every migration is named <14-digit version>_<name>.sql', () => {
  assert.ok(files.length > 0);
  for (const f of files) assert.match(f, /^\d{14}_[a-z0-9_]+\.sql$/, f);
});

test('no two migrations share a version', () => {
  const byVersion = new Map<string, string[]>();
  for (const f of files) byVersion.set(f.slice(0, 14), [...(byVersion.get(f.slice(0, 14)) ?? []), f]);
  const shared = [...byVersion.values()].filter((list) => list.length > 1);
  assert.deepEqual(shared, [], `give one of these a new version (the latest, if it hasn't deployed): ${shared.map((l) => l.join(' and ')).join('; ')}`);
});
