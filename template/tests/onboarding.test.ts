/** Onboarding's engine (src/lib/onboarding.ts) and the app's steps (`ONBOARDING` in src/lib/progression.ts). Plain Node. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { onboardingAnswers, onboardingLine } from '../src/lib/activity';
import { answerProperties, asksAtOpen, dotsAt, freshWaiting, mergedRecord, offered, positionOf, skipProperties, stepAfter, stepBefore, stepById, stepsFor, toggled, typedDate, WAITING_HOURS, type Answers } from '../src/lib/onboarding';
import { ASSESSMENT, HOW_THEY_LEFT, LEVELS, ONBOARDING, assess, levelById, weekTime } from '../src/lib/progression';

const ids = (a: Answers) => stepsFor(ONBOARDING, a).map((s) => s.id);
const step = (id: string) => stepById(ONBOARDING, id)!;

test('the steps: unique ids, the opening first with the key value as a question, the end last', () => {
  const all = ONBOARDING.steps.map((s) => s.id);
  assert.equal(new Set(all).size, all.length);
  assert.equal(ONBOARDING.steps[0].kind, 'hello');
  assert.equal(ONBOARDING.steps.at(-1)!.kind, 'ready');
  assert.ok(ONBOARDING.hello.lines.length >= 1 && ONBOARDING.hello.lines[0].endsWith('?'));
  for (const s of ONBOARDING.steps) if (['choice', 'multi', 'grid'].includes(s.kind)) assert.ok(s.options?.length, `${s.id} has options`);
  for (const s of ONBOARDING.steps.filter((x) => x.kind === 'measure')) assert.ok(s.measure, `${s.id} says what it measures`);
  for (const s of ONBOARDING.steps.filter((x) => x.kind === 'commit')) assert.ok(s.commit, `${s.id} says its choices`);
});

test('every assessment question is a step, and its answers place a member on a real level', () => {
  for (const q of ASSESSMENT) assert.ok(step(q.id), q.id);
  const answers = Object.fromEntries(ASSESSMENT.map((q) => [q.id, q.answers.at(-1)!.label]));
  const p = ONBOARDING.profile!({ ...answers, goal: '  Run a 10k  ' });
  assert.equal(p.level, assess(answers));
  assert.ok(levelById(p.level));
  assert.equal(p.goal, 'Run a 10k');
  assert.deepEqual(ONBOARDING.profile!({}), {});
});

test('what they’re here for shapes the path: none of the training ends where they’re here for', () => {
  const full = ids({});
  assert.ok(full.includes('why') && full.at(-1) === 'ready');
  const elsewhere = ONBOARDING.steps.find((s) => s.kind === 'grid')!;
  const away = elsewhere.options!.map((o) => o.id).find((id) => ONBOARDING.landing({ [elsewhere.id]: [id] }));
  if (away) {
    assert.equal(stepAfter(ONBOARDING, elsewhere.id, { [elsewhere.id]: [away] }), null);
    assert.match(ONBOARDING.landing({ [elsewhere.id]: [away] })!, /^\//);
  }
  assert.equal(ONBOARDING.landing({}), null);
});

test('steps walk forward and back, and the dots count only the questions', () => {
  const path = ids({});
  assert.equal(stepAfter(ONBOARDING, path[0], {})!.id, path[1]);
  assert.equal(stepBefore(ONBOARDING, path[1], {})!.id, path[0]);
  assert.equal(stepBefore(ONBOARDING, path[0], {}), null);
  assert.deepEqual(dotsAt(ONBOARDING, path[1], {}), { at: 0, of: path.length - 2 });
  assert.equal(positionOf(ONBOARDING, path[0]), 1);
});

test('analytics hears ids and enums, never a date, a number measured or anything typed', () => {
  const choice = { id: 'c', kind: 'choice', title: 'C' } as const;
  assert.deepEqual(answerProperties(choice, 'a'), { step: 'c', answer: 'a' });
  assert.deepEqual(answerProperties({ ...choice, kind: 'grid' }, ['a', 'b']), { step: 'c', answer: 'a+b', count: 2 });
  assert.deepEqual(answerProperties({ ...choice, kind: 'commit' }, { days: 3, minutes: 30 }), { step: 'c', days: 3, minutes: 30 });
  assert.deepEqual(answerProperties({ ...choice, count: () => ({ goal: 'tour' }) }, 'secret-id'), { step: 'c', goal: 'tour' });
  for (const kind of ['date', 'measure', 'text', 'notify', 'why'] as const) assert.deepEqual(answerProperties({ ...choice, kind }, kind === 'measure' ? 42 : 'words'), { step: 'c' });
  assert.deepEqual(skipProperties('notify', { nativeEvent: {} }), { step: 'notify' });
  assert.deepEqual(skipProperties('notify', 'refused'), { step: 'notify', reason: 'refused' });
  for (const s of ONBOARDING.steps.filter((x) => x.kind === 'text')) assert.deepEqual(answerProperties(s, 'my words'), { step: s.id });
});

test('options can be offered on the answers; a grid or multi keeps their order, and none clears the rest', () => {
  const options = [{ id: 'none', label: 'None' }, { id: 'a', label: 'A' }, { id: 'b', label: 'B', when: (x: Answers) => x.show === 'yes' }];
  assert.deepEqual(offered(options, {}).map((o) => o.id), ['none', 'a']);
  assert.deepEqual(offered(options, { show: 'yes' }).map((o) => o.id), ['none', 'a', 'b']);
  assert.deepEqual(toggled(options, ['b'], 'a', 'none'), ['a', 'b']);
  assert.deepEqual(toggled(options, ['a'], 'none', 'none'), ['none']);
});

test('who is asked at open: a member who hasn’t opened it and has no program; never the team; signed out once a device', () => {
  assert.equal(asksAtOpen({ role: 'member', record: null, hasProgram: false, deviceSeen: true }), true);
  assert.equal(asksAtOpen({ role: 'member', record: { answers: {}, seenAt: 'x' }, hasProgram: false, deviceSeen: false }), false);
  assert.equal(asksAtOpen({ role: 'member', record: null, hasProgram: true, deviceSeen: false }), false);
  assert.equal(asksAtOpen({ role: 'owner', record: null, hasProgram: false, deviceSeen: false }), false);
  assert.equal(asksAtOpen({ role: 'coach', record: null, hasProgram: false, deviceSeen: false }), false);
  assert.equal(asksAtOpen({ role: null, record: null, hasProgram: false, deviceSeen: false }), true);
  assert.equal(asksAtOpen({ role: null, record: null, hasProgram: false, deviceSeen: true }), false);
});

test('answers given signed out wait a day for an account; the record keeps the first time it was opened', () => {
  const now = new Date('2026-11-25T12:00:00Z');
  const at = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();
  assert.equal(freshWaiting({ answers: { a: 'x' }, start: true, at: at(2) }, now)?.start, true);
  assert.equal(freshWaiting({ answers: {}, at: at(WAITING_HOURS + 1) }, now), null);
  assert.equal(freshWaiting(null, now), null);
  assert.deepEqual(mergedRecord({ answers: { a: '1' }, seenAt: 's' }, { answers: { b: '2' }, seenAt: 't', finishedAt: 'f', how: 'build' }), { answers: { a: '1', b: '2' }, seenAt: 's', finishedAt: 'f', how: 'build' });
});

test('a typed date is real and in the future', () => {
  const today = new Date('2026-11-25T00:00:00Z');
  assert.deepEqual(typedDate('14', '2', '2027', today), { iso: '2027-02-14' });
  assert.ok('problem' in typedDate('31', '4', '2027', today));
  assert.ok('problem' in typedDate('1', '1', '2020', today));
});

test('the end says where they start, from their answers', () => {
  const answers = Object.fromEntries(ASSESSMENT.map((q) => [q.id, q.answers[0].label]));
  const card = ONBOARDING.ready({ ...answers, week: { days: 4, minutes: 45 } });
  assert.ok(card.title.includes(LEVELS[0].title));
  assert.ok(card.facts.some((f) => f.includes('4')));
  assert.ok(card.action && card.actionSignedOut);
  assert.equal(weekTime(4 * 45), 'About 3 hours a week');
  for (const how of ['build', 'later', 'account']) assert.ok(HOW_THEY_LEFT[how], how);
});

test('the dashboard reads the answers back in words', () => {
  const q = ASSESSMENT[0];
  const r = { answers: { [q.id]: q.answers[1].label, interests: ['skills'], week: { days: 3, minutes: 30 } }, finishedAt: 'x', how: 'build' };
  const qa = onboardingAnswers(r);
  assert.equal(qa.find((x) => x.question === q.question)?.answer, q.answers[1].label);
  assert.equal(qa.find((x) => x.question === 'How much can you give it?')?.answer, '3 days a week, 30 minutes a session');
  assert.match(onboardingLine(r), /^Started\. Here for /);
});
