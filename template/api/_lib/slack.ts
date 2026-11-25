/**
 * Slack for the team (docs/SLACK.md), cut down from Naz's server/slack.js: a
 * line to an incoming webhook. Off until SLACK_WEBHOOK_URL is set: one webhook
 * for one channel every app the business runs posts to (a Vercel team shared
 * variable, linked by Set up app). A kind of ping can have a channel of its
 * own (SLACK_SIGNUPS_WEBHOOK_URL, SLACK_PROGRAMS_WEBHOOK_URL,
 * SLACK_PAYMENTS_WEBHOOK_URL), falling back to it.
 *
 * A ping never fails the request behind it: it's sent after the answer
 * (`later`), a 5xx or a dropped connection is tried once more, the same ping
 * twice in five minutes is sent once, and nothing here throws. With no
 * webhook the logs say so once for each channel; /api/health says whether
 * Slack is on, never the URL.
 */
import type { Channel, Ping } from './pings.js';

const CHANNEL_WEBHOOKS: Record<Channel, string> = {
  signups: 'SLACK_SIGNUPS_WEBHOOK_URL',
  programs: 'SLACK_PROGRAMS_WEBHOOK_URL',
  payments: 'SLACK_PAYMENTS_WEBHOOK_URL',
};
const DEDUPE_MS = 5 * 60 * 1000;
const RETRY_AFTER_MS = 1500;
const TIMEOUT_MS = 4000;
const MAX_REMEMBERED = 1000;

type Env = Record<string, string | undefined>;
type Sent = { sent: true } | { sent: false; reason: string };

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Whether any ping can be sent: the shared webhook, or a channel's own. */
export const slackConfigured = (env: Env = process.env) => !!env.SLACK_WEBHOOK_URL || Object.values(CHANNEL_WEBHOOKS).some((name) => !!env[name]);

export function createSlack({
  env = process.env,
  fetch = globalThis.fetch,
  now = Date.now,
  wait = pause,
  log = console.warn,
}: { env?: Env; fetch?: typeof globalThis.fetch; now?: () => number; wait?: (ms: number) => Promise<void>; log?: (...args: unknown[]) => void } = {}) {
  const sentAt = new Map<string, number>();
  const saidUnset = new Set<Channel>();

  const webhookFor = (channel: Channel) => env[CHANNEL_WEBHOOKS[channel]] || env.SLACK_WEBHOOK_URL || null;

  function alreadySent(key: string) {
    const at = sentAt.get(key);
    if (at != null && now() - at < DEDUPE_MS) return true;
    if (sentAt.size >= MAX_REMEMBERED) sentAt.delete(sentAt.keys().next().value as string);
    sentAt.set(key, now());
    return false;
  }

  async function postOnce(url: string, text: string) {
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text }), signal: AbortSignal.timeout(TIMEOUT_MS) });
      return { ok: res.ok, retry: res.status >= 500, status: String(res.status) };
    } catch (e) {
      return { ok: false, retry: true, status: (e as Error)?.message ?? 'failed' };
    }
  }

  /** Sends one ping; resolves with what happened, never rejects. */
  async function notify(ping: Ping | null | undefined): Promise<Sent> {
    try {
      if (!ping) return { sent: false, reason: 'nothing' };
      const url = webhookFor(ping.channel);
      if (!url) {
        if (!saidUnset.has(ping.channel)) log(`[slack] ${ping.channel} ping not sent: no webhook. Set SLACK_WEBHOOK_URL in Vercel (docs/SLACK.md)`);
        saidUnset.add(ping.channel);
        return { sent: false, reason: 'no_webhook' };
      }
      if (alreadySent(`${ping.channel}|${ping.key}`)) return { sent: false, reason: 'duplicate' };
      let result = await postOnce(url, ping.text);
      if (!result.ok && result.retry) {
        await wait(RETRY_AFTER_MS);
        result = await postOnce(url, ping.text);
      }
      if (!result.ok) log(`[slack] ${ping.channel} ping not sent:`, result.status);
      return result.ok ? { sent: true } : { sent: false, reason: result.status };
    } catch (e) {
      log('[slack] ping not sent:', (e as Error)?.message);
      return { sent: false, reason: 'error' };
    }
  }

  return { notify };
}

const slack = createSlack();

/**
 * Keeps work going after the response, on Vercel through its request
 * context's waitUntil (what @vercel/functions' waitUntil calls), elsewhere by
 * letting the promise run. Never rejects into the caller.
 */
export function later(work: Promise<unknown>) {
  const safe = work.catch(() => {});
  const context = (globalThis as Record<symbol, { get?: () => { waitUntil?: (p: Promise<unknown>) => void } } | undefined>)[Symbol.for('@vercel/request-context')];
  try {
    context?.get?.()?.waitUntil?.(safe);
  } catch {}
}

/** Pings the team after the answer, if Slack is on; never throws. */
export const ping = (p: Ping | null | undefined) => later(slack.notify(p));
