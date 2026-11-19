/**
 * Product analytics to PostHog over its capture API, with no SDK, so the same
 * code runs on the web, iOS and Android. Off until the server has POSTHOG_KEY
 * (the app reads it from /api/health). Events carry the account id once
 * signed in, and an anonymous id kept on the device before that. Never send
 * what people write: only what they did.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

let cfg: { key: string; host: string } | null = null;
let distinctId: string | null = null;

export async function initAnalytics(config: { key: string; host: string } | null) {
  cfg = config;
  if (!cfg) return;
  try {
    distinctId = await AsyncStorage.getItem('analytics:id');
    if (!distinctId) {
      distinctId = newAnonId();
      await AsyncStorage.setItem('analytics:id', distinctId);
    }
  } catch {
    distinctId = newAnonId();
  }
}

/** A fresh anonymous id, never an account's. */
export function newAnonId(): string {
  return `anon_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

export function track(event: string, properties: Record<string, unknown> = {}) {
  if (!cfg || !distinctId) return;
  fetch(`${cfg.host}/i/v0/e/`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ api_key: cfg.key, event, distinct_id: distinctId, properties: { ...properties, $os: Platform.OS, $lib: 'fohm-app' }, timestamp: new Date().toISOString() }),
  }).catch(() => {});
}

/** Ties what happened before sign-in to the account. */
export function identify(accountId: string, properties: Record<string, unknown> = {}) {
  if (!cfg || !distinctId || distinctId === accountId) return;
  track('$identify', { $anon_distinct_id: distinctId, $set: properties, distinct_id: accountId });
  distinctId = accountId;
  AsyncStorage.setItem('analytics:id', accountId).catch(() => {});
}

/**
 * Forgets the account on this device, on signing out or deleting it: what the
 * next person does here is theirs, not counted against the last account.
 */
export function forgetIdentity() {
  if (!cfg) return;
  distinctId = newAnonId();
  AsyncStorage.setItem('analytics:id', distinctId).catch(() => {});
}

export const screen = (path: string) => track('$pageview', { $current_url: path, $pathname: path });
