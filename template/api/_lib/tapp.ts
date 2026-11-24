/**
 * Tapp (tapp.so): share links that survive the install, and install
 * attribution. Off until TAPP_AUTH_TOKEN and TAPP_TOKEN are set (from
 * dashboard.tapp.so, the same two values the iOS and Android apps start
 * Tapp's SDK with).
 *
 * Two kinds of link, each keyed on an opaque code Tapp calls an "influencer"
 * (Tapp never sees an account id, a name or an email):
 *  - a member's invite link (`inviteLink`, made once and kept on the account:
 *    api/accounts.ts), whose code the invited friend's app reads back on first
 *    launch and hands to the server once signed in, so the dashboard shows who
 *    invited whom;
 *  - one link per acquisition channel (`channelLink`, for /go/<channel>:
 *    api/go.ts), so an iPhone install, which the App Store tells the app
 *    nothing about, still says where it came from.
 *
 * The request is the one Tapp's own SDKs send for a link: POST
 * /v1/ref/influencer/add with the auth token as a bearer token and `mmp: 3`
 * (Tapp's own attribution). Nothing here throws: no link is null, and the
 * request that asked carries on without one.
 */
import { BUNDLE_ID } from './app.js';
import { dbConfigured, sql } from './db.js';

export const TAPP_API = 'https://api.tapp.so/v1/ref/influencer/add';
const TAPP_OWN_ATTRIBUTION = 3;
const REQUEST_TIMEOUT_MS = 5000;

/** A channel's slug, as in /go/<channel>: lowercase letters, digits and hyphens. */
export const CHANNEL = /^[a-z0-9][a-z0-9-]{0,31}$/;
/** An invite code: lowercase letters and digits only, so it never looks like a channel's `go-…`. */
export const INVITE_CODE = /^[a-z0-9]{6,32}$/;
const CHANNEL_PREFIX = 'go-';

export const tappConfigured = () => !!(process.env.TAPP_AUTH_TOKEN && process.env.TAPP_TOKEN);

/** The public parts the app starts Tapp's SDK with (the SDK carries them in every app build anyway), or null. */
export const tappPublicConfig = () => (tappConfigured() ? { authToken: process.env.TAPP_AUTH_TOKEN!, tappToken: process.env.TAPP_TOKEN! } : null);

/** The app id Tapp knows the app by: TAPP_BUNDLE_ID, else the one in app.json (BUNDLE_ID). */
const bundleId = () => process.env.TAPP_BUNDLE_ID || BUNDLE_ID;

async function createLink(influencer: string, adgroup: string, data: Record<string, string>): Promise<string | null> {
  if (!tappConfigured()) return null;
  try {
    const res = await fetch(TAPP_API, {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.TAPP_AUTH_TOKEN}`, 'content-type': 'application/json' },
      body: JSON.stringify({ tapp_token: process.env.TAPP_TOKEN, bundle_id: bundleId(), mmp: TAPP_OWN_ATTRIBUTION, adgroup, creative: '', influencer, data }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => ({}))) as { influencer_url?: string; message?: string };
    if (!res.ok || !body.influencer_url) {
      console.warn('tapp: no link for', influencer, res.status, body.message ?? '');
      return null;
    }
    return body.influencer_url;
  } catch (e) {
    console.warn('tapp: could not reach Tapp', (e as Error).message);
    return null;
  }
}

/** A member's invite link for their code, or null. */
export const inviteLink = (code: string) => (INVITE_CODE.test(code) ? createLink(code, 'invite', { kind: 'invite' }) : Promise.resolve(null));

/** A new invite code: 12 random hex characters. */
export const newInviteCode = () => [...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(16).padStart(2, '0')).join('');

/**
 * The link for a /go/<channel>, made on its first use and kept in
 * tapp_links, or null. Its influencer is `go-<channel>`, which an invite code
 * (no hyphens) can never be.
 */
export async function channelLink(channel: string): Promise<string | null> {
  if (!tappConfigured() || !CHANNEL.test(channel)) return null;
  try {
    if (dbConfigured()) {
      const [kept] = await sql()`select link from tapp_links where channel = ${channel}`;
      if (kept) return kept.link as string;
    }
    const link = await createLink(`${CHANNEL_PREFIX}${channel}`, 'channel', { kind: 'channel', channel });
    if (link && dbConfigured()) await sql()`insert into tapp_links (channel, link) values (${channel}, ${link}) on conflict (channel) do nothing`;
    return link;
  } catch (e) {
    console.warn('tapp: channel link failed', (e as Error).message);
    return null;
  }
}

/**
 * What a claim from a new member's phone means: an invite code, or a channel.
 * Anything else is nothing.
 */
export function readClaim(body: { code?: unknown; channel?: unknown }): { code: string } | { channel: string } | null {
  const code = String(body.code ?? '').trim().toLowerCase();
  if (INVITE_CODE.test(code)) return { code };
  const channel = String(body.channel ?? '').trim().toLowerCase();
  if (CHANNEL.test(channel)) return { channel };
  return null;
}

/** An invite counts only for an account made in the last 14 days: an established member opening a friend's link wasn't invited. */
export const CLAIM_WINDOW_DAYS = 14;
export const withinClaimWindow = (createdAt: Date | string, now = Date.now()) => now - new Date(createdAt).getTime() <= CLAIM_WINDOW_DAYS * 86_400_000;

/** Which phone a request came from, by its user agent. */
export const platformOf = (userAgent: string): 'ios' | 'android' | 'web' => (/iphone|ipad|ipod/i.test(userAgent) ? 'ios' : /android/i.test(userAgent) ? 'android' : 'web');
