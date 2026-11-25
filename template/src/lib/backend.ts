import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { apiBase, isWeb } from './config';
import { mediaBody, type PickedMedia } from './media';
import type { HeldLink } from './tappLink';
import type { LngLat, Profile, Snapped } from './routes';
import { EMPTY_DB, newId, type AiChat, type DB, type Role, type User } from './types';

/**
 * Where the app's data lives, and how people sign in.
 *  - 'api': the backend (/api over Postgres) with Supabase Auth email login.
 *    Used whenever /api/health reports a database and login settings.
 *  - 'local': demo mode. The device keeps the whole snapshot and accounts need
 *    no password, for local dev and unconfigured previews.
 * The app never talks to the database directly.
 */
export type Table = keyof DB;
export type Mode = 'api' | 'local';
export interface ProfileInput {
  name: string;
  role: Role;
  ownerCode?: string;
}
export type Who = { user: User } | { needsProfile: true; email: string } | null;

/** Which integrations the server has switched on, with their public settings (from /api/health). */
export interface Integrations {
  billing: { priceCents: number; currency: string } | null;
  posthog: { key: string; host: string } | null;
  sentry: { dsn: string } | null;
  email: boolean;
  ai: boolean;
  google: boolean;
  /** Sign in with Apple: Supabase's Apple provider is on (the iPhone app only). */
  apple: boolean;
  push: boolean;
  /** The team's Slack pings (docs/SLACK.md): whether a webhook is set, never its URL. */
  slack: boolean;
  /** Tapp's share links: the two tokens its SDK starts with in the iOS and Android apps. */
  tapp: { authToken: string; tappToken: string } | null;
  /** Maps (Mapbox): the public token the route map draws with (docs/ROUTES.md). */
  maps: { token: string } | null;
}
export const NO_INTEGRATIONS: Integrations = { billing: null, posthog: null, sentry: null, email: false, ai: false, google: false, apple: false, push: false, slack: false, tapp: null, maps: null };

/** The private Storage bucket for members' and coaches' videos, photos and voice notes. */
export const MEDIA_BUCKET = 'member-media';

export interface Backend {
  mode: Mode;
  integrations: Integrations;
  load(): Promise<DB>;
  whoAmI(): Promise<Who>;
  signUp(email: string, password: string, p: ProfileInput): Promise<{ user: User } | { confirmEmail: true }>;
  signIn(email: string, password: string): Promise<Who>;
  createProfile(p: ProfileInput): Promise<User>;
  signOut(): Promise<void>;
  upsertMany<T extends { id: string }>(table: Table, records: T[]): Promise<void>;
  remove(table: Table, id: string): Promise<void>;
  deleteAccount(): Promise<void>;
  /** Pro: a Stripe page to go to (checkout to buy, portal to manage). */
  billing(action: 'checkout' | 'portal', returnUrl: string): Promise<string>;
  /** Owner only: give a member Pro, or take it back. */
  setPlan(memberId: string, plan: 'pro' | 'free'): Promise<void>;
  /** The AI assistant (Pro). */
  ask(question: string): Promise<AiChat>;
  /** The points joined by the roads, for the route map (api/route.ts): each leg on a road, or straight with why. */
  snapRoute(points: LngLat[], profile: Profile): Promise<Snapped>;
  /** Uploads a video, photo or voice note into the caller's own folder; returns its path. */
  uploadMedia(media: PickedMedia): Promise<string>;
  /** A link that plays a file for the next hour (if the caller may see it). */
  mediaUrl(path: string): Promise<string>;
  removeMedia(path: string): Promise<void>;
  /** Owner only: a member's coach (null for none). */
  assignCoach(memberId: string, coachId: string | null): Promise<void>;
  /** Owner only: a member goes through onboarding again (their level and answers cleared). */
  resetOnboarding(memberId: string): Promise<void>;
  /** Owner only: a member's or coach's account and login, deleted for good. */
  removeAccount(memberId: string): Promise<void>;
  /** The caller's invite link (Tapp; null while it's off) and how many have joined through it. */
  invite(): Promise<{ link: string | null; joined: number }>;
  /** Hands the server what the link this phone installed through named (src/lib/tapp.native.ts). */
  claim(link: HeldLink): Promise<{ outcome: string }>;
  /** Web only: off to Google and back to / signed in (a first sign-in finishes its profile). */
  signInWithGoogle(): Promise<void>;
  /** The apps: signs in with an ID token from Apple or Google (src/lib/nativeSignIn.native.tsx), then who that is. */
  signInWithIdToken(provider: 'apple' | 'google', token: string, nonce?: string): Promise<Who>;
  /** Demo mode only: keep the whole snapshot on the device. */
  persist?(db: DB): Promise<void>;
}

/** Which app is asking, so the dashboard shows where each person was last (api/_lib/seen.ts). */
const CLIENT: Record<string, string> = { 'x-app-platform': Platform.OS, ...(Constants.expoConfig?.version ? { 'x-app-version': Constants.expoConfig.version } : {}) };

