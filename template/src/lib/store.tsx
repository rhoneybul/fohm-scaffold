import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { connect, type Backend, type ProfileInput, type Who } from './backend';
import { EMPTY_DB, newId, type DB, type Entry, type Score, type User } from './types';

/**
 * App state and its actions. Every action writes through the backend first
 * (so the owner's dashboard sees it), then updates the screen. Data reloads
 * every 20 seconds while the app is open.
 */
interface Store {
  ready: boolean;
  backend: Backend | null;
  who: Who;
  me: User | null;
  db: DB;
  error: string | null;
  refresh(): Promise<void>;
  signUp(email: string, password: string, p: ProfileInput): Promise<'signed-in' | 'confirm-email'>;
  signIn(email: string, password: string): Promise<void>;
  finishProfile(p: ProfileInput): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  saveEntry(e: Pick<Entry, 'title' | 'body'> & { id?: string }): Promise<void>;
  removeEntry(id: string): Promise<void>;
  saveScore(game: string, points: number, seconds: number): Promise<void>;
  /** Owner only. */
  reply(entryId: string, reply: string): Promise<void>;
  /** Owner only. */
  saveOwnerNotes(userId: string, notes: string): Promise<void>;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [backend, setBackend] = useState<Backend | null>(null);
  const [who, setWho] = useState<Who>(null);
  const [db, setDb] = useState<DB>(EMPTY_DB);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const me = who && 'user' in who ? who.user : null;

  const load = useCallback(async (b: Backend) => {
    const w = await b.whoAmI();
    setWho(w);
    setDb(w && 'user' in w ? await b.load() : EMPTY_DB);
  }, []);

  useEffect(() => {
    connect()
      .then(async (b) => {
        setBackend(b);
        await load(b);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setReady(true));
  }, [load]);

  useEffect(() => {
    if (!backend || !me) return;
    const t = setInterval(() => load(backend).catch(() => {}), 20_000);
    return () => clearInterval(t);
  }, [backend, me, load]);

  const value = useMemo<Store>(() => {
    const b = () => {
      if (!backend) throw new Error('Still starting up');
      return backend;
    };
    const refresh = () => load(b());
    return {
      ready,
      backend,
      who,
      me,
      db,
      error,
      refresh,
      async signUp(email, password, p) {
        const r = await b().signUp(email, password, p);
        if ('confirmEmail' in r) return 'confirm-email';
        await refresh();
        return 'signed-in';
      },
      async signIn(email, password) {
        await b().signIn(email, password);
        await refresh();
      },
      async finishProfile(p) {
        await b().createProfile(p);
        await refresh();
      },
      async signOut() {
        await b().signOut();
        setWho(null);
        setDb(EMPTY_DB);
      },
      async deleteAccount() {
        await b().deleteAccount();
        setWho(null);
        setDb(EMPTY_DB);
      },
      async saveEntry(e) {
        if (!me) return;
        const now = new Date().toISOString();
        const old = e.id ? db.entries.find((x) => x.id === e.id) : undefined;
        const entry: Entry = { ...old, id: e.id ?? newId('ent'), memberId: old?.memberId ?? me.id, title: e.title.trim(), body: e.body?.trim() || undefined, createdAt: old?.createdAt ?? now, updatedAt: now };
        await b().upsertMany('entries', [entry]);
        await refresh();
      },
      async removeEntry(id) {
        await b().remove('entries', id);
        await refresh();
      },
      async saveScore(game, points, seconds) {
        if (!me) return;
        const score: Score = { id: newId('scr'), memberId: me.id, game, points, seconds, createdAt: new Date().toISOString() };
        await b().upsertMany('scores', [score]);
        await refresh();
      },
      async reply(entryId, reply) {
        const e = db.entries.find((x) => x.id === entryId);
        if (!e) return;
        await b().upsertMany('entries', [{ ...e, reply: reply.trim() || undefined, updatedAt: new Date().toISOString() }]);
        await refresh();
      },
      async saveOwnerNotes(userId, notes) {
        const u = db.users.find((x) => x.id === userId);
        if (!u) return;
        await b().upsertMany('users', [{ ...u, ownerNotes: notes }]);
        await refresh();
      },
    };
  }, [backend, who, me, db, ready, error, load]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore outside StoreProvider');
  return s;
}
