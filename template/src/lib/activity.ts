import type { Collection, FieldOf } from '../../api/_lib/db';

import { FEEL, levelById, skillById } from './progression';
import { savedTitle } from './saves';
import type { DB, User } from './types';

/**
 * Activity: everything members do and write, as the owner's dashboard shows
 * it. One feed, newest first, on the Activity page and on each member's page
 * (AGENTS.md: the owner sees everything a member does). Plain logic, tested
 * in Node (tests/activity.test.ts).
 */
export type ActivityKind = 'entry' | 'checkin' | 'progress' | 'ai' | 'score' | 'saved' | 'joined';

export const ACTIVITY_KINDS: { id: ActivityKind; label: string }[] = [
  { id: 'entry', label: 'Messages and clips' },
  { id: 'checkin', label: 'Check-ins' },
  { id: 'progress', label: 'Skills and levels' },
  { id: 'ai', label: 'AI assistant' },
  { id: 'score', label: 'Games played' },
  { id: 'saved', label: 'Saves and plans' },
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
  const nameOf = (id: string) => db.users.find((x) => x.id === id)?.name ?? 'someone';
  for (const u of db.users.filter((x) => x.role === 'member'))
    out.push({ id: `joined-${u.id}`, at: u.createdAt, memberId: u.id, kind: 'joined', title: `${u.name} joined${joinedThrough(u, nameOf)}`, href: `/admin/people/${u.id}` });
  for (const u of db.users.filter((x) => x.role === 'member' && x.assessedAt))
    out.push({
      id: `assessed-${u.id}`,
      at: u.assessedAt!,
      memberId: u.id,
      kind: 'progress',
      title: `Started at “${levelById(u.level)?.title ?? u.level}”`,
      text: u.goal ? `Goal: ${u.goal}` : undefined,
      href: `/admin/people/${u.id}`,
    });
  for (const e of db.entries)
    out.push({
      id: `entry-${e.id}`,
      at: e.updatedAt,
      memberId: e.memberId,
      kind: 'entry',
      title: e.mediaPath ? `Sent a ${e.mediaType === 'image' ? 'photo' : e.mediaType === 'audio' ? 'voice note' : 'video'}: “${e.title}”` : e.link ? `Sent a clip: “${e.title}”` : `Wrote “${e.title}”`,
      text: [e.body, e.link].filter(Boolean).join('\n') || undefined,
      needsReply: !e.reply && !e.replyMediaPath,
      href: `/admin/people/${e.memberId}`,
    });
  for (const c of db.checkins) {
    const skill = skillById(c.skillId)?.title;
    out.push({
      id: `checkin-${c.id}`,
      at: c.createdAt,
      memberId: c.memberId,
      kind: 'checkin',
      title: `Practised${skill ? ` “${skill}”` : ''}${c.minutes ? ` for ${c.minutes} min` : ''}${c.feel ? `: ${FEEL[c.feel].toLowerCase()}` : ''}`,
      text: c.note,
      // Too hard needs the owner: a word from them now saves a lost member later.
      needsReply: c.feel === 1,
      href: `/admin/people/${c.memberId}`,
    });
  }
  for (const p of db.progress)
    out.push({ id: `progress-${p.id}`, at: p.doneAt, memberId: p.memberId, kind: 'progress', title: `Got “${skillById(p.skillId)?.title ?? p.skillId}”`, text: p.ownerNote ? `Your note: ${p.ownerNote}` : undefined, href: `/admin/people/${p.memberId}` });
  for (const c of db.ai)
    out.push({ id: `ai-${c.id}`, at: c.createdAt, memberId: c.memberId, kind: 'ai', title: `Asked the AI assistant: “${c.question.slice(0, 80)}”`, text: c.answer, href: `/admin/people/${c.memberId}` });
  for (const u of db.users)
    if (u.stripeExtraSubscription)
      out.push({ id: `extra-${u.id}`, at: u.createdAt, memberId: u.id, kind: 'joined', title: `Has a second paid subscription (${u.stripeExtraSubscription}): refund or cancel it in Stripe`, needsReply: true, href: `/admin/people/${u.id}` });
  for (const s of db.scores)
    out.push({ id: `score-${s.id}`, at: s.createdAt, memberId: s.memberId, kind: 'score', title: `Played ${s.game}: ${s.points} points`, href: `/admin/people/${s.memberId}` });
  for (const s of db.saved) out.push({ id: `saved-${s.id}`, at: s.updatedAt, memberId: s.memberId, kind: 'saved', title: savedTitle(s), href: `/admin/people/${s.memberId}` });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** How someone came to join, for the feed: through a member's invite, or a /go/<channel> link (Tapp). */
export const joinedThrough = (u: User, nameOf: (id: string) => string) => (u.invitedBy ? `, invited by ${nameOf(u.invitedBy)}` : u.cameFrom ? ` through the “${u.cameFrom}” link` : '');

/** Where someone was last in the app: 'iPhone app 1.2.0', 'Web'. */
export const platformLabel = (u: Pick<User, 'lastPlatform' | 'lastAppVersion'>) =>
  !u.lastPlatform ? '' : u.lastPlatform === 'web' ? 'Web' : `${u.lastPlatform === 'ios' ? 'iPhone' : 'Android'} app${u.lastAppVersion ? ` ${u.lastAppVersion}` : ''}`;

/** What needs the owner now, oldest first so nothing waits forever. */
export const needsYou = (db: DB) => {
  const items = activity(db).filter((i) => i.needsReply).reverse();
  // With coaches, a member nobody coaches needs the owner to assign them.
  if (db.users.some((u) => u.role === 'coach'))
    for (const u of db.users.filter((x) => x.role === 'member' && !x.coachId))
      items.push({ id: `unassigned-${u.id}`, at: u.createdAt, memberId: u.id, kind: 'joined', title: `${u.name} has no coach yet`, needsReply: true, href: `/admin/people/${u.id}` });
  return items;
};

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
    coachId: 'People → Coach; member page → Coach (the owner assigns)',
    level: 'People → Level; member page → Progress',
    assessment: 'Member page → Progress (their answers)',
    goal: 'Member page → Progress; Activity',
    photoPath: 'People (the avatar); member page (the avatar beside their name)',
    assessedAt: 'Activity (Started at)',
    plan: 'People → Plan; member page → Plan',
    planUntil: 'Member page → Plan',
    planSource: 'Member page → Plan (paid, or given by you)',
    stripeExtraSubscription: 'Needs you (a second paid subscription to refund or cancel in Stripe)',
    lastSeenAt: 'People → Last seen; member page → Seen',
    lastPlatform: 'People → On; member page → Seen',
    lastAppVersion: 'Member page → Seen',
    inviteLink: 'Member page → Invites (their link)',
    invitedBy: 'Activity (joined, invited by); member page → Invites',
    cameFrom: 'Activity (joined through a link); member page → Invites',
    createdAt: 'People → Joined; Activity',
  },
  entries: {
    id: 'Key',
    memberId: 'Activity; member page',
    title: 'Activity; member page',
    body: 'Activity; member page',
    link: 'Activity; member page (the clip to look at)',
    mediaPath: 'Activity (Sent a video); member page (plays inline)',
    mediaType: 'Member page (video, photo or audio player)',
    replyMediaPath: 'Member page → your video reply (the member sees it under the message)',
    replyMediaType: 'Member page → your video reply',
    reply: 'Member page → reply box',
    createdAt: 'Member page',
    updatedAt: 'Activity (sort order)',
  },
  checkins: {
    id: 'Key',
    memberId: 'Activity; member page → Check-ins',
    date: 'Member page → Check-ins',
    skillId: 'Activity; member page → Check-ins',
    minutes: 'Activity; member page → Check-ins',
    feel: 'Activity; Needs you (too hard); member page → Check-ins',
    note: 'Activity; member page → Check-ins',
    createdAt: 'Activity (sort order)',
  },
  progress: {
    id: 'Key',
    memberId: 'Activity; member page → Progress',
    skillId: 'Activity; member page → Progress',
    doneAt: 'Activity; member page → Progress',
    ownerNote: 'Member page → Progress (your note on a skill)',
    createdAt: 'Member page → Progress',
  },
  ai: {
    id: 'Key',
    memberId: 'Activity; member page → AI assistant',
    question: 'Activity; member page → AI assistant',
    answer: 'Activity; member page → AI assistant',
    model: 'Member page → AI assistant',
    createdAt: 'Activity; member page → AI assistant',
  },
  saved: {
    id: 'Key',
    memberId: 'Activity; member page → Saves and plans',
    kind: 'Activity (what was saved)',
    itemId: 'Activity (its name, from SAVED_NAMES)',
    status: 'Activity (on their list, going, done)',
    createdAt: 'Member page → Saves and plans',
    updatedAt: 'Activity (sort order); member page → Saves and plans',
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
