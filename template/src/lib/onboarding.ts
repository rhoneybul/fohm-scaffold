/**
 * Onboarding's engine (docs/ONBOARDING.md), after Naz's (app/src/data/onboarding.js
 * in rhoneybul/naz): a new member's first open, one step to a screen. The
 * steps are data: each app writes its own (`ONBOARDING` in
 * src/lib/progression.ts) and src/app/onboarding.tsx draws them. This file
 * holds what every app's onboarding shares: which steps a member's answers
 * take them through, the progress dots, what an answer tells analytics (never
 * anything typed or measured), who is asked, and how long answers given
 * signed out wait for an account. Plain data and logic, tested in Node
 * (tests/onboarding.test.ts).
 */

/** An answer: an option's id, several ids, a number measured, a date (yyyy-mm-dd), words typed, or a commitment's numbers. */
export type Answer = string | number | string[] | Record<string, number>;
export type Answers = Record<string, Answer>;

/** A photo shown with its credit (the licence and author, as /credits lists it). */
export interface StepPhoto {
  /** A photo on the web, or one bundled with the app (a require()). */
  url?: string;
  source?: number;
  credit?: string;
}

export interface StepOption {
  id: string;
  label: string;
  line?: string;
  /** A Feather icon's name, for a grid tile or a row. */
  icon?: string;
  photo?: StepPhoto;
  /** Offered only when this is true of the answers so far. */
  when?: (answers: Answers) => boolean;
}

/** The options to show for these answers. */
export const offered = (options: StepOption[] | undefined, answers: Answers) => (options ?? []).filter((o) => !o.when || o.when(answers));

/**
 * How a step is drawn:
 *  - hello: the opening, a line to a screen over a photo (the app's key value as a question first)
 *  - choice: one answer from rows (`search` adds a field that narrows a long list; `pinned` stay above it)
 *  - multi: any answers from rows (`none` is the one that clears the rest)
 *  - grid: any answers as tiles, a word each: what they're here for
 *  - why: what the training does, from the research, for what they chose
 *  - date: a day, month and year, or `notBooked`
 *  - measure: a first number taken there and then: a timer, then the count typed in
 *  - commit: days a week and minutes a session, and the time that comes to
 *  - notify: asks to send a notification, only where the device can be asked now
 *  - text: words typed, optional (never sent to analytics)
 *  - ready: the end: what they get, and the way into it
 */
export type StepKind = 'hello' | 'choice' | 'multi' | 'grid' | 'why' | 'date' | 'measure' | 'commit' | 'notify' | 'text' | 'ready';

export interface OnboardingStep {
  /** Stable: the answer's key, the URL's ?step= and the funnel's step. Never rename one that's in use. */
  id: string;
  kind: StepKind;
  title: string;
  line?: string;
  options?: StepOption[];
  /** choice: rows that stay above the search, and the field's words. */
  pinned?: StepOption[];
  search?: { label: string; placeholder: string };
  /** multi: the option that means none of the others. */
  none?: StepOption;
  /** date: the row that answers it without a date, and what a date means ("That gives you 12 weeks"). */
  notBooked?: StepOption;
  describe?: (iso: string) => string;
  /** measure: how long the timer runs, what's counted, and how to do it. */
  measure?: { seconds: number; unit: string; how: string; max: number };
  /** commit: the choices, and where they start. */
  commit?: { days: number[]; minutes: number[]; firstDays: number; firstMinutes: number };
  /** A line under the step that must be there (safety copy). */
  note?: string;
  /** text: an example in the empty field. commit: the line under the time. notify: the notification it shows, as an example. */
  placeholder?: string;
  after?: string;
  preview?: { title: string; line: string };
  /** Asked only when this is true of the answers so far. */
  when?: (answers: Answers) => boolean;
  /** What the answer tells analytics, in ids and enums; leave it out to send the option's id (choice, grid, multi, commit only). */
  count?: (answer: Answer) => Record<string, string | number | boolean>;
}

/** A row on the why step: what training does, in a sentence from the research. */
export interface WhyRow {
  id: string;
  icon: string;
  title: string;
  line: string;
}

/** The end: what the member gets from their answers. */
export interface ReadyCard {
  photo?: StepPhoto;
  title: string;
  line: string;
  facts: string[];
  /** What it builds up to, a sentence each. */
  upTo: string[];
  /** A line that must be there, under it (safety copy). */
  note?: string;
  /** The action's words: signed in it starts at once; signed out it asks for an account first. */
  action: string;
  actionSignedOut: string;
}

export interface Onboarding {
  /** The opening's lines (the first is the app's key value, as a question) and its photo. */
  hello: { lines: string[]; photo?: StepPhoto };
  steps: OnboardingStep[];
  /** The why step's rows for these answers, its footnote and its safety line. */
  why(answers: Answers): { rows: WhyRow[]; footnote: string; note?: string };
  ready(answers: Answers): ReadyCard;
  /** Where the end's action goes once the answers are saved (default /home). An app with programs starts one from the answers instead (Strawberry Fields' src/app/onboarding.tsx). */
  end?: string;
  /** Where a member here for none of the training goes once the questions it needs are answered (null: on to the end). */
  landing(answers: Answers): string | null;
  /** What the answers set on the account besides themselves (the level they place a member at, their goal), saved with each answer. */
  profile?(answers: Answers): { level?: string; assessment?: Record<string, string>; goal?: string };
}

export const HELLO = 'hello';
export const READY = 'ready';

