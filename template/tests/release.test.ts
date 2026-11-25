/** Release (scripts/release.ts): the version it builds and what it reads from the command line. */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { highestTag, nextVersion, parseArgs } from '../scripts/release';

test('the highest release tag, ignoring other prefixes and anything not x.y.z', () => {
  assert.equal(highestTag(['app-v1.2.0', 'app-v1.10.0', 'app-v1.9.9', 'game-v9.0.0', 'app-vnext'], 'app-'), '1.10.0');
  assert.equal(highestTag([], 'app-'), null);
});

test('the next version bumps the higher of the last tag and app.json, and never repeats one', () => {
  assert.equal(nextVersion({ tags: [], prefix: 'app-', appVersion: '1.0.0', bump: 'none' }), '1.0.0', 'the first release can be app.json as it is');
  assert.equal(nextVersion({ tags: ['app-v1.0.3'], prefix: 'app-', appVersion: '1.0.0', bump: 'patch' }), '1.0.4');
  assert.equal(nextVersion({ tags: ['app-v1.0.3'], prefix: 'app-', appVersion: '2.0.0', bump: 'minor' }), '2.1.0');
  assert.throws(() => nextVersion({ tags: ['app-v1.0.3'], prefix: 'app-', appVersion: '1.0.0', bump: 'none' }), /bigger bump/);
  assert.throws(() => nextVersion({ tags: ['app-v1.0.3'], prefix: 'app-', appVersion: '1.0.0', bump: '1.0.3' }), /built already/);
});

test('a store build on Expo counts as released, so a missing tag never repeats a version', () => {
  assert.equal(nextVersion({ tags: [], prefix: 'app-', appVersion: '0.1.0', bump: 'patch', built: ['1.0.0'] }), '1.0.1');
  assert.throws(() => nextVersion({ tags: [], prefix: 'app-', appVersion: '0.1.0', bump: '1.0.0', built: ['1.0.0'] }), /built already|bigger bump/);
});

test('the command line: platform, bump, build only, a commit', () => {
  assert.deepEqual(parseArgs([]), { platform: 'ios', bump: 'patch', ref: 'HEAD', submit: true, dryRun: false });
  assert.deepEqual(parseArgs(['all', 'minor', '--build-only', '--ref', 'abc123']), { platform: 'all', bump: 'minor', ref: 'abc123', submit: false, dryRun: false });
});
