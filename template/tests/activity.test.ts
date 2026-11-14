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
  checkins: [{ id: 'c1', memberId: 'm', date: '2026-01-07', skillId: 'start-basics', minutes: 20, feel: 1, note: 'Struggled', createdAt: '2026-01-07T00:00:00Z' }],
  progress: [{ id: 'p1', memberId: 'm', skillId: 'start-basics', doneAt: '2026-01-08T00:00:00Z', createdAt: '2026-01-08T00:00:00Z' }],
  ai: [{ id: 'a1', memberId: 'm', question: 'How do I start?', answer: 'Like this.', createdAt: '2026-01-06T00:00:00Z' }],
  devices: [],
};

test('a member joining shows in Activity; owners do not', () => {
  const joined = activity(db).filter((i) => i.kind === 'joined');
  assert.deepEqual(joined.map((i) => i.memberId), ['m']);
});

test('every entry shows in Activity, with what the member wrote, newest first', () => {
  const items = activity(db).filter((i) => i.kind === 'entry' || i.kind === 'joined');
  assert.deepEqual(items.map((i) => i.id), ['entry-e2', 'entry-e1', 'joined-m']);
  assert.equal(items[1].text, 'Hello');
});

test('an entry without a reply, and a check-in that felt too hard, need the owner', () => {
  assert.deepEqual(needsYou(db).map((i) => i.id), ['entry-e1', 'checkin-c1']);
});

test('check-ins, skills got and the assessment show in Activity', () => {
  const byId = Object.fromEntries(activity({ ...db, users: db.users.map((u) => (u.id === 'm' ? { ...u, level: 'start', goal: 'Get going', assessedAt: '2026-01-02T01:00:00Z' } : u)) }).map((i) => [i.id, i]));
  assert.equal(byId['checkin-c1'].title, 'Practised “The basics” for 20 min: too hard');
  assert.equal(byId['checkin-c1'].text, 'Struggled');
  assert.equal(byId['progress-p1'].title, 'Got “The basics”');
  assert.equal(byId['assessed-m'].title, 'Started at “Getting started”');
  assert.equal(byId['assessed-m'].text, 'Goal: Get going');
});

test('a clip shows as a clip, with its link', () => {
  const item = activity({ ...db, entries: [{ ...db.entries[0], link: 'https://youtu.be/x' }] }).find((i) => i.kind === 'entry')!;
  assert.match(item.title, /^Sent a clip/);
  assert.match(item.text!, /youtu\.be/);
});

test('every game played shows in Activity, with its points', () => {
  const [item] = activity(db).filter((i) => i.kind === 'score');
  assert.equal(item.title, 'Played catch-the-dot: 42 points');
  assert.equal(item.memberId, 'm');
});

test('every question to the AI assistant shows in Activity, with the answer', () => {
  const [item] = activity(db).filter((i) => i.kind === 'ai');
  assert.equal(item.title, 'Asked the AI assistant: “How do I start?”');
  assert.equal(item.text, 'Like this.');
});

test('a second paid subscription needs the owner', () => {
  const extra = { ...db, users: db.users.map((u) => (u.id === 'm' ? { ...u, stripeExtraSubscription: 'sub_2' } : u)) };
  assert.ok(needsYou(extra).some((i) => i.id === 'extra-m'));
});

test('an uploaded video shows as a video, and a video reply counts as a reply', () => {
  const withVideo = { ...db, entries: [{ ...db.entries[0], mediaPath: 'u/clip.mp4', mediaType: 'video' as const }] };
  const item = activity(withVideo).find((i) => i.kind === 'entry')!;
  assert.match(item.title, /^Sent a video: /);
  assert.equal(item.needsReply, true);
  const replied = { ...withVideo, entries: [{ ...withVideo.entries[0], replyMediaPath: 'c/answer.mp4' }] };
  assert.equal(activity(replied).find((i) => i.kind === 'entry')!.needsReply, false);
});

test('with coaches, a member nobody coaches needs the owner', () => {
  const withCoach = { ...db, users: [...db.users, { id: 'c', role: 'coach' as const, name: 'Coach', createdAt: '2026-01-01T00:00:00Z' }] };
  assert.ok(needsYou(withCoach).some((i) => i.id === 'unassigned-m'));
  assert.ok(!needsYou(db).some((i) => i.id === 'unassigned-m'), 'no coaches, no assigning');
  const assigned = { ...withCoach, users: withCoach.users.map((u) => (u.id === 'm' ? { ...u, coachId: 'c' } : u)) };
  assert.ok(!needsYou(assigned).some((i) => i.id === 'unassigned-m'));
});
