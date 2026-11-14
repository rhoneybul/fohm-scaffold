/** The example game's rules (src/lib/game.ts). Plain Node: npm test. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { DOT_SIZE, bestScore, caught, dotMillis, missed, newGame, place } from '../src/lib/game';

test('each catch in a row is worth one more point; a miss ends the streak', () => {
  let s = newGame();
  s = caught(caught(caught(s))); // 1 + 2 + 3
  assert.equal(s.points, 6);
  s = missed(s);
  s = caught(s);
  assert.deepEqual({ points: s.points, streak: s.streak, best: s.best, catches: s.catches, misses: s.misses }, { points: 7, streak: 1, best: 3, catches: 4, misses: 1 });
});

test('the dot speeds up with the streak, but not past 450 ms', () => {
  assert.equal(dotMillis(0), 1200);
  assert.ok(dotMillis(5) < dotMillis(0));
  assert.equal(dotMillis(100), 450);
});

test('the dot always fits on the board', () => {
  assert.deepEqual(place(300, 400, () => 1), { x: 300 - DOT_SIZE, y: 400 - DOT_SIZE });
  assert.deepEqual(place(10, 10, () => 1), { x: 0, y: 0 });
});

test('best score is the highest round', () => {
  assert.equal(bestScore([{ points: 3 }, { points: 12 }, { points: 7 }]), 12);
  assert.equal(bestScore([]), 0);
});
