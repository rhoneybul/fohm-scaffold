/**
 * The progression: where someone starts, the levels they move through, the
 * skills in each, and the library. This is the product's coaching method made
 * into data: replace every word here with the coach's own (fohm-scaffold's
 * "progression" step checks this file has been made yours). Plain data and
 * logic, tested in Node (tests/progression.test.ts).
 */

// fohm:template-content (delete this line once the content below is the coach's own)

export interface Skill {
  id: string;
  title: string;
  /** Why it matters, in the coach's words. */
  why: string;
  /** What to practise. */
  drills: string[];
}

export interface Level {
  id: string;
  title: string;
  summary: string;
  skills: Skill[];
}

/** The levels, in order. Ids are stored on accounts and progress: never rename one that's in use. */
export const LEVELS: Level[] = [
  {
    id: 'start',
    title: 'Getting started',
    summary: 'The first things everyone needs, done safely and with confidence.',
    skills: [
      { id: 'start-basics', title: 'The basics', why: 'Everything else is built on this.', drills: ['Ten minutes on the fundamentals', 'Repeat until it feels easy'] },
      { id: 'start-routine', title: 'A routine you keep', why: 'Little and often beats once in a while.', drills: ['Pick three days this week', 'Check in after each one'] },
    ],
  },
  {
    id: 'building',
    title: 'Building',
    summary: 'Turning the basics into something reliable.',
    skills: [
      { id: 'building-consistency', title: 'Consistency', why: 'Doing it well most of the time, not once.', drills: ['Five good repetitions in a row', 'Film one and send it in'] },
      { id: 'building-feedback', title: 'Using feedback', why: 'The fastest way forward is someone who can see what you can’t.', drills: ['Send a clip to your coach', 'Practise the one thing they point out'] },
    ],
  },
  {
    id: 'progressing',
    title: 'Progressing',
    summary: 'Stretching into harder things, with a plan.',
    skills: [
      { id: 'progressing-challenge', title: 'A real challenge', why: 'Growth happens just past comfortable.', drills: ['Choose one stretch goal', 'Break it into three steps'] },
      { id: 'progressing-review', title: 'Reviewing your progress', why: 'Seeing how far you’ve come keeps you going.', drills: ['Look back at your check-ins', 'Write what has changed'] },
    ],
  },
];

/** The level assessment: each answer points at a level. The last answer chosen to the furthest question wins ties. */
export const ASSESSMENT: { id: string; question: string; answers: { label: string; level: string }[] }[] = [
  {
    id: 'experience',
    question: 'How much have you done before?',
    answers: [
      { label: 'Never, or only once or twice', level: 'start' },
      { label: 'A few times, and I know the basics', level: 'building' },
      { label: 'Regularly, and I want to push on', level: 'progressing' },
    ],
  },
  {
    id: 'confidence',
    question: 'How confident do you feel?',
    answers: [
      { label: 'Not yet', level: 'start' },
      { label: 'Getting there', level: 'building' },
      { label: 'Confident', level: 'progressing' },
    ],
  },
];

/** Drills, videos and notes anyone can open, in the coach's order. Links can point at existing content (YouTube, Instagram). */
export const LIBRARY: { id: string; title: string; kind: 'video' | 'drill' | 'note'; body: string; url?: string }[] = [
  { id: 'welcome', title: 'Welcome, and how this works', kind: 'note', body: 'Check in after you practise, work on the next skills on your path, and send your coach a clip when you want feedback.' },
  { id: 'warm-up', title: 'A five minute warm-up', kind: 'drill', body: 'Do this before every session.' },
];

export const levelById = (id?: string | null) => LEVELS.find((l) => l.id === id) ?? null;
export const allSkills = () => LEVELS.flatMap((l) => l.skills.map((s) => ({ ...s, levelId: l.id })));
export const skillById = (id?: string | null) => allSkills().find((s) => s.id === id) ?? null;

/** The level the answers point at: the furthest one any answer reaches by majority, earliest level on a tie. */
export function assess(answers: Record<string, string>): string {
  const votes = new Map<string, number>();
  for (const q of ASSESSMENT) {
    const level = q.answers.find((a) => a.label === answers[q.id])?.level;
    if (level) votes.set(level, (votes.get(level) ?? 0) + 1);
  }
  let best = LEVELS[0].id;
  let most = 0;
  for (const l of LEVELS) if ((votes.get(l.id) ?? 0) > most) [best, most] = [l.id, votes.get(l.id)!];
  return best;
}

/**
 * Where someone is now: their current level is the first, from where they
 * started, that still has skills left; next is up to three skills to work on.
 */
export function pathFor(startLevel: string | null | undefined, done: Set<string>) {
  const startIndex = Math.max(0, LEVELS.findIndex((l) => l.id === startLevel));
  const current = LEVELS.slice(startIndex).find((l) => l.skills.some((s) => !done.has(s.id))) ?? null;
  const next = current ? LEVELS.slice(startIndex).flatMap((l) => l.skills).filter((s) => !done.has(s.id)).slice(0, 3) : [];
  const total = LEVELS.slice(startIndex).flatMap((l) => l.skills).length;
  const finished = LEVELS.slice(startIndex).flatMap((l) => l.skills).filter((s) => done.has(s.id)).length;
  return { current, next, total, finished };
}

export const FEEL: Record<1 | 2 | 3, string> = { 1: 'Too hard', 2: 'About right', 3: 'Too easy' };
