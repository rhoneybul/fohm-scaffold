/** The member's tabs (src/lib/tabs.ts). Plain Node: npm test. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TAB_ROUTES, showsTabBar, tabOf } from '../src/lib/tabs';

test('the tab bar shows only to a member, on their main tabs', () => {
  assert.equal(showsTabBar('coaching', '/home', true), true);
  assert.equal(showsTabBar('coaching', '/path/', true), true);
  assert.equal(showsTabBar('coaching', '/home', false), false, 'never for the owner, a coach or someone signed out');
  for (const p of ['/', '/sign-in', '/onboarding', '/checkin', '/admin', '/game', '/privacy']) assert.equal(showsTabBar('coaching', p, true), false, p);
});

test('a route under a tab lights that tab', () => {
  assert.equal(tabOf('app', '/credits')?.href, '/account');
});

test('every kind has Home first, at most four tabs, and no tab twice', () => {
  for (const [kind, tabs] of Object.entries(TAB_ROUTES)) {
    assert.equal(tabs[0].href, '/home', kind);
    assert.ok(tabs.length <= 4, kind);
    assert.equal(new Set(tabs.map((t) => t.href)).size, tabs.length, kind);
  }
});
