# Payments for Pro (Stripe)

Optional; off until its keys are set.

**Why.** Members buy Pro on the web; the plan switches on and off from Stripe's own record, and the owner can also give it from the dashboard.

## What the agent does

- Knows what's built: one monthly Pro plan, bought with Stripe Checkout, cancelled in Stripe's customer portal (`api/billing.ts`, `api/stripe-webhook.ts`, `api/_lib/stripe.ts`).
  The webhook checks every event against Stripe's own record; a second paid subscription goes to Needs you; deleting an account cancels its subscription first.
- Gates features with `isPro` in the app and `requirePro` on the server (402), never only by hiding a button.
- In the iOS and Android apps the Pro page points to the website: the app stores require their own in-app purchase for digital subscriptions sold inside an app, so check their current rules before adding a buy button there.
- Sets the price variables in Vercel when the person names a price: `PRO_PRICE_CENTS` (default 1000) and `STRIPE_CURRENCY` (default usd), or `STRIPE_PRICE_ID` for a price made in Stripe.

## What is the person's

- stripe.com → Developers → API keys: copy the secret key into Vercel as `STRIPE_SECRET_KEY` (Sensitive).
- Developers → Webhooks → Add endpoint: `https://<domain>/api/stripe-webhook` with `checkout.session.completed`, `customer.subscription.created`, `.updated`, `.deleted`; put its signing secret in `STRIPE_WEBHOOK_SECRET` (Sensitive).
- Settings → Billing → Customer portal: switch it on, so members can cancel.
- Test with Stripe's test keys first, then swap in live ones; redeploy after each change.

## How to check it

- `curl -s https://<domain>/api/health | jq .integrations.billing` is `true`; otherwise set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel (Production), then redeploy.
