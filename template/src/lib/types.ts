/** The shapes of every record the app keeps. Field names match TABLES in api/_lib/db.ts. */
import type { OnboardingRecord } from './onboarding';
import type { LngLat, Profile } from './routes';

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
  /** Their profile photo: a path in the member-media bucket (src/lib/photo.ts), or null once removed. */
  photoPath?: string | null;
  assessedAt?: string;
  /** Onboarding: their answers as given, and when they opened and finished it (src/lib/onboarding.ts). */
  onboarding?: OnboardingRecord;
  /** Pro: from Stripe ('stripe') or given by the owner ('owner'). Set only by the server. */
  plan?: 'free' | 'pro';
  planUntil?: string;
  planSource?: 'stripe' | 'owner';
  /** A second paid subscription the account doesn't follow: the owner refunds or cancels it in Stripe. */
  stripeExtraSubscription?: string;
  /** When they were last in the app, and on what (set by the server: api/_lib/seen.ts). */
  lastSeenAt?: string;
  lastPlatform?: 'web' | 'ios' | 'android';
  lastAppVersion?: string;
  /** Their own invite link (Tapp), once they've asked for it. */
  inviteLink?: string;
  /** The account that invited them, and the /go/<channel> they came through (Tapp; set by the server). */
  invitedBy?: string;
  cameFrom?: string;
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

/** A thing a member saved to come back to (src/lib/saves.ts): one per member and thing. */
export interface Saved {
  id: string;
  memberId: string;
  /** Which catalogue: the app's own word for it ('goal', 'course', 'session'). */
  kind: string;
  itemId: string;
  /** Unset: saved. 'list': on their to-do list. 'going': booked or set on it. 'done'. */
  status?: SavedStatus;
  createdAt: string;
  updatedAt: string;
}
export type SavedStatus = 'list' | 'going' | 'done';

/**
 * A route the member planned on the map (src/lib/routes.ts, docs/ROUTES.md):
 * their points, the line on the roads between them, and which legs stayed
 * straight because no road was found.
 */
export interface Route {
  id: string;
  memberId: string;
  name: string;
  profile: Profile;
  /** The points they tapped, [lng, lat], in order. */
  points: LngLat[];
  /** The line on the roads (thinned to 500 points), [lng, lat]. */
  track: LngLat[];
  /** The legs (by index: 0 is the first point to the second) no road was found for: straight, drawn dashed. */
  straightLegs: number[];
  distanceM: number;
  createdAt: string;
  updatedAt: string;
}

/** Everything the signed-in person can see. A new collection needs its place here and in EMPTY_DB. */
export interface DB {
  users: User[];
  entries: Entry[];
  scores: Score[];
  checkins: Checkin[];
  progress: Progress[];
  ai: AiChat[];
  saved: Saved[];
  devices: Device[];
  routes: Route[];
}

export const EMPTY_DB: DB = { users: [], entries: [], scores: [], checkins: [], progress: [], ai: [], saved: [], devices: [], routes: [] };

export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
