import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { apiBase, isWeb } from './config';
import { EMPTY_DB, newId, type DB, type Role, type User } from './types';

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

export interface Backend {
  mode: Mode;
  load(): Promise<DB>;
  whoAmI(): Promise<Who>;
  signUp(email: string, password: string, p: ProfileInput): Promise<{ user: User } | { confirmEmail: true }>;
  signIn(email: string, password: string): Promise<Who>;
  createProfile(p: ProfileInput): Promise<User>;
  signOut(): Promise<void>;
  upsertMany<T extends { id: string }>(table: Table, records: T[]): Promise<void>;
  remove(table: Table, id: string): Promise<void>;
  deleteAccount(): Promise<void>;
  /** Demo mode only: keep the whole snapshot on the device. */
  persist?(db: DB): Promise<void>;
}

// ---------------------------------------------------------------------------
// API backend (Supabase Auth + /api)
// ---------------------------------------------------------------------------
function apiBackend(auth: SupabaseClient): Backend {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const { data } = await auth.auth.getSession();
    const token = data.session?.access_token;
    const res = await fetch(apiBase() + path, {
      ...init,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
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
  return {
    mode: 'local',
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
      await write({ users: db.users.filter((u) => u.id !== id), entries: db.entries.filter((e) => e.memberId !== id), scores: db.scores.filter((s) => s.memberId !== id) });
      await AsyncStorage.removeItem(ME);
    },
    persist: write,
  };
}

/** Picks the backend from what /api/health reports: a database and login settings mean the real one. */
export async function connect(): Promise<Backend> {
  try {
    const health = (await fetch(`${apiBase()}/api/health`).then((r) => r.json())) as { db: string; auth: { url: string; key: string } | null };
    if (health.db === 'ok' && health.auth)
      return apiBackend(
        // In the apps the session is kept in AsyncStorage; on the web, in the browser's storage.
        createClient(health.auth.url, health.auth.key, { auth: { persistSession: true, detectSessionInUrl: isWeb, storage: isWeb ? undefined : AsyncStorage } }),
      );
  } catch {
    // No backend reachable (plain `expo start`, or no apiUrl in the apps): demo mode.
  }
  return localBackend();
}
