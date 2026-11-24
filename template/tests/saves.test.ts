/** Saves and the to-do list (src/lib/saves.ts). Plain Node: npm test. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { activity } from '../src/lib/activity';
import { SAVED_NAMES, saveId, savedRecord, savedTitle, savesOf, toDo } from '../src/lib/saves';
import { EMPTY_DB, type Saved } from '../src/lib/types';

const at = (d: number) => new Date(Date.UTC(2026, 10, d)).toISOString();

test('saving again keeps the one row and when it was first saved; a status is kept, changed or cleared', () => {
  const first = savedRecord('m', 'goal', 'alps', undefined, undefined, at(1));
  assert.equal(first.id, saveId('m', 'goal', 'alps'));
  assert.equal(first.status, undefined);
  const listed = savedRecord('m', 'goal', 'alps', first, 'list', at(2));
  assert.deepEqual([listed.id, listed.createdAt, listed.status], [first.id, at(1), 'list']);
  assert.equal(savedRecord('m', 'goal', 'alps', listed, undefined, at(3)).status, 'list', 'undefined keeps it');
  assert.equal(savedRecord('m', 'goal', 'alps', listed, null, at(3)).status, undefined, 'null clears it');
});

const saved: Saved[] = [
  { id: '1', memberId: 'm', kind: 'goal', itemId: 'alps', status: 'list', createdAt: at(1), updatedAt: at(1) },
  { id: '2', memberId: 'm', kind: 'goal', itemId: 'andes', status: 'going', createdAt: at(2), updatedAt: at(2) },
  { id: '3', memberId: 'm', kind: 'goal', itemId: 'atlas', status: 'done', createdAt: at(3), updatedAt: at(3) },
  { id: '4', memberId: 'm', kind: 'course', itemId: 'first-aid', createdAt: at(4), updatedAt: at(4) },
  { id: '5', memberId: 'x', kind: 'goal', itemId: 'alps', status: 'list', createdAt: at(5), updatedAt: at(5) },
];

test('the to-do list: going first, then on the list; done kept apart; plain saves and other members left out', () => {
  const { open, done } = toDo(saved, 'm');
  assert.deepEqual(open.map((s) => s.itemId), ['andes', 'alps']);
  assert.deepEqual(done.map((s) => s.itemId), ['atlas']);
  assert.deepEqual(savesOf(saved, 'm', 'goal').map((s) => s.itemId), ['atlas', 'andes', 'alps']);
});

test('every save shows in Activity, by the catalogue’s name for it', () => {
  SAVED_NAMES.goal = (id) => ({ alps: 'The Alps' })[id];
  const items = activity({ ...EMPTY_DB, saved }).filter((i) => i.kind === 'saved');
  assert.equal(items.length, saved.length);
  assert.equal(savedTitle(saved[0]), 'Put “The Alps” on their list');
  assert.equal(savedTitle(saved[1]), 'Going: “andes”', 'an item without a name shows its id');
  assert.equal(savedTitle(saved[3]), 'Saved “first-aid”');
  delete SAVED_NAMES.goal;
});
