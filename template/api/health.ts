/**
 * GET /api/health: what the backend is connected to, the public login
 * settings, and which integrations are switched on, with the public parts
 * the app needs (never a secret). The app, the dashboard's Settings page,
 * the app-launch skill's checks and the smoke tests all read this.
 */
import { posthogConfig } from './_lib/analytics.js';
import { authConfig } from './_lib/auth.js';
import { dbConfigured, handle, sql } from './_lib/db.js';
import { mapsPublicConfig } from './_lib/maps.js';
import { emailConfigured } from './_lib/notify.js';
import { slackConfigured } from './_lib/slack.js';
import { billingConfigured, currency, priceCents } from './_lib/stripe.js';
import { tappPublicConfig } from './_lib/tapp.js';

type Providers = { google: boolean; apple: boolean };
let providers: { value: Providers; until: number } | null = null;
/** Whether Google and Apple sign-in are on in Supabase (Authentication → Sign In / Providers), asked at most every 5 minutes. */
async function providersOn(): Promise<Providers> {
  if (providers && providers.until > Date.now()) return providers.value;
  const cfg = authConfig();
  const value = { google: false, apple: false };
  if (cfg)
    try {
      const s = (await (await fetch(`${cfg.url}/auth/v1/settings`, { headers: { apikey: cfg.key }, signal: AbortSignal.timeout(3000) })).json()) as { external?: { google?: boolean; apple?: boolean } };
      Object.assign(value, { google: !!s.external?.google, apple: !!s.external?.apple });
    } catch {}
  providers = { value, until: Date.now() + 300_000 };
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
  const signIn = auth ? await providersOn() : { google: false, apple: false };
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
      google: signIn.google,
      apple: signIn.apple, // Sign in with Apple, offered in the iPhone app only (docs/SIGN-IN.md)
      tapp: tappPublicConfig(), // the two tokens Tapp's SDK starts with: every app build carries them anyway
      maps: mapsPublicConfig(), // Mapbox's public token, restricted to the site's URL: the map draws in the member's browser or app with it
      slack: slackConfigured(), // the team's Slack pings (docs/SLACK.md): whether a webhook is set, never its URL
      push: true, // Expo's push service needs no key; devices register from the iOS and Android apps
    },
  });
});
