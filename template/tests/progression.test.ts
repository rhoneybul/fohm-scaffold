/** The progression's logic (src/lib/progression.ts). Plain Node: npm test. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ASSESSMENT, LEVELS, allSkills, assess, pathFor } from '../src/lib/progression';

test('every level and skill id is unique (they are stored on accounts and progress)', () => {
  const ids = [...LEVELS.map((l) => l.id), ...allSkills().map((s) => s.id)];
  assert.equal(new Set(ids).size, ids.length);
});

test('every assessment answer points at a real level', () => {
  for (const q of ASSESSMENT) for (const a of q.answers) assert.ok(LEVELS.some((l) => l.id === a.level), `${q.id}: ${a.label}`);
});

test('the assessment places people by most answers, earliest level on a tie', () => {
  const pick = (levelIds: string[]) => Object.fromEntries(ASSESSMENT.map((q, i) => [q.id, q.answers.find((a) => a.level === levelIds[i])!.label]));
  assert.equal(assess(pick(ASSESSMENT.map(() => LEVELS[0].id))), LEVELS[0].id);
  assert.equal(assess(pick(ASSESSMENT.map(() => LEVELS[2].id))), LEVELS[2].id);
  assert.equal(assess({}), LEVELS[0].id, 'no answers: the start');
});

test('the path starts where they were placed and offers the next three skills not got', () => {
  const start = LEVELS[1];
  const p = pathFor(start.id, new Set());
  assert.equal(p.current?.id, start.id);
  assert.equal(p.next.length, Math.min(3, LEVELS.slice(1).flatMap((l) => l.skills).length));
  const all = pathFor(start.id, new Set(allSkills().map((s) => s.id)));
  assert.equal(all.current, null);
  assert.equal(all.finished, all.total);
});