/** The steps these answers take a member through, the opening first and the end last. */
export function stepsFor(flow: Onboarding, answers: Answers): OnboardingStep[] {
  return flow.steps.filter((s) => !s.when || s.when(answers));
}

export const stepById = (flow: Onboarding, id: string | undefined | null) => flow.steps.find((s) => s.id === id) ?? null;

/** The step after this one on their path, or null at its end. */
export function stepAfter(flow: Onboarding, id: string, answers: Answers): OnboardingStep | null {
  const steps = stepsFor(flow, answers);
  const at = steps.findIndex((s) => s.id === id);
  return at < 0 ? null : steps[at + 1] ?? null;
}

/** The step before this one, or null at the opening. */
export function stepBefore(flow: Onboarding, id: string, answers: Answers): OnboardingStep | null {
  const steps = stepsFor(flow, answers);
  const at = steps.findIndex((s) => s.id === id);
  return at <= 0 ? null : steps[at - 1];
}

/** The dots count every step between the opening and the end. */
export function dotsAt(flow: Onboarding, id: string, answers: Answers): { at: number; of: number } {
  const dotted = stepsFor(flow, answers).filter((s) => s.kind !== 'hello' && s.kind !== 'ready');
  return { at: dotted.findIndex((s) => s.id === id), of: dotted.length };
}

/** Where a step sits in the whole flow, 1 for the opening, for the funnel (a step a member skips keeps its place). */
export const positionOf = (flow: Onboarding, id: string) => flow.steps.findIndex((s) => s.id === id) + 1;

/** Kinds whose answer is a choice of the app's own ids, safe to count; the rest (a date, a number, words) send only that they were answered. */
const COUNTED: StepKind[] = ['choice', 'multi', 'grid', 'commit'];

/** What an answer tells analytics: ids and enums, never a date, a number measured or anything typed. */
export function answerProperties(step: OnboardingStep, answer: Answer | undefined): Record<string, string | number | boolean> {
  const base = { step: step.id };
  if (answer === undefined || !COUNTED.includes(step.kind)) return base;
  if (step.count) return { ...base, ...step.count(answer) };
  if (Array.isArray(answer)) return { ...base, answer: answer.join('+') || 'none', count: answer.length };
  if (typeof answer === 'object') return { ...base, ...answer };
  return { ...base, answer: String(answer) };
}

/** A skip's reason is one of the app's own words ('unsupported', 'refused'), never what a button handed over. */
export const skipProperties = (step: string, reason?: unknown) => ({ step, ...(typeof reason === 'string' ? { reason } : {}) });

/** A grid or multi answer with one option turned on or off, kept in the options' order. */
export function toggled(options: StepOption[], chosen: string[], id: string, none?: string): string[] {
  if (id === none) return [none];
  const on = chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id];
  return options.map((o) => o.id).filter((x) => x !== none && on.includes(x));
}

/** What the account keeps of onboarding (`onboarding` on the account): the answers as given, and when it was opened and finished. */
export interface OnboardingRecord {
  answers: Answers;
  seenAt?: string;
  finishedAt?: string;
  /** How they left: 'build' (into what the end starts), 'later' (Skip on the opening, or to look around), 'account' (I already have an account), or where they're here for. */
  how?: string;
}

/**
 * Who's asked at open: a member, never the team, with no program yet, who
 * hasn't been through it on this account (`seenAt`) or, signed out, on this
 * device. Opening it at all counts: leaving any way is not asked again.
 */
export function asksAtOpen({ role, record, hasProgram, deviceSeen }: { role?: string | null; record?: OnboardingRecord | null; hasProgram: boolean; deviceSeen: boolean }): boolean {
  if (!role) return !deviceSeen;
  if (role !== 'member' || hasProgram) return false;
  return !record?.seenAt;
}

/** Answers given signed out wait this long on the device for an account, then go. */
export const WAITING_HOURS = 24;

export interface Waiting {
  answers: Answers;
  /** They asked for what the end starts (a program), so it starts once they're signed in. */
  start: boolean;
  at: string;
}

/** Waiting answers still fresh enough to carry on, or null. */
export function freshWaiting(raw: unknown, now: Date = new Date()): Waiting | null {
  if (!raw || typeof raw !== 'object') return null;
  const w = raw as Partial<Waiting>;
  if (!w.answers || typeof w.answers !== 'object' || typeof w.at !== 'string') return null;
  const age = now.getTime() - new Date(w.at).getTime();
  if (!(age >= 0 && age <= WAITING_HOURS * 3_600_000)) return null;
  return { answers: w.answers as Answers, start: !!w.start, at: w.at };
}

/** The account's record with these answers merged in (the latest answer to a step wins) and the times kept. */
export function mergedRecord(record: OnboardingRecord | null | undefined, patch: Partial<OnboardingRecord>): OnboardingRecord {
  return {
    ...(record ?? {}),
    ...patch,
    answers: { ...(record?.answers ?? {}), ...(patch.answers ?? {}) },
    seenAt: record?.seenAt ?? patch.seenAt,
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

/** A date typed as day, month and year: yyyy-mm-dd, or what's wrong with it. */
export function typedDate(day: string, month: string, year: string, today: Date = new Date()): { iso: string } | { problem: string } {
  if (!day || !month || year.length !== 4) return { problem: 'Enter the day, month and year.' };
  const iso = `${year}-${pad(Number(month))}-${pad(Number(day))}`;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) return { problem: 'That date doesn’t exist.' };
  if (iso <= today.toISOString().slice(0, 10)) return { problem: 'Pick a date in the future.' };
  return { iso };
}
