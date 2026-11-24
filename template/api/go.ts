/**
 * GET /go/<channel> (vercel.json rewrites it to /api/go?channel=<channel>):
 * one link to post per place you find people (a newsletter, a social post, a
 * flyer's QR code). A phone goes through the channel's Tapp link when Tapp is
 * on, so the app it installs learns the channel on first launch and the
 * dashboard shows where each member came from; everyone else, and every
 * phone while Tapp is off or slow, lands on the site with the channel in its
 * utm tags. A click never dead-ends. Each click is counted in PostHog,
 * anonymously.
 */
import { capture } from './_lib/analytics.js';
import { siteUrl } from './_lib/app.js';
import { handle } from './_lib/db.js';
import { CHANNEL, channelLink, platformOf } from './_lib/tapp.js';

/** How long a phone waits for Tapp before it goes to the site instead. */
const TAPP_DEADLINE_MS = 2500;

const within = <T>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);

export const GET = handle(async (req) => {
  const url = new URL(req.url);
  const raw = (url.searchParams.get('channel') ?? '').trim().toLowerCase();
  const valid = CHANNEL.test(raw);
  const channel = valid ? raw : 'invalid';
  const platform = platformOf(req.headers.get('user-agent') ?? '');

  const tapp = valid && platform !== 'web' ? await within(channelLink(channel), TAPP_DEADLINE_MS) : null;
  await capture(`link-${crypto.randomUUID()}`, 'link_clicked', { channel, platform, via: tapp ? 'tapp' : 'site', $process_person_profile: false });

  const site = siteUrl() || url.origin;
  const dest = tapp ?? `${site}/?utm_source=${encodeURIComponent(channel)}&utm_medium=link`;
  return new Response(null, { status: 302, headers: { location: dest, 'cache-control': 'no-store' } });
});
