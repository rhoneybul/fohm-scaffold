/**
 * Crash and error reports to Sentry over its HTTP envelope API, with no SDK,
 * so the same code runs on the web, iOS and Android. Off until the server has
 * SENTRY_DSN (the app reads it from /api/health). Catches uncaught errors,
 * unhandled promise rejections and React render errors (ErrorBoundary).
 * For native crash symbolication and source maps, swap in @sentry/react-native
 * later; this keeps the setup to one environment variable.
 */
import { Platform } from 'react-native';

let target: { url: string; dsn: string } | null = null;
let user: { id: string } | null = null;

export function initSentry(config: { dsn: string } | null) {
  const m = config?.dsn.match(/^(https?):\/\/([^@:]+)(?::[^@]*)?@([^/]+)\/(?:.*\/)?(\d+)$/);
  if (!m || target) return;
  // Auth in the query string and a text/plain body: a simple request, so browsers send it without a preflight.
  target = { url: `${m[1]}://${m[3]}/api/${m[4]}/envelope/?sentry_key=${m[2]}&sentry_version=7&sentry_client=fohm-app%2F0.1`, dsn: config!.dsn };
  if (Platform.OS === 'web') {
    window.addEventListener('error', (e) => captureException(e.error ?? e.message));
    window.addEventListener('unhandledrejection', (e) => captureException(e.reason));
  } else {
    const g = globalThis as any;
    const previous = g.ErrorUtils?.getGlobalHandler?.();
    g.ErrorUtils?.setGlobalHandler?.((error: unknown, fatal?: boolean) => {
      captureException(error, { fatal });
      previous?.(error, fatal);
    });
  }
}

export const setSentryUser = (id: string | null) => (user = id ? { id } : null);

export function captureException(error: unknown, extra: Record<string, unknown> = {}) {
  if (!target) return;
  const e = error instanceof Error ? error : new Error(String(error));
  const id = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  const event = {
    event_id: id,
    timestamp: Date.now() / 1000,
    platform: 'javascript',
    level: 'error',
    tags: { os: Platform.OS },
    user: user ?? undefined,
    exception: { values: [{ type: e.name, value: e.message }] },
    extra: { stack: e.stack, ...extra },
  };
  const body = [JSON.stringify({ event_id: id, sent_at: new Date().toISOString(), dsn: target.dsn }), JSON.stringify({ type: 'event' }), JSON.stringify(event)].join('\n');
  fetch(target.url, { method: 'POST', headers: { 'content-type': 'text/plain' }, body }).catch(() => {});
}
