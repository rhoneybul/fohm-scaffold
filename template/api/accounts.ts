/**
 * The signed-in person's account (Supabase Auth token required).
 *   GET    /api/accounts                         → { user } or 404 { needsProfile: true, email }
 *   POST   /api/accounts { name, role, ownerCode? } → { user }  (creates the profile once)
 *   POST   /api/accounts { action: 'plan', memberId, plan: 'pro'|'free' } → { user }  (owner only: give Pro, or take it back)
 *   POST   /api/accounts { action: 'assign', memberId, coachId|null } → { user }  (owner only: a member's coach)
 *   POST   /api/accounts { action: 'reset', memberId } → { user }  (owner only: onboarding again, their level and answers cleared)
 *   POST   /api/accounts { action: 'remove', memberId } → { deleted }  (owner only: a member's or coach's account and login, for good)
 *   POST   /api/accounts { action: 'invite' }    → { link|null, joined }  (the caller's invite link, made once with Tapp, and how many joined through it)
 *   POST   /api/accounts { action: 'claim', code|channel } → { outcome }  (from a new member's phone: the invite or /go channel it installed through)
 *   DELETE /api/accounts                         → { deleted }  (the account and its login, for good; its subscription stops first)
 * Owner accounts need the server-side OWNER_CODE, coach accounts COACH_CODE.
 */
import { accountForAuthUser, authUserFrom, isOwnerEmail, requireCoachCode, requireOwnerCode } from './_lib/access.js';
import { capture } from './_lib/analytics.js';
import { HttpError, handle, sql, toRecord, toRow } from './_lib/db.js';
import { welcome } from './_lib/notify.js';
import { noteSeen } from './_lib/seen.js';
import { inviteLink, newInviteCode, readClaim, withinClaimWindow } from './_lib/tapp.js';
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
  await noteSeen(user.id, req.headers);
  return Response.json({ user: own(user) });
});

