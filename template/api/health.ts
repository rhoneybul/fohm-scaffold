/**
 * GET /api/health: what the backend is connected to, the public login
 * settings, and which integrations are switched on, with the public parts
 * the app needs (never a secret). The app, the dashboard's Settings page,
 * fohm-scaffold's checks and the smoke tests all read this.
 */
import { posthogConfig } from './_lib/analytics.js';
import { authConfig } from './_lib/auth.js';
import { dbConfigured, handle, sql } from './_lib/db.js';
import { emailConfigured } from './_lib/notify.js';
import { billingConfigured, currency, priceCents } from './_lib/stripe.js';

let google: { value: boolean; until: number } | null = null;
/** Whether Google sign-in is on in Supabase (Authentication → Sign In / Providers), asked at most every 5 minutes. */
async function googleOn() {
  if (google && google.until > Date.now()) return google.value;
  const cfg = authConfig();
  let value = false;
  if (cfg)
    try {
      const s = (await (await fetch(`${cfg.url}/auth/v1/settings`, { headers: { apikey: cfg.key }, signal: AbortSignal.timeout(3000) })).json()) as { external?: { google?: boolean } };
      value = !!s.external?.google;
    } catch {}
  google = { value, until: Date.now() + 300_000 };
  return value;
}

export const GET = handle(async () => {
  let db: 'off' | 'ok' | 'error' = 'off';
  let migration: string | null = null;
  if (dbConfigured()) {
    try {
      const rows = await sql()`select max(version) as v from supabase_migrations.schema_migrations`;
      migration = rows[0]?.v ?? null;
      db = 'ok';
    } catch (e) {
      console.error('health: db check failed', e);
      db = 'error';
    }
  }
  const auth = authConfig(); // { url, key }, both public by design, or null
  return Response.json({
    db,
    migration,
    auth,
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    integrations: {
      billing: billingConfigured() ? { priceCents: priceCents(), currency: currency() } : null,
      posthog: posthogConfig(), // the project key is public by design
      sentry: process.env.SENTRY_DSN ? { dsn: process.env.SENTRY_DSN } : null, // a DSN is public by design
      email: emailConfigured(),
      ai: !!process.env.ANTHROPIC_API_KEY,
      google: auth ? await googleOn() : false,
      push: true, // Expo's push service needs no key; devices register from the iOS and Android apps
    },
  });
});
