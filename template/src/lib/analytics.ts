/**
 * Product analytics to PostHog over its capture API, with no SDK, so the same
 * code runs on the web, iOS and Android. Off until the server has POSTHOG_KEY
 * (the app reads it from /api/health). Events carry the account id once
 * signed in, and an anonymous id kept on the device before that. Never send
 * what people write: only what they did.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { CONSENT_KEY, consentFrom, keepsId, type Consent } from './consent';

let cfg: { key: string; host: string } | null = null;
let distinctId: string | null = null;
/** On the web, the id is kept on the device only once a visitor allows all (src/lib/consent.ts); the apps always keep it. */
let keeps = Platform.OS !== 'web';

export async function initAnalytics(config: { key: string; host: string } | null) {
  cfg = config;
  if (!cfg) return;
  try {
    keeps = keepsId(consentFrom(await AsyncStorage.getItem(CONSENT_KEY)), Platform.OS === 'web');
    distinctId = keeps ? await AsyncStorage.getItem('analytics:id') : null;
    if (!distinctId) {
      distinctId = newAnonId();
      if (keeps) await AsyncStorage.setItem('analytics:id', distinctId);
    }
  } catch {
    distinctId = newAnonId();
  }
}

/** The visitor's answer on the web: allow all keeps the id from now on; counting only forgets any kept one. */
export async function setConsent(consent: Consent) {
  keeps = keepsId(consent, Platform.OS === 'web');
  try {
    await AsyncStorage.setItem(CONSENT_KEY, consent);
    if (keeps && distinctId) await AsyncStorage.setItem('analytics:id', distinctId);
    if (!keeps) await AsyncStorage.removeItem('analytics:id');
  } catch {
    // Storage blocked: asked again on the next visit.
  }
}

/** What the visitor chose, or 'pending' until they answer. */
export async function storedConsent(): Promise<Consent | 'pending'> {
  try {
    return consentFrom(await AsyncStorage.getItem(CONSENT_KEY));
  } catch {
    return 'pending';
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
  if (keeps) AsyncStorage.setItem('analytics:id', accountId).catch(() => {});
}

/**
 * Forgets the account on this device, on signing out or deleting it: what the
 * next person does here is theirs, not counted against the last account.
 */
export function forgetIdentity() {
  if (!cfg) return;
  distinctId = newAnonId();
  if (keeps) AsyncStorage.setItem('analytics:id', distinctId).catch(() => {});
}

export const screen = (path: string) => track('$pageview', { $current_url: path, $pathname: path });
