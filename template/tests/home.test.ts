/** What Home shows (src/lib/home.ts). Plain Node: npm test. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { firstSteps, greeting, weekDone } from '../src/lib/home';

test('the week runs Monday to Sunday and marks the days with something done', () => {
  const wed = new Date(2026, 10, 25, 15); // a Wednesday
  const days = weekDone([{ createdAt: new Date(2026, 10, 23, 9).toISOString() }, { createdAt: new Date(2026, 10, 25, 8).toISOString() }, { createdAt: new Date(2026, 10, 22, 9).toISOString() }], wed);
  assert.deepEqual(days, [true, false, true, false, false, false, false], 'Monday and Wednesday; last Sunday is last week');
});

test('the greeting uses the first name and the time of day', () => {
  assert.equal(greeting(new Date(2026, 0, 1, 8), 'Sam Lee'), 'Morning, Sam');
  assert.equal(greeting(new Date(2026, 0, 1, 20), ''), 'Evening');
});

const base = { kind: 'coaching' as const, placed: false, checkins: 0, entries: 0, scores: 0, photo: false, coach: true, ownerWord: 'coach' };

test('a coaching app asks the member to find their level, check in and ask their coach', () => {
  const steps = firstSteps(base);
  assert.deepEqual(steps.map((s) => s.id), ['place', 'checkin', 'ask']);
  assert.ok(steps.every((s) => !s.done));
  assert.ok(firstSteps({ ...base, placed: true, checkins: 1, entries: 2 }).every((s) => s.done));
});

test('with no real coach, nobody is offered to ask one', () => {
  const steps = firstSteps({ ...base, coach: false });
  assert.ok(!steps.some((s) => /coach/i.test(s.title)));
  assert.equal(steps[2].id, 'photo');
});

test('a game asks for a round and a photo', () => {
  assert.deepEqual(firstSteps({ ...base, kind: 'game', scores: 1 }).map((s) => [s.id, s.done]), [['play', true], ['photo', false]]);
});
