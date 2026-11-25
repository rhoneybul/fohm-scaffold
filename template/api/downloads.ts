/**
 * POST /api/downloads { platform: 'ios'|'android', version, build }: the
 * iPhone or Android app's first launch (src/lib/downloaded.native.ts), signed
 * out, pinged to the team's Slack as a download (docs/SLACK.md). Nothing about
 * the person leaves the phone: which app, its version and build. Anyone could
 * call it, so one an hour is taken from an address and 60 an hour in all,
 * held in memory only; the rest are answered and dropped. The web app has no
 * download.
 */
import { handle, HttpError } from './_lib/db.js';
import { createDownloadGate, downloadPing } from './_lib/pings.js';
import { ping } from './_lib/slack.js';

const allowed = createDownloadGate();

const addressOf = (req: Request) => req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

export const POST = handle(async (req) => {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const address = addressOf(req);
  const download = downloadPing(body, `${address}|${Date.now()}`);
  if (!download) throw new HttpError(400, 'Say which app was downloaded');
  if (allowed(address)) ping(download);
  return Response.json({ received: true }, { status: 202 });
});
