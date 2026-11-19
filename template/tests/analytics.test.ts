/**
 * Analytics forgets the account on signing out and deleting it, so the next
 * person on the same device isn't counted as the last account. Read from the
 * source: src/lib/analytics.ts needs React Native, which plain Node can't load.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const store = readFileSync(new URL('../src/lib/store.tsx', import.meta.url), 'utf8');
const analytics = readFileSync(new URL('../src/lib/analytics.ts', import.meta.url), 'utf8');

function body(source: string, name: string): string {
  const start = source.indexOf(`async ${name}(`);
  assert.ok(start >= 0, `${name} is in the store`);
  return source.slice(start, source.indexOf('\n      },', start));
}

test('signing out forgets the analytics identity', () => {
  assert.match(body(store, 'signOut'), /forgetIdentity\(\)/);
});

test('deleting the account forgets the analytics identity', () => {
  assert.match(body(store, 'deleteAccount'), /forgetIdentity\(\)/);
});

test('forgetting the identity starts a fresh anonymous id and keeps it', () => {
  const forget = analytics.slice(analytics.indexOf('export function forgetIdentity'));
  assert.match(forget, /distinctId = newAnonId\(\)/);
  assert.match(forget, /AsyncStorage\.setItem\('analytics:id', distinctId\)/);
  assert.match(analytics, /return `anon_/);
});
