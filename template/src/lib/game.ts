/**
 * The example game's rules, kept apart from the screen so they're tested in
 * Node (tests/game.test.ts). "Catch the dot": a dot jumps around the board;
 * tap it before it moves. Each catch in a row is worth one more point than the
 * last; a miss ends the streak. Replace this with your own game, and keep
 * saving each finished round through saveScore, so the dashboard sees it.
 */
export const GAME_ID = 'catch-the-dot';
export const GAME_NAME = 'Catch the dot';
export const ROUND_SECONDS = 30;
export const DOT_SIZE = 64;

export interface GameState {
  points: number;
  streak: number;
  best: number; // best streak this round
  catches: number;
  misses: number;
}

export const newGame = (): GameState => ({ points: 0, streak: 0, best: 0, catches: 0, misses: 0 });

export function caught(s: GameState): GameState {
  const streak = s.streak + 1;
  return { ...s, points: s.points + streak, streak, best: Math.max(s.best, streak), catches: s.catches + 1 };
}

export const missed = (s: GameState): GameState => ({ ...s, streak: 0, misses: s.misses + 1 });

/** The dot moves faster as the streak grows, never quicker than 450 ms. */
export const dotMillis = (streak: number) => Math.max(450, 1200 - streak * 60);

/** Somewhere on the board the whole dot fits. `rand` is injectable for tests. */
export function place(width: number, height: number, rand: () => number = Math.random) {
  return { x: Math.round(rand() * Math.max(0, width - DOT_SIZE)), y: Math.round(rand() * Math.max(0, height - DOT_SIZE)) };
}

export const bestScore = (scores: { points: number }[]) => scores.reduce((m, s) => Math.max(m, s.points), 0);
