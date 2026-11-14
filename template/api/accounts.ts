/**
 * The signed-in person's account (Supabase Auth token required).
 *   GET    /api/accounts                         → { user } or 404 { needsProfile: true, email }
 *   POST   /api/accounts { name, role, ownerCode? } → { user }  (creates the profile once)
 *   POST   /api/accounts { action: 'plan', memberId, plan: 'pro'|'free' } → { user }  (owner only: give Pro, or take it back)
 *   POST   /api/accounts { action: 'assign', memberId, coachId|null } → { user }  (owner only: a member's coach)
 *   DELETE /api/accounts                         → { deleted }  (the account and its login, for good; its subscription stops first)
 * Owner accounts need the server-side OWNER_CODE, coach accounts COACH_CODE.
 */
import { accountForAuthUser, authUserFrom, requireCoachCode, requireOwnerCode } from './_lib/access.js';
import { capture } from './_lib/analytics.js';
import { HttpError, handle, sql, toRecord, toRow } from './_lib/db.js';
import { LIVE_STATUSES, billingConfigured, cancelSubscription, getSubscription } from './_lib/stripe.js';

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

  if (body.action === 'assign') return assignCoach(authUser.id, String(body.memberId ?? ''), body.coachId ? String(body.coachId) : null);
  if (body.action === 'plan') return setPlanByOwner(authUser.id, String(body.memberId ?? ''), body.plan === 'pro' ? 'pro' : 'free');

  const existing = await accountForAuthUser(authUser);
  if (existing) return Response.json({ user: own(existing) });

  const role = body.role === 'owner' ? 'owner' : body.role === 'coach' ? 'coach' : 'member';
  const name = String(body.name ?? '').trim().slice(0, 80);
  if (!name) throw new HttpError(400, 'Enter your name');
  if (role === 'owner') requireOwnerCode(body.ownerCode);
  if (role === 'coach') requireCoachCode(body.ownerCode);

  const db = sql();
  const row = { ...toRow('users', { id: newId(), role, name, email: authUser.email }), auth_user_id: authUser.id };
  const [inserted] = await db`insert into accounts ${db(row)} returning *`;
  await capture(inserted.id, 'signed_up', { role });
  return Response.json({ user: own(toRecord('users', inserted)) }, { status: 201 });
});

/** The owner assigns a member to a coach (or to nobody, null). */
async function assignCoach(authUserId: string, memberId: string, coachId: string | null) {
  const db = sql();
  const [owner] = await db`select role from accounts where auth_user_id = ${authUserId}`;
  if (owner?.role !== 'owner') throw new HttpError(403, 'Only the owner can do that');
  if (coachId) {
    const [coach] = await db`select 1 from accounts where id = ${coachId} and role = 'coach'`;
    if (!coach) throw new HttpError(404, 'Coach not found');
  }
  const [row] = await db`update accounts set coach_id = ${coachId}, updated_at = now() where id = ${memberId} and role = 'member' returning *`;
  if (!row) throw new HttpError(404, 'Member not found');
  return Response.json({ user: toRecord('users', row) });
}

/** The owner gives a member Pro (no end date), or takes it back. Pro a member pays for is Stripe's to change. */
async function setPlanByOwner(authUserId: string, memberId: string, plan: 'pro' | 'free') {
  const db = sql();
  const [owner] = await db`select role from accounts where auth_user_id = ${authUserId}`;
  if (owner?.role !== 'owner') throw new HttpError(403, 'Only the owner can do that');
  const [member] = await db`select plan, plan_source from accounts where id = ${memberId} and role = 'member'`;
  if (!member) throw new HttpError(404, 'Member not found');
  if (member.plan_source === 'stripe' && member.plan === 'pro') throw new HttpError(409, 'This member pays for Pro. Manage it in Stripe.');
  const [row] =
    plan === 'pro'
      ? await db`update accounts set plan = 'pro', plan_source = 'owner', plan_until = null, updated_at = now() where id = ${memberId} returning *`
      : await db`update accounts set plan = 'free', plan_source = null, plan_until = null, updated_at = now() where id = ${memberId} returning *`;
  return Response.json({ user: toRecord('users', row) });
}

/**
 * Deletes the caller's account for good: their rows cascade, and their
 * Supabase Auth login goes too, so the email can't sign back in to an empty
 * account. Where the auth schema isn't reachable the account still goes.
 */
export const DELETE = handle(async (req) => {
  const authUser = await authUserFrom(req);
  const db = sql();
  // Billing stops first; if Stripe can't be reached the account stays, and they try again.
  const [account] = await db`select stripe_subscription_id, stripe_extra_subscription from accounts where auth_user_id = ${authUser.id}`;
  const subs = [account?.stripe_subscription_id, account?.stripe_extra_subscription].filter(Boolean) as string[];
  if (subs.length && billingConfigured()) {
    try {
      for (const id of subs) if (LIVE_STATUSES.has((await getSubscription(id)).status)) await cancelSubscription(id);
    } catch {
      throw new HttpError(502, 'Your subscription couldn’t be stopped, so your account is still here. Try again in a moment.');
    }
  }
  const rows = await db`delete from accounts where auth_user_id = ${authUser.id} returning id`;
  try {
    await db`delete from auth.users where id = ${authUser.id}`;
  } catch (e: any) {
    console.warn('accounts: kept the auth login of a deleted account:', e?.message);
  }
  return Response.json({ deleted: rows[0]?.id ?? null });
});
