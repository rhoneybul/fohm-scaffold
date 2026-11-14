/**
 * The signed-in person's account (Supabase Auth token required).
 *   GET    /api/accounts                         → { user } or 404 { needsProfile: true, email }
 *   POST   /api/accounts { name, role, ownerCode? } → { user }  (creates the profile once)
 *   DELETE /api/accounts                         → { deleted }  (the account and its login, for good)
 * Owner accounts need the server-side OWNER_CODE.
 */
import { accountForAuthUser, authUserFrom, requireOwnerCode } from './_lib/access.js';
import { HttpError, handle, sql, toRecord, toRow } from './_lib/db.js';

const newId = () => `usr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
/** The caller's own account, without the private notes the owner keeps about them. */
const own = (user: Record<string, unknown>) => {
  const { ownerNotes: _private, ...rest } = user;
  return rest;
};

export const GET = handle(async (req) => {
  const authUser = await authUserFrom(req);
  const user = await accountForAuthUser(authUser);
  if (!user) return Response.json({ needsProfile: true, email: authUser.email }, { status: 404 });
  return Response.json({ user: own(user) });
});

export const POST = handle(async (req) => {
  const authUser = await authUserFrom(req);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw new HttpError(400, 'Invalid JSON');

  const existing = await accountForAuthUser(authUser);
  if (existing) return Response.json({ user: own(existing) });

  const role = body.role === 'owner' ? 'owner' : 'member';
  const name = String(body.name ?? '').trim().slice(0, 80);
  if (!name) throw new HttpError(400, 'Enter your name');
  if (role === 'owner') requireOwnerCode(body.ownerCode);

  const db = sql();
  const row = { ...toRow('users', { id: newId(), role, name, email: authUser.email }), auth_user_id: authUser.id };
  const [inserted] = await db`insert into accounts ${db(row)} returning *`;
  return Response.json({ user: own(toRecord('users', inserted)) }, { status: 201 });
});

/**
 * Deletes the caller's account for good: their rows cascade, and their
 * Supabase Auth login goes too, so the email can't sign back in to an empty
 * account. Where the auth schema isn't reachable the account still goes.
 */
export const DELETE = handle(async (req) => {
  const authUser = await authUserFrom(req);
  const db = sql();
  const rows = await db`delete from accounts where auth_user_id = ${authUser.id} returning id`;
  try {
    await db`delete from auth.users where id = ${authUser.id}`;
  } catch (e: any) {
    console.warn('accounts: kept the auth login of a deleted account:', e?.message);
  }
  return Response.json({ deleted: rows[0]?.id ?? null });
});
