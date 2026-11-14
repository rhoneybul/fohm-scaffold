/**
 * Errors to Sentry over its HTTP envelope API, with no SDK, so a Vercel
 * function stays small. Off until SENTRY_DSN is set. Only 500s are sent:
 * a 4xx is the caller's mistake, not a bug.
 */
import { randomUUID } from 'node:crypto';

export interface Dsn {
  key: string;
  host: string;
  projectId: string;
  protocol: string;
  dsn: string;
}

export function parseDsn(dsn?: string | null): Dsn | null {
  const m = dsn?.match(/^(https?):\/\/([^@:]+)(?::[^@]*)?@([^/]+)\/(?:.*\/)?(\d+)$/);
  return m ? { protocol: m[1], key: m[2], host: m[3], projectId: m[4], dsn: dsn! } : null;
}

/** One Sentry event in an envelope: header line, item header line, event line. */
export function envelope(d: Dsn, error: unknown, extra: Record<string, unknown> = {}, platform = 'node') {
  const e = error instanceof Error ? error : new Error(String(error));
  const event = {
    event_id: randomUUID().replace(/-/g, ''),
    timestamp: Date.now() / 1000,
    platform,
    level: 'error',
    environment: process.env.VERCEL_ENV ?? 'development',
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    exception: { values: [{ type: e.name, value: e.message }] },
    extra: { stack: e.stack, ...extra },
  };
  return [JSON.stringify({ event_id: event.event_id, sent_at: new Date().toISOString(), dsn: d.dsn }), JSON.stringify({ type: 'event' }), JSON.stringify(event)].join('\n');
}

export async function captureException(error: unknown, extra: Record<string, unknown> = {}) {
  const d = parseDsn(process.env.SENTRY_DSN);
  if (!d) return;
  try {
    await fetch(`${d.protocol}://${d.host}/api/${d.projectId}/envelope/`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-sentry-envelope', 'x-sentry-auth': `Sentry sentry_version=7, sentry_key=${d.key}, sentry_client=fohm-scaffold/0.1` },
      body: envelope(d, error, extra),
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {
    console.warn('sentry: could not send', (e as Error).message);
  }
}
