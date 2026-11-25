/** The dashboard's Overview and People's filters (src/lib/overview.ts). */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { cameFrom, inFilter, lastActive, overview, weekOf } from '../src/lib/overview';
import { EMPTY_DB, type DB, type User } from '../src/lib/types';

const NOW = new Date('2026-11-25T12:00:00Z'); // a Wednesday
const days = (n: number) => new Date(NOW.getTime() - n * 24 * 3600 * 1000).toISOString();
const member = (id: string, extra: Partial<User> = {}): User => ({ id, role: 'member', name: id, createdAt: days(40), ...extra });

const db: DB = {
  ...EMPTY_DB,
  users: [
    { id: 'own', role: 'owner', name: 'Owner', createdAt: days(100) },
    member('new', { createdAt: days(2), lastSeenAt: days(1), lastPlatform: 'ios', lastAppVersion: '1.2.0' }),
    member('payer', { plan: 'pro', planSource: 'stripe', lastSeenAt: days(20), lastPlatform: 'web' }),
    member('given', { plan: 'pro', planSource: 'owner', lastPlatform: 'android', lastAppVersion: '1.10.0', invitedBy: 'payer' }),
    member('quiet', { createdAt: days(90), cameFrom: 'instagram' }),
  ],
  entries: [{ id: 'e1', memberId: 'payer', title: 'Hello', createdAt: days(3), updatedAt: days(3) }],
  saved: [{ id: 's1', memberId: 'new', kind: 'goal', itemId: 'x', createdAt: days(1), updatedAt: days(1) }],
};

test('weeks start on Monday', () => {
  assert.equal(weekOf(NOW), '2026-11-23');
  assert.equal(weekOf(new Date('2026-11-23T00:00:00Z')), '2026-11-23');
  assert.equal(weekOf(new Date('2026-11-22T23:00:00Z')), '2026-11-16');
});

test('the numbers: members only, new this week and month, active from last seen or what they did', () => {
  const o = overview(db, NOW);
  assert.equal(o.members, 4);
  assert.equal(o.newThisWeek, 1);
  assert.equal(o.newThisMonth, 1);
  // new (seen and saved) and payer (wrote 3 days ago); payer's last seen is older but the entry counts.
  assert.equal(o.activeThisWeek, 2);
});

test('sign-ups by week: twelve Mondays, the oldest first, this week last', () => {
  const o = overview(db, NOW);
  assert.equal(o.signUpsByWeek.length, 12);
  assert.equal(o.signUpsByWeek[11].week, '2026-11-23');
  assert.equal(o.signUpsByWeek[11].count, 1);
  assert.equal(o.signUpsByWeek.reduce((n, w) => n + w.count, 0), 3, 'the one who joined 90 days ago is before the twelve weeks');
});

test('platforms and versions: where each member was last, versions newest first and only the apps’', () => {
  const o = overview(db, NOW);
  assert.deepEqual(o.platforms.map((p) => p.label).sort(), ['Android app', 'Web', 'iPhone app']);
  assert.deepEqual(o.versions.map((v) => v.label), ['1.10.0', '1.2.0']);
});

test('the funnel: signed up, did a first thing, paying through Stripe; Pro given is counted apart', () => {
  const o = overview(db, NOW);
  assert.deepEqual(o.funnel.map((f) => f.count), [4, 2, 1]);
  assert.equal(o.paying, 1);
  assert.equal(o.given, 1);
});

test('where they came from', () => {
  const name = (id: string) => (id === 'payer' ? 'Pat' : id);
  assert.equal(cameFrom(db.users[3], name), 'Invited by Pat');
  assert.equal(cameFrom(db.users[4], name), 'The “instagram” link');
  assert.equal(cameFrom(db.users[1], name), 'Straight in');
});

test('People’s filters', () => {
  const ids = (f: Parameters<typeof inFilter>[1]) => db.users.filter((u) => u.role === 'member' && inFilter(u, f, db, NOW)).map((u) => u.id);
  assert.deepEqual(ids('new'), ['new']);
  assert.deepEqual(ids('pro'), ['payer', 'given']);
  assert.deepEqual(ids('active'), ['new', 'payer']);
  assert.deepEqual(ids('quiet'), ['given', 'quiet']);
  assert.equal(lastActive(db.users[2], db), days(3));
});
