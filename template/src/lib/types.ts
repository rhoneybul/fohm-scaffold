/** The shapes of every record the app keeps. Field names match TABLES in api/_lib/db.ts. */
export type Role = 'member' | 'owner';

export interface User {
  id: string;
  role: Role;
  name: string;
  email?: string;
  /** The owner's private notes about a member. Never reaches a member. */
  ownerNotes?: string;
  /** Pro: from Stripe ('stripe') or given by the owner ('owner'). Set only by the server. */
  plan?: 'free' | 'pro';
  planUntil?: string;
  planSource?: 'stripe' | 'owner';
  /** A second paid subscription the account doesn't follow: the owner refunds or cancels it in Stripe. */
  stripeExtraSubscription?: string;
  createdAt: string;
}

/** Pro now (an empty or future planUntil). */
export const isPro = (u?: User | null) => !!u && (u.role === 'owner' || (u.plan === 'pro' && (!u.planUntil || new Date(u.planUntil).getTime() > Date.now())));

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
  ai: AiChat[];
  devices: Device[];
}

export const EMPTY_DB: DB = { users: [], entries: [], scores: [], ai: [], devices: [] };

export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
