import { activity, platformLabel } from './activity';
import { isPro, type DB, type User } from './types';

/**
 * The dashboard's Overview, Naz's in the template's terms: members, who's
 * new and who came back this week, sign-ups by week, what they're on, and
 * the funnel from signing up to a first action to paying. Read from the
 * same data as People and Activity, so a coach's Overview counts only their
 * own members. Plain logic, tested in Node (tests/overview.test.ts).
 */
const DAY = 24 * 3600 * 1000;
const WEEKS = 12;

export interface Overview {
  members: number;
  newThisWeek: number;
  newThisMonth: number;
  /** In the app, or did something, in the last 7 days. */
  activeThisWeek: number;
  /** Twelve weeks of sign-ups, Mondays, the oldest first. */
  signUpsByWeek: { week: string; count: number }[];
  /** Where members were last: the web, iPhone or Android. */
  platforms: { label: string; count: number }[];
  /** The app's versions members were last on, the newest first. */
  versions: { label: string; count: number }[];
  /** Signed up, then did a first thing, then paid. */
  funnel: { label: string; count: number; line?: string }[];
  /** Pro now: paid through Stripe, and given by the owner. */
  paying: number;
  given: number;
}

/** The Monday (UTC) of the week a time falls in, as yyyy-mm-dd. */
export function weekOf(t: Date): string {
  const d = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const byCount = (counts: Map<string, number>) => [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

/** "1.2.10" after "1.2.9": versions compared part by part. */
const newerFirst = (a: string, b: string) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) if ((pb[i] ?? 0) !== (pa[i] ?? 0)) return (pb[i] ?? 0) - (pa[i] ?? 0);
  return 0;
};

export function overview(db: DB, now = new Date()): Overview {
  const members = db.users.filter((u) => u.role === 'member');
  const ago = (iso: string | undefined, days: number) => !!iso && now.getTime() - new Date(iso).getTime() <= days * DAY;
  const feed = activity(db).filter((i) => i.kind !== 'joined');
  const didSomething = new Set(feed.map((i) => i.memberId));
  const activeIds = new Set([...members.filter((u) => ago(u.lastSeenAt, 7)).map((u) => u.id), ...feed.filter((i) => ago(i.at, 7)).map((i) => i.memberId)]);

  const thisWeek = weekOf(now);
  const signUpsByWeek = Array.from({ length: WEEKS }, (_, i) => {
    const d = new Date(`${thisWeek}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7 * (WEEKS - 1 - i));
    return { week: d.toISOString().slice(0, 10), count: 0 };
  });
  for (const u of members) {
    const w = signUpsByWeek.find((x) => x.week === weekOf(new Date(u.createdAt)));
    if (w) w.count++;
  }

  const platforms = new Map<string, number>();
  const versions = new Map<string, number>();
  for (const u of members) {
    if (!u.lastPlatform) continue;
    const where = platformLabel({ lastPlatform: u.lastPlatform });
    platforms.set(where, (platforms.get(where) ?? 0) + 1);
    if (u.lastPlatform !== 'web' && u.lastAppVersion) versions.set(u.lastAppVersion, (versions.get(u.lastAppVersion) ?? 0) + 1);
  }

  const paidNow = (u: User) => isPro(u) && u.planSource === 'stripe';
  const paying = members.filter(paidNow).length;
  const acted = members.filter((u) => didSomething.has(u.id)).length;
  return {
    members: members.length,
    newThisWeek: members.filter((u) => ago(u.createdAt, 7)).length,
    newThisMonth: members.filter((u) => ago(u.createdAt, 30)).length,
    activeThisWeek: activeIds.size,
    signUpsByWeek,
    platforms: byCount(platforms),
    versions: [...versions].map(([label, count]) => ({ label, count })).sort((a, b) => newerFirst(a.label, b.label)),
    funnel: [
      { label: 'Signed up', count: members.length },
      { label: 'Did a first thing', count: acted, line: 'Anything in Activity: a message, a check-in, a save, a round' },
      { label: 'Paying', count: paying, line: 'Pro through Stripe now' },
    ],
    paying,
    given: members.filter((u) => isPro(u) && u.planSource === 'owner').length,
  };
}

/** Where a member came from, for People: who invited them, the link they came through, or straight in. */
export const cameFrom = (u: Pick<User, 'invitedBy' | 'cameFrom'>, nameOf: (id: string) => string) => (u.invitedBy ? `Invited by ${nameOf(u.invitedBy)}` : u.cameFrom ? `The “${u.cameFrom}” link` : 'Straight in');

export type PeopleFilter = 'all' | 'new' | 'active' | 'quiet' | 'pro';

export const PEOPLE_FILTERS: { id: PeopleFilter; label: string }[] = [
  { id: 'all', label: 'Everyone' },
  { id: 'new', label: 'New this week' },
  { id: 'active', label: 'Active this week' },
  { id: 'quiet', label: 'Not seen in 2 weeks' },
  { id: 'pro', label: 'Pro' },
];

/** Whether a member is in one of People's filters. */
export function inFilter(u: User, f: PeopleFilter, db: DB, now = new Date()): boolean {
  const ago = (iso: string | undefined, days: number) => !!iso && now.getTime() - new Date(iso).getTime() <= days * DAY;
  if (f === 'new') return ago(u.createdAt, 7);
  if (f === 'pro') return isPro(u);
  const last = lastActive(u, db);
  if (f === 'active') return ago(last, 7);
  if (f === 'quiet') return !ago(last, 14);
  return true;
}

/** The latest of when they were last in the app and the last thing they did. */
export function lastActive(u: User, db: DB): string | undefined {
  const did = activity(db).find((i) => i.memberId === u.id && i.kind !== 'joined')?.at;
  return [u.lastSeenAt, did].filter((t): t is string => !!t).sort().pop();
}