export const POST = handle(async (req) => {
  const authUser = await authUserFrom(req);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) throw new HttpError(400, 'Invalid JSON');

  if (body.action === 'assign') return assignCoach(authUser.id, String(body.memberId ?? ''), body.coachId ? String(body.coachId) : null);
  if (body.action === 'plan') return setPlanByOwner(authUser.id, String(body.memberId ?? ''), body.plan === 'pro' ? 'pro' : 'free');
  if (body.action === 'reset') return resetOnboarding(authUser.id, String(body.memberId ?? ''));
  if (body.action === 'remove') return removeAccount(authUser.id, String(body.memberId ?? ''));
  if (body.action === 'invite') return invite(authUser.id);
  if (body.action === 'claim') return claim(authUser.id, body);

  const existing = await accountForAuthUser(authUser);
  if (existing) return Response.json({ user: own(existing) });

  const byEmail = isOwnerEmail(authUser);
  const role = byEmail || body.role === 'owner' ? 'owner' : body.role === 'coach' ? 'coach' : 'member';
  const name = String(body.name ?? '').trim().slice(0, 80);
  if (!name) throw new HttpError(400, 'Enter your name');
  if (role === 'owner' && !byEmail) requireOwnerCode(body.ownerCode);
  if (role === 'coach') requireCoachCode(body.ownerCode);

  const db = sql();
  const row = { ...toRow('users', { id: newId(), role, name, email: authUser.email }), auth_user_id: authUser.id };
  const [inserted] = await db`insert into accounts ${db(row)} returning *`;
  await capture(inserted.id, 'signed_up', { role });
  if (role === 'member') await welcome(inserted as { id: string; name: string; email: string });
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

async function requireOwner(authUserId: string) {
  const [owner] = await sql()`select id, role from accounts where auth_user_id = ${authUserId}`;
  if (owner?.role !== 'owner') throw new HttpError(403, 'Only the owner can do that');
  return owner.id as string;
}

/** The owner sends a member back through onboarding: their level, answers and when they were placed are cleared; what they did stays. */
async function resetOnboarding(authUserId: string, memberId: string) {
  await requireOwner(authUserId);
  const [row] = await sql()`update accounts set level = null, assessment = null, assessed_at = null, onboarding = null, updated_at = now() where id = ${memberId} and role = 'member' returning *`;
  if (!row) throw new HttpError(404, 'Member not found');
  await capture(memberId, 'onboarding_reset');
  return Response.json({ user: toRecord('users', row) });
}

/**
 * The owner deletes a member's or a coach's account for good, as the person
 * would from their own account: billing stops first, then their rows go and
 * their login with them. Never an owner's: an owner leaves from their own.
 */
async function removeAccount(authUserId: string, memberId: string) {
  await requireOwner(authUserId);
  const db = sql();
  const [account] = await db`select id, role, auth_user_id, stripe_subscription_id, stripe_extra_subscription from accounts where id = ${memberId}`;
  if (!account) throw new HttpError(404, 'Member not found');
  if (account.role === 'owner') throw new HttpError(403, 'An owner deletes their own account');
  await stopBilling([account.stripe_subscription_id, account.stripe_extra_subscription], 'Their subscription couldn’t be stopped, so the account is still here. Try again in a moment.');
  await db`delete from accounts where id = ${memberId}`;
  await dropLogin(account.auth_user_id);
  await capture(memberId, 'account_removed', { role: account.role });
  return Response.json({ deleted: memberId });
}

/** Stops each live subscription; if Stripe can't be reached, nothing is deleted and they try again. */
async function stopBilling(ids: (string | null | undefined)[], failure: string) {
  const subs = ids.filter(Boolean) as string[];
  if (!subs.length || !billingConfigured()) return;
  try {
    for (const id of subs) if (LIVE_STATUSES.has((await getSubscription(id)).status)) await cancelSubscription(id);
  } catch {
    throw new HttpError(502, failure);
  }
}

/** The Supabase Auth login goes too, so the email can't sign back in to an empty account. Where the auth schema isn't reachable the account still goes. */
async function dropLogin(authUserId: string | null | undefined) {
  if (!authUserId) return;
  try {
    await sql()`delete from auth.users where id = ${authUserId}`;
  } catch (e: any) {
    console.warn('accounts: kept the auth login of a deleted account:', e?.message);
  }
}

/** The caller's invite link, made with Tapp the first time they ask and kept; null while Tapp is off or unreachable. */
async function invite(authUserId: string) {
  const db = sql();
  const [account] = await db`select id, invite_code, invite_link from accounts where auth_user_id = ${authUserId}`;
  if (!account) throw new HttpError(403, 'Finish setting up your account first');
  const [{ joined }] = await db`select count(*)::int as joined from accounts where invited_by = ${account.id}`;
  if (account.invite_link) return Response.json({ link: account.invite_link, joined });
  const code = account.invite_code ?? newInviteCode();
  const link = await inviteLink(code);
  // The code is kept even without a link, so a later try asks Tapp for the same one.
  const [row] = await db`update accounts set invite_code = coalesce(invite_code, ${code}), invite_link = coalesce(invite_link, ${link}) where id = ${account.id} returning invite_link`;
  if (link) await capture(account.id, 'invite_link_created');
  return Response.json({ link: row.invite_link ?? null, joined });
}

/**
 * What a new member's phone read from the link it installed through: a
 * friend's invite code (counted once, never their own, and only within 14
 * days of sign-up) or a /go channel (the first one only). An outcome, never
 * an error, so the phone stops asking.
 */
async function claim(authUserId: string, body: Record<string, unknown>) {
  const db = sql();
  const [me] = await db`select id, invited_by, came_from, created_at from accounts where auth_user_id = ${authUserId}`;
  if (!me) throw new HttpError(403, 'Finish setting up your account first');
  const what = readClaim(body);
  let outcome: string;
  if (!what) outcome = 'unknown';
  else if ('channel' in what) {
    const [row] = await db`update accounts set came_from = ${what.channel} where id = ${me.id} and came_from is null returning id`;
    outcome = row ? 'channel_recorded' : 'already_recorded';
  } else {
    const [inviter] = await db`select id from accounts where invite_code = ${what.code}`;
    if (!inviter) outcome = 'unknown';
    else if (inviter.id === me.id) outcome = 'own_code';
    else if (me.invited_by) outcome = 'already_invited';
    else if (!withinClaimWindow(me.created_at)) outcome = 'too_late';
    else {
      const [row] = await db`update accounts set invited_by = ${inviter.id} where id = ${me.id} and invited_by is null returning id`;
      outcome = row ? 'claimed' : 'already_invited';
    }
  }
  await capture(me.id, 'invite_claimed', { outcome });
  return Response.json({ outcome });
}

/**
 * Deletes the caller's account for good: their rows cascade, and their
 * Supabase Auth login goes too, so the email can't sign back in to an empty
 * account. Where the auth schema isn't reachable the account still goes.
 */
export const DELETE = handle(async (req) => {
  const authUser = await authUserFrom(req);
  const db = sql();
  const [account] = await db`select stripe_subscription_id, stripe_extra_subscription from accounts where auth_user_id = ${authUser.id}`;
  await stopBilling([account?.stripe_subscription_id, account?.stripe_extra_subscription], 'Your subscription couldn’t be stopped, so your account is still here. Try again in a moment.');
  const rows = await db`delete from accounts where auth_user_id = ${authUser.id} returning id`;
  await dropLogin(authUser.id);
  return Response.json({ deleted: rows[0]?.id ?? null });
});
