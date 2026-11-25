/**
 * Stripe over its REST API (no SDK): checkout for the Pro plan, the billing
 * portal, reading a subscription back, and webhook signature checks. Adapted
 * from Aluzam, where it held up under review.
 *
 * Pro is one monthly price: STRIPE_PRICE_ID when set, otherwise the app's own
 * at PRO_PRICE_CENTS (default 1000) in STRIPE_CURRENCY (default usd), found by
 * its lookup key and made the first time it's needed. An account has one
 * subscription at most, and is a Stripe customer from before its first checkout.
 *
 * Env: STRIPE_SECRET_KEY (switches billing on), STRIPE_WEBHOOK_SECRET.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import { APP_NAME } from './app.js';
import { HttpError } from './db.js';

export const billingConfigured = () => !!process.env.STRIPE_SECRET_KEY;
export const currency = () => (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();
export const priceCents = () => Number(process.env.PRO_PRICE_CENTS || 1000);

/** Statuses in which a subscription keeps Pro on (past_due: Stripe is still retrying the card). */
export const LIVE_STATUSES = new Set(['active', 'trialing', 'past_due']);

export interface StripeSubscription {
  id: string;
  status: string;
  customer: string;
  created?: number;
  metadata?: Record<string, string> | null;
  current_period_end?: number;
  /** Set when the member cancelled: Pro runs to the period's end, then stops. */
  cancel_at_period_end?: boolean;
  cancel_at?: number | null;
  items?: { data?: { id?: string; current_period_end?: number }[] };
}

/** Stripe's form encoding: nested keys as a[b][c]=v. */
export function formEncode(value: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(value).flatMap(([k, v]) => {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) return [];
    if (typeof v === 'object') return formEncode(v as Record<string, unknown>, key);
    return [`${encodeURIComponent(key)}=${encodeURIComponent(String(v))}`];
  });
}

async function stripe<T>(path: string, params: Record<string, unknown> = {}, method: 'GET' | 'POST' | 'DELETE' = 'POST'): Promise<T> {
  if (!billingConfigured()) throw new HttpError(503, 'Payments aren’t switched on yet.');
  const form = formEncode(params).join('&');
  const inQuery = method !== 'POST';
  const res = await fetch(`https://api.stripe.com/v1/${path}${inQuery && form ? `?${form}` : ''}`, {
    method,
    headers: { authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'content-type': 'application/x-www-form-urlencoded' },
    body: inQuery ? undefined : form,
  });
  const body = (await res.json()) as any;
  if (!res.ok) {
    console.error('stripe:', method, path, body?.error?.message);
    if (res.status === 402) throw new HttpError(402, body?.error?.message ?? 'Your card was declined.');
    throw new HttpError(502, 'The payment provider didn’t respond. Try again in a moment.');
  }
  return body as T;
}

const lookupKey = () => `fohm_pro_${priceCents()}_${currency()}_monthly`;
let cachedPrice: string | null = null;

/** The Stripe price Pro is sold at: the one set in Vercel, else the app's own, found or made once. */
export async function proPrice(): Promise<string> {
  if (process.env.STRIPE_PRICE_ID) return process.env.STRIPE_PRICE_ID;
  if (cachedPrice) return cachedPrice;
  const found = await stripe<{ data: { id: string }[] }>('prices', { lookup_keys: { 0: lookupKey() }, active: true, limit: 1 }, 'GET');
  cachedPrice =
    found.data[0]?.id ??
    (await stripe<{ id: string }>('prices', { currency: currency(), unit_amount: priceCents(), recurring: { interval: 'month' }, product_data: { name: `${APP_NAME} Pro` }, lookup_key: lookupKey(), transfer_lookup_key: true })).id;
  return cachedPrice;
}

export const createCustomer = (a: { email: string; accountId: string }) => stripe<{ id: string }>('customers', { email: a.email, metadata: { account_id: a.accountId } });

/** Closes a customer's checkouts still open (another tab, an earlier try), so only the newest can be paid. */
export async function expireOpenCheckouts(customerId: string) {
  const open = await stripe<{ data: { id: string }[] }>('checkout/sessions', { customer: customerId, status: 'open', limit: 20 }, 'GET');
  for (const s of open.data) await stripe(`checkout/sessions/${encodeURIComponent(s.id)}/expire`);
}

export async function createCheckout(a: { accountId: string; customerId: string; returnUrl: string }) {
  return stripe<{ url: string }>('checkout/sessions', {
    mode: 'subscription',
    line_items: { 0: { price: await proPrice(), quantity: 1 } },
    customer: a.customerId,
    client_reference_id: a.accountId,
    subscription_data: { metadata: { account_id: a.accountId } },
    metadata: { account_id: a.accountId },
    expires_at: Math.floor(Date.now() / 1000) + 35 * 60,
    success_url: `${a.returnUrl}?pro=welcome`,
    cancel_url: a.returnUrl,
  });
}

export const getSubscription = (id: string) => stripe<StripeSubscription>(`subscriptions/${encodeURIComponent(id)}`, {}, 'GET');

/** Whether a customer has a live subscription, or one started in the last hour still being paid for. */
export async function hasOpenSubscription(customerId: string, now = Date.now()) {
  const list = await stripe<{ data: StripeSubscription[] }>('subscriptions', { customer: customerId, status: 'all', limit: 20 }, 'GET');
  return list.data.some((s) => LIVE_STATUSES.has(s.status) || (s.status === 'incomplete' && (s.created ?? 0) * 1000 > now - 3600_000));
}

/** Ends a subscription now: for an account being deleted, which mustn't go on being billed. */
export const cancelSubscription = (id: string) => stripe<StripeSubscription>(`subscriptions/${encodeURIComponent(id)}`, {}, 'DELETE');

/** current_period_end moved from the subscription to its items in newer API versions. */
export function periodEnd(sub: Pick<StripeSubscription, 'current_period_end' | 'items'>): Date | null {
  const s = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
  return typeof s === 'number' ? new Date(s * 1000) : null;
}

export const createPortal = (customerId: string, returnUrl: string) => stripe<{ url: string }>('billing_portal/sessions', { customer: customerId, return_url: returnUrl });

/** Checks a Stripe-Signature header against the raw body; returns the parsed event. */
export function verifyWebhook(rawBody: string, header: string | null, secret = process.env.STRIPE_WEBHOOK_SECRET, now = Date.now()) {
  if (!secret) throw new HttpError(503, 'Webhook secret not configured');
  const t = Number((header ?? '').split(',').find((p) => p.startsWith('t='))?.slice(2));
  const given = (header ?? '').split(',').filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));
  if (!t || !given.length) throw new HttpError(400, 'Missing signature');
  if (Math.abs(now / 1000 - t) > 300) throw new HttpError(400, 'Signature too old');
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest();
  const ok = given.some((g) => {
    const buf = Buffer.from(g, 'hex');
    return buf.length === expected.length && timingSafeEqual(buf, expected);
  });
  if (!ok) throw new HttpError(400, 'Bad signature');
  return JSON.parse(rawBody) as { type: string; data: { object: any; previous_attributes?: Record<string, unknown> } };
}

/** For tests: a valid header for a body. */
export function signForTest(rawBody: string, secret: string, t = Math.floor(Date.now() / 1000)) {
  return `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex')}`;
}