// ---------------------------------------------------------------------------
// API backend (Supabase Auth + /api)
// ---------------------------------------------------------------------------
function apiBackend(auth: SupabaseClient, integrations: Integrations): Backend {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const { data } = await auth.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(apiBase() + path, {
      ...init,
      headers: { 'content-type': 'application/json', ...CLIENT, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(body.error ?? `Request failed (${res.status})`), { status: res.status, body });
    return body as T;
  }

  async function whoAmI(): Promise<Who> {
    const { data } = await auth.auth.getSession();
    if (!data.session) return null;
    try {
      return { user: (await request<{ user: User }>('/api/accounts')).user };
    } catch (e: any) {
      if (e.status === 404 && e.body?.needsProfile) return { needsProfile: true, email: e.body.email };
      if (e.status === 401) {
        await auth.auth.signOut();
        return null;
      }
      throw e;
    }
  }
  const createProfile = async (p: ProfileInput) => (await request<{ user: User }>('/api/accounts', { method: 'POST', body: JSON.stringify(p) })).user;

  return {
    mode: 'api',
    integrations,
    billing: async (action, returnUrl) => (await request<{ url: string }>('/api/billing', { method: 'POST', body: JSON.stringify({ action, returnUrl }) })).url,
    setPlan: async (memberId, plan) => void (await request('/api/accounts', { method: 'POST', body: JSON.stringify({ action: 'plan', memberId, plan }) })),
    ask: async (question) => (await request<{ chat: AiChat }>('/api/ai', { method: 'POST', body: JSON.stringify({ question }) })).chat,
    snapRoute: (points, profile) => request<Snapped>('/api/route', { method: 'POST', body: JSON.stringify({ points, profile }) }),
    async uploadMedia(media) {
      const { data } = await auth.auth.getUser();
      if (!data.user) throw new Error('Sign in first');
      const path = `${data.user.id}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${media.ext}`;
      const { error } = await auth.storage.from(MEDIA_BUCKET).upload(path, await mediaBody(media), { contentType: media.mimeType, upsert: false });
      if (error) throw new Error(/exceed|too large|payload/i.test(error.message) ? 'That file is too big. Try a shorter clip.' : error.message);
      return path;
    },
    async mediaUrl(path) {
      const { data, error } = await auth.storage.from(MEDIA_BUCKET).createSignedUrl(path, 3600);
      if (error || !data) throw new Error('That file can’t be played.');
      return data.signedUrl;
    },
    async removeMedia(path) {
      await auth.storage.from(MEDIA_BUCKET).remove([path]);
    },
    assignCoach: async (memberId, coachId) => void (await request('/api/accounts', { method: 'POST', body: JSON.stringify({ action: 'assign', memberId, coachId }) })),
    resetOnboarding: async (memberId) => void (await request('/api/accounts', { method: 'POST', body: JSON.stringify({ action: 'reset', memberId }) })),
    removeAccount: async (memberId) => void (await request('/api/accounts', { method: 'POST', body: JSON.stringify({ action: 'remove', memberId }) })),
    invite: () => request<{ link: string | null; joined: number }>('/api/accounts', { method: 'POST', body: JSON.stringify({ action: 'invite' }) }),
    claim: (link) => request<{ outcome: string }>('/api/accounts', { method: 'POST', body: JSON.stringify({ action: 'claim', ...link }) }),
    async signInWithGoogle() {
      const { error } = await auth.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } });
      if (error) throw error;
    },
    async signInWithIdToken(provider, token, nonce) {
      const { error } = await auth.auth.signInWithIdToken({ provider, token, ...(nonce ? { nonce } : {}) });
      if (error) throw new Error(error.message);
      return whoAmI();
    },
    load: () => request<DB>('/api/data').then((db) => ({ ...EMPTY_DB, ...db })),
    whoAmI,
    async signUp(email, password, p) {
      const { data, error } = await auth.auth.signUp({ email, password, options: { emailRedirectTo: isWeb ? window.location.origin : apiBase() || undefined } });
      if (error) throw error;
      if (!data.session) return { confirmEmail: true };
      return { user: await createProfile(p) };
    },
    async signIn(email, password) {
      const { error } = await auth.auth.signInWithPassword({ email, password });
      if (error) throw new Error(/invalid login/i.test(error.message) ? 'That email and password don’t match.' : error.message);
      return whoAmI();
    },
    createProfile,
    signOut: async () => void (await auth.auth.signOut()),
    upsertMany: async (table, records) => void (await request('/api/data', { method: 'POST', body: JSON.stringify({ collection: table, records }) })),
    remove: async (table, id) => void (await request(`/api/data?collection=${table}&id=${encodeURIComponent(id)}`, { method: 'DELETE' })),
    async deleteAccount() {
      await request('/api/accounts', { method: 'DELETE' });
      await auth.auth.signOut();
    },
  };
}

// ---------------------------------------------------------------------------
// Demo mode: everything on the device
// ---------------------------------------------------------------------------
const KEY = 'starter:db';
const ME = 'starter:me';

