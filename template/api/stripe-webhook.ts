/**
 * POST /api/stripe-webhook: Stripe tells us about Pro subscriptions. Add this
 * URL in Stripe (Developers → Webhooks) with checkout.session.completed and
 * customer.subscription.created/updated/deleted, and put its signing secret
 * in STRIPE_WEBHOOK_SECRET.
 *
 * Every event is checked against the subscription as Stripe has it now, so a
 * late or resent event can't bring an old state back. An account follows one
 * subscription; a second paid one is put in front of the owner (Needs you) to
 * refund or cancel. Nothing here cancels a subscription. Pro given by the
 * owner is left alone.
 */
import type postgres from 'postgres';

import { planOf } from './_lib/access.js';
import { capture } from './_lib/analytics.js';
import { HttpError, handle, sql } from './_lib/db.js';
import { paymentPing, subscriptionChange, type PaymentKind } from './_lib/pings.js';
import { ping } from './_lib/slack.js';
import { LIVE_STATUSES, billingConfigured, getSubscription, periodEnd, verifyWebhook, type StripeSubscription } from './_lib/stripe.js';

const HANDLED = new Set(['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted']);
type Account = { id: string; email: string | null; plan: string; plan_until: Date | null; plan_source: string | null; stripe_subscription_id: string | null; stripe_extra_subscription: string | null };

async function lockAccountFor(tx: postgres.TransactionSql, obj: any): Promise<Account | null> {
  const id = obj.metadata?.account_id ?? obj.client_reference_id;
  const rows = id
    ? await tx`select id, email, plan, plan_until, plan_source, stripe_subscription_id, stripe_extra_subscription from accounts where id = ${id} for update`
    : await tx`select id, email, plan, plan_until, plan_source, stripe_subscription_id, stripe_extra_subscription from accounts where stripe_customer_id = ${obj.customer ?? ''} for update`;
  return (rows[0] as Account | undefined) ?? null;
}

/** The subscription as Stripe has it now. Only tests (STRIPE_WEBHOOK_TRUST_PAYLOAD=1) take the event's own copy. */
async function subscriptionNow(obj: any, type: string): Promise<StripeSubscription | null> {
  const id: string | undefined = type === 'checkout.session.completed' ? obj.subscription : obj.id;
  if (!id) return null;
  if (billingConfigured()) return getSubscription(id);
  if (process.env.STRIPE_WEBHOOK_TRUST_PAYLOAD !== '1') throw new HttpError(503, 'Set STRIPE_SECRET_KEY: every event is checked against Stripe');
  return type === 'checkout.session.completed' ? { id, status: 'active', customer: obj.customer, metadata: obj.metadata } : obj;
}

/** The team's Slack hears of Pro started, renewed, cancelled and ended (docs/SLACK.md), after the answer. */
const tell = (kind: PaymentKind, account: Account, subscriptionId: string, until: Date | null) => ping(paymentPing({ kind, accountId: account.id, email: account.email, subscriptionId, until }));

const checkoutPaid = (obj: any) => !obj.payment_status || obj.payment_status === 'paid' || obj.payment_status === 'no_payment_required';
const received = (matched: boolean) => Response.json({ received: true, matched });

export const POST = handle(async (req) => {
  const event = verifyWebhook(await req.text(), req.headers.get('stripe-signature'));
  const obj = event.data.object;
  if (!HANDLED.has(event.type)) return received(false);

  return sql().begin(async (tx) => {
    const account = await lockAccountFor(tx, obj);
    if (!account) return received(false);
    const sub = await subscriptionNow(obj, event.type);
    if (!sub) return received(true);
    const live = LIVE_STATUSES.has(sub.status) && event.type !== 'customer.subscription.deleted';
    const end = periodEnd(sub) ?? new Date(Date.now() + 34 * 86400_000);

    if (sub.id === account.stripe_extra_subscription) {
      if (!live) await tx`update accounts set stripe_extra_subscription = null, updated_at = now() where id = ${account.id}`;
      return received(true);
    }
    if (sub.id === account.stripe_subscription_id) {
      if (account.plan_source === 'owner') return received(true);
      if (live) {
        await tx`update accounts set stripe_customer_id = ${sub.customer}, plan = 'pro', plan_source = 'stripe', plan_until = ${end}, updated_at = now() where id = ${account.id}`;
        const change = event.type === 'customer.subscription.updated' ? subscriptionChange({ wasPro: account.plan === 'pro', wasUntil: account.plan_until, until: end, sub, previous: event.data.previous_attributes }) : null;
        if (change) tell(change, account, sub.id, end);
      } else {
        await tx`update accounts set plan = 'free', plan_until = now(), updated_at = now() where id = ${account.id}`;
        await capture(account.id, 'pro_ended');
        if (account.plan === 'pro') tell('ended', account, sub.id, null);
      }
      return received(true);
    }
    if (!live || (event.type === 'checkout.session.completed' && !checkoutPaid(obj))) return received(true);
    if (planOf(account) === 'pro') {
      console.error('stripe-webhook: a second paid subscription; shown in Needs you', account.id, sub.id);
      await tx`update accounts set stripe_extra_subscription = ${sub.id}, updated_at = now() where id = ${account.id}`;
      return received(true);
    }
    await tx`update accounts set stripe_customer_id = ${sub.customer}, stripe_subscription_id = ${sub.id}, plan = 'pro', plan_source = 'stripe', plan_until = ${end}, updated_at = now() where id = ${account.id}`;
    await capture(account.id, 'pro_started');
    tell('started', account, sub.id, end);
    return received(true);
  });
});
