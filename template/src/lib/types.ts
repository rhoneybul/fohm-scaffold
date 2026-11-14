/** The shapes of every record the app keeps. Field names match TABLES in api/_lib/db.ts. */
export type Role = 'member' | 'coach' | 'owner';

/** The owner or a coach: the people who see and answer members. */
export const isStaff = (u?: { role: Role } | null) => u?.role === 'owner' || u?.role === 'coach';

export type MediaType = 'video' | 'image' | 'audio';

export interface User {
  id: string;
  role: Role;
  name: string;
  email?: string;
  /** The owner's private notes about a member. Never reaches a member. */
  ownerNotes?: string;
  /** The coach this member is assigned to (the owner assigns; a coach sees only their own members). */
  coachId?: string;
  /** Where they started on the progression (a level id from src/lib/progression.ts), their answers, and their goal. */
  level?: string;
  assessment?: Record<string, string>;
  goal?: string;
  assessedAt?: string;
  /** Pro: from Stripe ('stripe') or given by the owner ('owner'). Set only by the server. */
  plan?: 'free' | 'pro';
  planUntil?: string;
  planSource?: 'stripe' | 'owner';
  /** A second paid subscription the account doesn't follow: the owner refunds or cancels it in Stripe. */
  stripeExtraSubscription?: string;
  createdAt: string;
}

/** Pro now (an empty or future planUntil). */
export const isPro = (u?: User | null) => !!u && (u.role !== 'member' || (u.plan === 'pro' && (!u.planUntil || new Date(u.planUntil).getTime() > Date.now())));

/** How a practice went. */
export interface Checkin {
  id: string;
  memberId: string;
  date: string; // yyyy-mm-dd
  skillId?: string;
  minutes?: number;
  feel?: 1 | 2 | 3; // too hard, about right, too easy
  note?: string;
  createdAt: string;
}

/** A skill on the path the member has got. One per member and skill: id = prg_<memberId>_<skillId>. */
export interface Progress {
  id: string;
  memberId: string;
  skillId: string;
  doneAt: string;
  /** The owner's note on it: only the owner writes it. */
  ownerNote?: string;
  createdAt: string;
}

/** A question to the AI assistant and its answer, written by the server. */
export interface AiChat {
  id: string;
  memberId: string;
  question: string;
  answer: string;
  model?: string;
  createdAt: string;
}

/** A phone signed in to the app, for push notifications. */
export interface Device {
  id: string;
  memberId: string;
  token: string;
  platform: string;
  createdAt: string;
}

/** Something a member writes. The owner can reply. */
export interface Entry {
  id: string;
  memberId: string;
  title: string;
  body?: string;
  /** A clip or file for the owner to look at (video analysis): a link to YouTube, Google Drive, Instagram... */
  link?: string;
  /** An uploaded video, photo or voice note (a path in the member-media bucket). */
  mediaPath?: string;
  mediaType?: MediaType;
  /** The staff's video reply. */
  replyMediaPath?: string;
  replyMediaType?: MediaType;
  /** The owner's reply: only the owner writes it. */
  reply?: string;
  createdAt: string;
  updatedAt: string;
}

/** One round of the game, as it ended. */
export interface Score {
  id: string;
  memberId: string;
  game: string;
  points: number;
  seconds: number;
  createdAt: string;
}

/** Everything the signed-in person can see. A new collection needs its place here and in EMPTY_DB. */
export interface DB {
  users: User[];
  entries: Entry[];
  scores: Score[];
  checkins: Checkin[];
  progress: Progress[];
  ai: AiChat[];
  devices: Device[];
}

export const EMPTY_DB: DB = { users: [], entries: [], scores: [], checkins: [], progress: [], ai: [], devices: [] };

export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
