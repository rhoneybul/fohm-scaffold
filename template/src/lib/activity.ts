import type { Collection, FieldOf } from '../../api/_lib/db';

import type { DB } from './types';

/**
 * Activity: everything members do and write, as the owner's dashboard shows
 * it. One feed, newest first, on the Activity page and on each member's page
 * (AGENTS.md: the owner sees everything a member does). Plain logic, tested
 * in Node (tests/activity.test.ts).
 */
export type ActivityKind = 'entry' | 'ai' | 'score' | 'joined';

export const ACTIVITY_KINDS: { id: ActivityKind; label: string }[] = [
  { id: 'entry', label: 'Entries' },
  { id: 'ai', label: 'AI assistant' },
  { id: 'score', label: 'Games played' },
  { id: 'joined', label: 'New members' },
];

export interface ActivityItem {
  id: string;
  at: string; // ISO timestamp
  memberId: string;
  kind: ActivityKind;
  title: string;
  text?: string;
  /** Waiting on the owner: shown in Needs you. */
  needsReply?: boolean;
  href: string;
}

export function activity(db: DB): ActivityItem[] {
  const out: ActivityItem[] = [];
  for (const u of db.users.filter((x) => x.role === 'member'))
    out.push({ id: `joined-${u.id}`, at: u.createdAt, memberId: u.id, kind: 'joined', title: `${u.name} joined`, href: `/admin/people/${u.id}` });
  for (const e of db.entries)
    out.push({ id: `entry-${e.id}`, at: e.updatedAt, memberId: e.memberId, kind: 'entry', title: `Wrote “${e.title}”`, text: e.body, needsReply: !e.reply, href: `/admin/people/${e.memberId}` });
  for (const c of db.ai)
    out.push({ id: `ai-${c.id}`, at: c.createdAt, memberId: c.memberId, kind: 'ai', title: `Asked the AI assistant: “${c.question.slice(0, 80)}”`, text: c.answer, href: `/admin/people/${c.memberId}` });
  for (const u of db.users)
    if (u.stripeExtraSubscription)
      out.push({ id: `extra-${u.id}`, at: u.createdAt, memberId: u.id, kind: 'joined', title: `Has a second paid subscription (${u.stripeExtraSubscription}): refund or cancel it in Stripe`, needsReply: true, href: `/admin/people/${u.id}` });
  for (const s of db.scores)
    out.push({ id: `score-${s.id}`, at: s.createdAt, memberId: s.memberId, kind: 'score', title: `Played ${s.game}: ${s.points} points`, href: `/admin/people/${s.memberId}` });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** What needs the owner now, oldest first so nothing waits forever. */
export const needsYou = (db: DB) => activity(db).filter((i) => i.needsReply).reverse();

/**
 * Where the owner sees every field the backend stores. Typed against TABLES,
 * so a new column fails `npm run typecheck` until it has a line here. Write
 * the line, then check the screen really shows it.
 */
export const ADMIN_SEES: { [C in Collection]: Record<FieldOf<C>, string> } = {
  users: {
    id: 'Key',
    role: 'People (members); Settings (owners)',
    name: 'People; member page',
    email: 'People; member page',
    ownerNotes: 'Member page → Private notes (never sent to a member)',
    plan: 'People → Plan; member page → Plan',
    planUntil: 'Member page → Plan',
    planSource: 'Member page → Plan (paid, or given by you)',
    stripeExtraSubscription: 'Needs you (a second paid subscription to refund or cancel in Stripe)',
    createdAt: 'People → Joined; Activity',
  },
  entries: {
    id: 'Key',
    memberId: 'Activity; member page',
    title: 'Activity; member page',
    body: 'Activity; member page',
    reply: 'Member page → reply box',
    createdAt: 'Member page',
    updatedAt: 'Activity (sort order)',
  },
  ai: {
    id: 'Key',
    memberId: 'Activity; member page → AI assistant',
    question: 'Activity; member page → AI assistant',
    answer: 'Activity; member page → AI assistant',
    model: 'Member page → AI assistant',
    createdAt: 'Activity; member page → AI assistant',
  },
  devices: {
    id: 'Key',
    memberId: 'Member page → Devices',
    token: 'Not shown (an address for push notifications)',
    platform: 'Member page → Devices',
    createdAt: 'Member page → Devices',
  },
  scores: {
    id: 'Key',
    memberId: 'Activity; member page',
    game: 'Activity; member page → Games',
    points: 'Activity; member page → Games',
    seconds: 'Member page → Games',
    createdAt: 'Activity; member page → Games',
  },
};
