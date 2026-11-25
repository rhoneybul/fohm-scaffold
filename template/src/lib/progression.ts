/**
 * The progression: where someone starts, the levels they move through, the
 * skills in each, and the library. This is the product's coaching method made
 * into data: replace every word here with the coach's own (fohm-scaffold's
 * new-app skill says how, and deletes the line below once it's yours). Plain data and
 * logic, tested in Node (tests/progression.test.ts).
 */

import { APP } from './brand';
import type { Answers, Onboarding, StepOption, WhyRow } from './onboarding';
import { creditLine, firstShown, type CreditedPhoto } from './photos';

// fohm:template-content (delete this line once the content below is the coach's own)

export interface Skill {
  id: string;
  title: string;
  /** Why it matters, in the coach's words. */
  why: string;
  /** What to practise. */
  drills: string[];
  /** Photos of it, best first: open licence and credit each (src/lib/photos.ts); the first that may be shown leads Home's Up next. */
  photos?: CreditedPhoto[];
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

// ---------------------------------------------------------------------------
// Onboarding: a new member's first open (docs/ONBOARDING.md), drawn by
// src/app/onboarding.tsx from these steps with the engine in
// src/lib/onboarding.ts. Naz's shape: the opening over a photo, the key value
// as a question; straight questions one to a screen; what they're here for,
// which shapes the rest; why it works; the week they can give; and the end:
// where they start, and the way in. Replace the words with the app's own
// (docs/ONBOARDING.md says how; an app with programs ends on one building).
// ---------------------------------------------------------------------------

/** What a member is here for, a word each: the training first, then the parts of the app that need none (`landing`). */
export const INTERESTS: StepOption[] = [
  { id: 'skills', label: 'New skills', icon: 'award' },
  { id: 'routine', label: 'A routine I keep', icon: 'repeat' },
  { id: 'confidence', label: 'Confidence', icon: 'smile' },
  { id: 'feedback', label: 'Feedback', icon: 'message-circle' },
  { id: 'library', label: 'The library', icon: 'book-open' },
];
const TRAINING = ['skills', 'routine', 'confidence', 'feedback'];
const interestsOf = (a: Answers) => (Array.isArray(a.interests) ? a.interests : []);
/** The path through the questions is for anyone here for any of the training, or who didn't say. */
export const wantsTraining = (a: Answers) => !interestsOf(a).length || interestsOf(a).some((i) => TRAINING.includes(i));

/**
 * Why it works, one row per thing they're here for: in the method's own
 * words (each level's first skill and why it matters), never a number the
 * research doesn't give. An app with research writes these from it, each
 * row naming its source (Strawberry Fields' WHY_ROWS).
 */
export function whyRowsFor(a: Answers): WhyRow[] {
  return LEVELS.map((l) => l.skills[0]).filter(Boolean).map((s) => ({ id: s.id, icon: 'check-circle', title: s.title, line: s.why }));
}

const OPENING_PHOTO = (() => {
  const p = firstShown(APP.heroPhoto);
  return p ? { url: p.url, credit: creditLine(p), credited: p } : undefined;
})();

/** The answers to the assessment's questions, as `assess` reads them. */
const assessmentOf = (a: Answers): Record<string, string> => Object.fromEntries(ASSESSMENT.filter((q) => typeof a[q.id] === 'string').map((q) => [q.id, a[q.id] as string]));

/** The level the answers start a member at (the first, before they're answered). */
const startingLevel = (a: Answers) => levelById(assess(assessmentOf(a))) ?? LEVELS[0];

/** "About 2 hours a week", "About 90 minutes a week". */
export function weekTime(minutes: number): string {
  if (minutes < 105) return `About ${Math.round(minutes / 15) * 15} minutes a week`;
  const hours = Math.round(minutes / 30) / 2;
  return `About ${hours} hour${hours === 1 ? '' : 's'} a week`;
}

const FIRST_DAYS = 3;
const FIRST_MINUTES = 30;

export const ONBOARDING: Onboarding = {
  hello: {
    lines: ['Want to get better at it, week by week?', 'It’s built a little at a time: the basics first, a routine you keep, and someone who can see what you can’t.', `${APP.name} starts you at your level and shows you what to do next.`],
    photo: OPENING_PHOTO,
  },
  steps: [
    { id: 'hello', kind: 'hello', title: 'Welcome' },
    // The level assessment, a question to a screen: each answer's id is its label, as `assess` reads it.
    ...ASSESSMENT.map((q) => ({ id: q.id, kind: 'choice' as const, title: q.question, options: q.answers.map((x) => ({ id: x.label, label: x.label })) })),
    { id: 'interests', kind: 'grid', title: 'What are you here for?', line: 'Pick any. We put them first.', options: INTERESTS },
    { id: 'why', kind: 'why', title: 'How it works', line: 'What you’ll work on, and why it matters:', when: wantsTraining },
    {
      id: 'week',
      kind: 'commit',
      title: 'How much can you give it?',
      line: 'Be honest: a routine you keep beats one you don’t.',
      commit: { days: [2, 3, 4, 5, 6], minutes: [15, 30, 45, 60], firstDays: FIRST_DAYS, firstMinutes: FIRST_MINUTES },
      after: 'Start where it fits your week. You can change it any time.',
      when: wantsTraining,
    },
    { id: 'notify', kind: 'notify', title: 'Know when there’s something new', line: 'We’ll tell you here when there’s a reply or something new for you.', preview: { title: 'Something new for you', line: 'Open it to see what’s next.' }, when: wantsTraining },
    { id: 'goal', kind: 'text', title: 'What do you want to get to?', line: 'In a sentence. Optional.', placeholder: 'For example: comfortable at the next level by summer.', when: wantsTraining },
    { id: 'ready', kind: 'ready', title: 'Where you start', when: wantsTraining },
  ],
  why: (a) => ({ rows: whyRowsFor(a), footnote: 'In the words of the method you’ll follow.' }),
  ready(a) {
    const level = startingLevel(a);
    const week = (a.week && typeof a.week === 'object' && !Array.isArray(a.week) ? a.week : {}) as Record<string, number>;
    return {
      photo: OPENING_PHOTO,
      title: `You’ll start at ${level.title}`,
      line: level.summary,
      facts: [`${week.days ?? FIRST_DAYS} days a week`, `${week.minutes ?? FIRST_MINUTES} minutes a time`],
      upTo: pathFor(level.id, new Set()).next.map((s) => `${s.title}: ${s.why}`),
      action: 'Start',
      actionSignedOut: 'Create an account to start',
    };
  },
  signUpLine: (a) => `You’ll start at ${startingLevel(a).title} as soon as you’re in.`,
  landing: (a) => (wantsTraining(a) ? null : '/library'),
  profile(a) {
    const assessment = assessmentOf(a);
    return {
      ...(Object.keys(assessment).length ? { level: assess(assessment), assessment } : {}),
      ...(typeof a.goal === 'string' && a.goal.trim() ? { goal: a.goal.trim().slice(0, 200) } : {}),
    };
  },
};

/** How a member left onboarding, in words for the dashboard (`how` on their record). */
export const HOW_THEY_LEFT: Record<string, string> = {
  build: 'Started',
  later: 'Skipped to look around',
  account: 'Signed in to an account they had',
  '/library': 'Went to the library',
};