function localBackend(): Backend {
  const read = async (): Promise<DB> => ({ ...EMPTY_DB, ...JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}') });
  const write = (db: DB) => AsyncStorage.setItem(KEY, JSON.stringify(db));
  const meId = () => AsyncStorage.getItem(ME);
  async function signInAs(email: string, p?: ProfileInput): Promise<{ user: User }> {
    const db = await read();
    let user = db.users.find((u) => u.email === email.toLowerCase());
    if (!user) {
      if (!p) throw new Error('No account with that email on this device. Create one.');
      user = { id: newId('usr'), role: p.role, name: p.name, email: email.toLowerCase(), createdAt: new Date().toISOString() };
      db.users.push(user);
      await write(db);
    }
    await AsyncStorage.setItem(ME, user.id);
    return { user };
  }
  const off = async (): Promise<never> => {
    throw new Error('That needs the real backend: it isn’t available in demo mode.');
  };
  return {
    mode: 'local',
    integrations: NO_INTEGRATIONS,
    billing: off,
    ask: off,
    snapRoute: off,
    uploadMedia: off,
    mediaUrl: off,
    removeMedia: async () => {},
    async assignCoach(memberId, coachId) {
      const db = await read();
      db.users = db.users.map((u) => (u.id === memberId ? { ...u, coachId: coachId ?? undefined } : u));
      await write(db);
    },
    async resetOnboarding(memberId) {
      const db = await read();
      db.users = db.users.map((u) => (u.id === memberId ? { ...u, level: undefined, assessment: undefined, assessedAt: undefined, onboarding: undefined } : u));
      await write(db);
    },
    async removeAccount(memberId) {
      const db = await read();
      const mine = <T extends { memberId: string }>(rows: T[]) => rows.filter((r) => r.memberId !== memberId);
      await write({ ...db, users: db.users.filter((u) => u.id !== memberId), entries: mine(db.entries), scores: mine(db.scores), checkins: mine(db.checkins), progress: mine(db.progress), ai: mine(db.ai), saved: mine(db.saved), devices: mine(db.devices), routes: mine(db.routes) });
    },
    signInWithGoogle: off,
    signInWithIdToken: off,
    invite: async () => ({ link: null, joined: 0 }),
    claim: async () => ({ outcome: 'unknown' }),
    async setPlan(memberId, plan) {
      const db = await read();
      db.users = db.users.map((u) => (u.id === memberId ? { ...u, plan, planSource: plan === 'pro' ? 'owner' : undefined } : u));
      await write(db);
    },
    load: read,
    async whoAmI() {
      const id = await meId();
      const user = id ? (await read()).users.find((u) => u.id === id) : undefined;
      return user ? { user } : null;
    },
    signUp: (email, _password, p) => signInAs(email, p),
    signIn: (email) => signInAs(email),
    async createProfile() {
      throw new Error('Not used in demo mode');
    },
    signOut: () => AsyncStorage.removeItem(ME),
    async upsertMany(table, records) {
      const db = await read();
      const list = db[table] as unknown as { id: string }[];
      for (const r of records) {
        const i = list.findIndex((x) => x.id === r.id);
        if (i >= 0) list[i] = { ...list[i], ...r };
        else list.push(r);
      }
      await write(db);
    },
    async remove(table, id) {
      const db = await read();
      (db as any)[table] = (db[table] as { id: string }[]).filter((x) => x.id !== id);
      await write(db);
    },
    async deleteAccount() {
      const id = await meId();
      const db = await read();
      await write({ users: db.users.filter((u) => u.id !== id), entries: db.entries.filter((e) => e.memberId !== id), scores: db.scores.filter((s) => s.memberId !== id), checkins: db.checkins.filter((s) => s.memberId !== id), progress: db.progress.filter((s) => s.memberId !== id), ai: db.ai.filter((s) => s.memberId !== id), saved: db.saved.filter((s) => s.memberId !== id), devices: db.devices.filter((s) => s.memberId !== id), routes: db.routes.filter((s) => s.memberId !== id) });
      await AsyncStorage.removeItem(ME);
    },
    persist: write,
  };
}

/** Picks the backend from what /api/health reports: a database and login settings mean the real one. */
export async function connect(): Promise<Backend> {
  try {
    const health = (await fetch(`${apiBase()}/api/health`).then((r) => r.json())) as { db: string; auth: { url: string; key: string } | null; integrations?: Integrations };
    if (health.db === 'ok' && health.auth)
      return apiBackend(
        // In the apps the session is kept in AsyncStorage; on the web, in the browser's storage.
        createClient(health.auth.url, health.auth.key, { auth: { persistSession: true, detectSessionInUrl: isWeb, storage: isWeb ? undefined : AsyncStorage } }),
        { ...NO_INTEGRATIONS, ...health.integrations },
      );
  } catch {
    // No backend reachable (plain `expo start`, or no apiUrl in the apps): demo mode.
  }
  return localBackend();
}
