/**
 * What Home shows, worked out from the store: the greeting, this week's days
 * with something done, and a new member's first steps. Pure, tested in
 * tests/home.test.ts.
 */
const DAY = 86_400_000;

const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** 0 (Monday) to 6 (Sunday). */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

/** Monday to Sunday of this week: whether anything was done that day (local time). */
export function weekDone(done: { createdAt: string }[], now: Date): boolean[] {
  const monday = midnight(now).getTime() - weekdayIndex(now) * DAY;
  const days = [false, false, false, false, false, false, false];
  for (const d of done) {
    const i = Math.round((midnight(new Date(d.createdAt)).getTime() - monday) / DAY);
    if (i >= 0 && i < 7) days[i] = true;
  }
  return days;
}

/** Morning, afternoon or evening, and the first name. */
export function greeting(now: Date, name: string) {
  const h = now.getHours();
  const part = h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
  const first = name.trim().split(/\s+/)[0];
  return first ? `${part}, ${first}` : part;
}

export interface Step {
  id: string;
  title: string;
  line: string;
  done: boolean;
  href: string;
}

/** What a member has done so far, for their first steps. */
export interface Started {
  kind: 'coaching' | 'app' | 'game';
  placed: boolean;
  checkins: number;
  entries: number;
  scores: number;
  photo: boolean;
  /** Whether there's a real person to send things to (`APP.coach`). */
  coach: boolean;
  ownerWord: string;
}

/** A new member's first three steps for this kind of app; the checklist goes once all are done. */
export function firstSteps(s: Started): Step[] {
  const photo: Step = { id: 'photo', title: 'Add a photo of you', line: 'It goes on your account', done: s.photo, href: '/account' };
  if (s.kind === 'coaching')
    return [
      { id: 'place', title: 'Find your level', line: 'A few questions, to see where you start', done: s.placed, href: '/onboarding' },
      { id: 'checkin', title: 'Check in after you practise', line: 'How it went, in a tap', done: s.checkins > 0, href: '/checkin' },
      s.coach ? { id: 'ask', title: `Ask your ${s.ownerWord} something`, line: 'A question, or a clip for feedback', done: s.entries > 0, href: '/write' } : photo,
    ];
  if (s.kind === 'game')
    return [{ id: 'play', title: 'Play a round', line: 'Your best score shows here', done: s.scores > 0, href: '/game' }, photo];
  return [{ id: 'write', title: 'Write your first one', line: 'It shows here, with any reply', done: s.entries > 0, href: '/write' }, photo];
}
