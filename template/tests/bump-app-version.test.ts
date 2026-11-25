/** The store apps' version, bumped on the Publish workflow's runner (scripts/bump-app-version.ts). Plain Node: npm test. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bumped } from '../scripts/bump-app-version';

test('a bump goes up by its part, and resets the parts below it', () => {
  assert.equal(bumped('1.4.9', 'patch'), '1.4.10');
  assert.equal(bumped('1.4.9', 'minor'), '1.5.0');
  assert.equal(bumped('1.4.9', 'major'), '2.0.0');
  assert.equal(bumped('1.4.9', 'none'), '1.4.9');
});

test('a tag names its version exactly', () => assert.equal(bumped('0.1.0', '2.3.4'), '2.3.4'));

test('anything else is refused, never guessed', () => {
  assert.throws(() => bumped('0.1.0', 'bigger'));
  assert.throws(() => bumped('1.0', 'patch'));
});
