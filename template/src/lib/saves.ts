/**
 * Saves: what a member keeps to come back to, in one table for every
 * catalogue: a goal they train for (a place, an event, a trip) with its status
 * once it's on their list, they're going, or it's done; a course; a session
 * they bookmarked. One row per member and thing, stored through /api/data so
 * the owner sees each in Activity (AGENTS.md). Progress shows the to-do list
 * (`toDo`). Plain logic, tested in tests/saves.test.ts.
 */
import type { CreditedPhoto } from './photos';
import type { Saved, SavedStatus } from './types';

/**
 * Each catalogue's name for an item, by kind, so Activity and the to-do list
 * say "Haute Route", not its id. A catalogue adds itself here:
 * `SAVED_NAMES.goal = (id) => goalById(id)?.name`.
 */
export const SAVED_NAMES: Record<string, (itemId: string) => string | undefined> = {};
export const savedName = (s: Pick<Saved, 'kind' | 'itemId'>) => SAVED_NAMES[s.kind]?.(s.itemId) ?? s.itemId;

/**
 * Each catalogue's photos for an item, so the goal a member trains for leads
 * Home as a photo card (the app-design skill's photo rules). A catalogue adds
 * itself beside its name: `SAVED_PHOTOS.goal = (id) => goalById(id)?.photos`.
 */
export const SAVED_PHOTOS: Record<string, (itemId: string) => CreditedPhoto[] | undefined> = {};
export const savedPhotos = (s: Pick<Saved, 'kind' | 'itemId'>): CreditedPhoto[] => SAVED_PHOTOS[s.kind]?.(s.itemId) ?? [];

/** The goal a member trains for now: the first open thing on their to-do list (going first), or undefined. */
export const currentGoal = (saved: Saved[], memberId: string): Saved | undefined => toDo(saved, memberId).open[0];

/** One save per member and thing: saving again finds the same row. */
export const saveId = (memberId: string, kind: string, itemId: string) => `sav_${memberId}_${kind}_${itemId}`;

/** A member's saves of one kind, the latest first. */
export const savesOf = (saved: Saved[], memberId: string, kind: string) => saved.filter((s) => s.memberId === memberId && s.kind === kind).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const saveOf = (saved: Saved[], memberId: string, kind: string, itemId: string) => saved.find((s) => s.id === saveId(memberId, kind, itemId));

/** The save to write: a new one, or the same row with its status changed. `status` undefined keeps it; null clears it. */
export function savedRecord(memberId: string, kind: string, itemId: string, old: Saved | undefined, status: SavedStatus | null | undefined, now: string): Saved {
  const next: Saved = { id: saveId(memberId, kind, itemId), memberId, kind, itemId, createdAt: old?.createdAt ?? now, updatedAt: now };
  const kept = status === undefined ? old?.status : (status ?? undefined);
  if (kept) next.status = kept;
  return next;
}

/** The to-do list on Progress: on the list or going, going first, then the latest; done ones after, for the record. */
export function toDo(saved: Saved[], memberId: string): { open: Saved[]; done: Saved[] } {
  const mine = saved.filter((s) => s.memberId === memberId && s.status);
  const order = { going: 0, list: 1, done: 2 } as const;
  const sorted = mine.sort((a, b) => order[a.status!] - order[b.status!] || b.updatedAt.localeCompare(a.updatedAt));
  return { open: sorted.filter((s) => s.status !== 'done'), done: sorted.filter((s) => s.status === 'done') };
}

/** What Activity says a save was. */
export function savedTitle(s: Saved): string {
  const name = `“${savedName(s)}”`;
  if (s.status === 'going') return `Going: ${name}`;
  if (s.status === 'done') return `Done: ${name}`;
  if (s.status === 'list') return `Put ${name} on their list`;
  return `Saved ${name}`;
}
