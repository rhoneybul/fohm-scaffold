/**
 * What a Tapp link carries, read from the link data Tapp's SDK gives the app:
 * a member's invite code or a /go/<channel> (api/_lib/tapp.ts makes both).
 * Plain logic, tested in Node (tests/tapp.test.ts); the SDK is src/lib/tapp.ts.
 */
export type HeldLink = { code: string } | { channel: string };

const INVITE_CODE = /^[a-z0-9]{6,32}$/;
const CHANNEL = /^[a-z0-9][a-z0-9-]{0,31}$/;
const CHANNEL_PREFIX = 'go-';

interface LinkData {
  error?: unknown;
  influencer?: unknown;
  data?: { kind?: unknown; channel?: unknown } | null;
}

/** The invite code or channel a Tapp link names, or null for anything else. */
export function readTappLink(link: LinkData | null | undefined): HeldLink | null {
  if (!link || link.error) return null;
  const influencer = String(link.influencer ?? '').trim().toLowerCase();
  const channel = String(link.data?.channel ?? '').trim().toLowerCase();
  if (link.data?.kind === 'channel' && CHANNEL.test(channel)) return { channel };
  if (influencer.startsWith(CHANNEL_PREFIX) && CHANNEL.test(influencer.slice(CHANNEL_PREFIX.length))) return { channel: influencer.slice(CHANNEL_PREFIX.length) };
  if (INVITE_CODE.test(influencer)) return { code: influencer };
  return null;
}
