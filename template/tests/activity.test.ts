/**
 * The Activity feed holds every kind of member content. A new kind of thing a
 * member creates gets its case here (AGENTS.md). Plain Node: npm test.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { activity, needsYou } from '../src/lib/activity';
import { EMPTY_DB, type DB } from '../src/lib/types';

const db: DB = {
  ...EMPTY_DB,
  users: [
    { id: 'o', role: 'owner', name: 'Owner', createdAt: '2026-01-01T00:00:00Z' },
    { id: 'm', role: 'member', name: 'Mia', createdAt: '2026-01-02T00:00:00Z' },
  ],
  entries: [
    { id: 'e1', memberId: 'm', title: 'First', body: 'Hello', createdAt: '2026-01-03T00:00:00Z', updatedAt: '2026-01-03T00:00:00Z' },
    { id: 'e2', memberId: 'm', title: 'Second', reply: 'Nice', createdAt: '2026-01-04T00:00:00Z', updatedAt: '2026-01-04T00:00:00Z' },
  ],
  scores: [{ id: 's1', memberId: 'm', game: 'catch-the-dot', points: 42, seconds: 30, createdAt: '2026-01-05T00:00:00Z' }],
};

test('a member joining shows in Activity; owners do not', () => {
  const joined = activity(db).filter((i) => i.kind === 'joined');
  assert.deepEqual(joined.map((i) => i.memberId), ['m']);
});

test('every entry shows in Activity, with what the member wrote, newest first', () => {
  const items = activity(db).filter((i) => i.kind !== 'score');
  assert.deepEqual(items.map((i) => i.id), ['entry-e2', 'entry-e1', 'joined-m']);
  assert.equal(items[1].text, 'Hello');
});

test('an entry without a reply needs the owner', () => {
  assert.deepEqual(needsYou(db).map((i) => i.id), ['entry-e1']);
});

test('every game played shows in Activity, with its points', () => {
  const [item] = activity(db).filter((i) => i.kind === 'score');
  assert.equal(item.title, 'Played catch-the-dot: 42 points');
  assert.equal(item.memberId, 'm');
});
