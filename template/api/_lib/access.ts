/**
 * Who is calling, and what may they do. The app sends the Supabase Auth
 * access token; the server verifies it, finds the account linked to that
 * login, and decides access: members only their own rows, the owner
 * everything. Owner accounts need the server-side OWNER_CODE when created.
 */
import { bearer, userFromToken, type AuthUser } from './auth.js';
import { HttpError, sql, toRecord } from './db.js';

export type Role = 'member' | 'owner';

export interface Actor {
  id: string;
  role: Role;
  /** Pro now: from Stripe or given by the owner, while plan_until is empty or ahead. */
  pro: boolean;
}

type PlanRow = { plan?: string | null; plan_until?: Date | string | null };
/** The plan an account has now: Pro counts while plan_until is empty or still ahead. */
export const planOf = (row: PlanRow): 'free' | 'pro' => (row.plan === 'pro' && (!row.plan_until || new Date(row.plan_until).getTime() > Date.now()) ? 'pro' : 'free');

/** Paid features need Pro (owners always have them). */
export function requirePro(actor: Actor) {
  if (actor.role !== 'owner' && !actor.pro) throw new HttpError(402, 'That’s part of Pro.');
}

export const isOwner = (a: Actor) => a.role === 'owner';

export async function authUserFrom(req: Request): Promise<AuthUser> {
  return userFromToken(bearer(req));
}

export async function accountForAuthUser(user: AuthUser) {
  const rows = await sql()`select * from accounts where auth_user_id = ${user.id}`;
  return rows.length ? toRecord('users', rows[0]) : null;
}

export async function actorFrom(req: Request): Promise<Actor> {
  const user = await authUserFrom(req);
  const rows = await sql()`select id, role, plan, plan_until from accounts where auth_user_id = ${user.id}`;
  if (!rows.length) throw new HttpError(403, 'Finish setting up your account first');
  return { id: rows[0].id, role: rows[0].role, pro: planOf(rows[0]) === 'pro' };
}

/** Set OWNER_CODE in production. The default exists only so local dev works. */
export const ownerCode = () => (process.env.OWNER_CODE || 'change-me').trim().toLowerCase();

export function requireOwnerCode(code: unknown) {
  if (typeof code !== 'string' || code.trim().toLowerCase() !== ownerCode()) throw new HttpError(403, 'That owner code isn’t right.');
}
