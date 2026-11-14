/** The shapes of every record the app keeps. Field names match TABLES in api/_lib/db.ts. */
export type Role = 'member' | 'owner';

export interface User {
  id: string;
  role: Role;
  name: string;
  email?: string;
  /** The owner's private notes about a member. Never reaches a member. */
  ownerNotes?: string;
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
}

export const EMPTY_DB: DB = { users: [], entries: [], scores: [] };

export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
