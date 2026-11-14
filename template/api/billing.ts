/**
 * Pro for the signed-in member, through Stripe.
 *   GET  /api/billing                               → { configured, priceCents, currency }
 *   POST /api/billing { action: 'checkout', returnUrl } → { url } to Stripe Checkout
 *   POST /api/billing { action: 'portal', returnUrl }   → { url } (manage or cancel)
 * Pro switches on when /api/stripe-webhook hears it's paid. In the iOS and
 * Android apps, buying happens on the web (the app stores' rules for digital
 * subscriptions), so the apps link here rather than calling it.
 */
import { actorFrom, planOf } from './_lib/access.js';
import { HttpError, handle, sql } from './_lib/db.js';
import { billingConfigured, createCheckout, createCustomer, createPortal, currency, expireOpenCheckouts, hasOpenSubscription, priceCents } from './_lib/stripe.js';

export const GET = handle(async () => Response.json({ configured: billingConfigured(), priceCents: priceCents(), currency: currency() }));

/** Only send people back to this app's own pages. */
function safeReturnUrl(req: Request, value: unknown) {
  const origin = new URL(req.url).origin;
  try {
    const url = new URL(String(value ?? ''));
    if (url.origin === origin) return `${url.origin}${url.pathname}`;
  } catch {}
  return `${origin}/pro`;
}

export const POST = handle(async (req) => {
  const actor = await actorFrom(req);
  if (actor.role !== 'member') throw new HttpError(403, 'Pro is for member accounts');
  const body = (await req.json().catch(() => ({}))) as { action?: string; returnUrl?: string };
  const returnUrl = safeReturnUrl(req, body.returnUrl);

  if (body.action === 'portal') {
    const [row] = await sql()`select stripe_customer_id from accounts where id = ${actor.id}`;
    if (!row.stripe_customer_id) throw new HttpError(404, 'There’s no subscription to manage yet.');
    return Response.json(await createPortal(row.stripe_customer_id, returnUrl));
  }
  if (body.action !== 'checkout') throw new HttpError(400, 'Expected action checkout or portal');

  // The account row stays locked while Stripe is asked, so two taps or two tabs can't both buy.
  return sql().begin(async (tx) => {
    const [row] = await tx`select email, plan, plan_until, stripe_customer_id from accounts where id = ${actor.id} for update`;
    if (planOf(row) === 'pro') throw new HttpError(409, 'You already have Pro.');
    let customer: string = row.stripe_customer_id;
    if (!customer) {
      customer = (await createCustomer({ email: row.email, accountId: actor.id })).id;
      await tx`update accounts set stripe_customer_id = ${customer}, updated_at = now() where id = ${actor.id}`;
    } else if (await hasOpenSubscription(customer)) {
      throw new HttpError(409, 'Your last payment is still being set up. Try again in a minute.');
    }
    await expireOpenCheckouts(customer);
    return Response.json({ url: (await createCheckout({ accountId: actor.id, customerId: customer, returnUrl })).url });
  });
});
