/**
 * Product analytics to PostHog over its capture API, with no SDK. Off until
 * POSTHOG_KEY is set (POSTHOG_HOST defaults to PostHog's US cloud). The server
 * sends the events that only it knows for sure: sign-ups and plan changes.
 */
export const posthogConfig = () => (process.env.POSTHOG_KEY ? { key: process.env.POSTHOG_KEY, host: (process.env.POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '') } : null);

export async function capture(distinctId: string, event: string, properties: Record<string, unknown> = {}) {
  const cfg = posthogConfig();
  if (!cfg) return;
  try {
    await fetch(`${cfg.host}/i/v0/e/`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ api_key: cfg.key, event, distinct_id: distinctId, properties: { ...properties, $lib: 'fohm-server' }, timestamp: new Date().toISOString() }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (e) {
    console.warn('posthog: could not send', (e as Error).message);
  }
}
