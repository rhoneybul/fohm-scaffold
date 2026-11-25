import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { Platform } from 'react-native';

import { forgetIdentity, identify, initAnalytics, track } from './analytics';
import type { PickedMedia } from './media';
import { mergedRecord, type OnboardingRecord } from './onboarding';
import { localPhoto } from './photo';
import { ONBOARDING } from './progression';
import { isLocalPhoto } from './photoSize';
import { distanceBucket, thinTrack, type LngLat, type Profile, type Snapped } from './routes';
import { saveId, saveOf, savedRecord } from './saves';
import { NO_INTEGRATIONS, connect, type Backend, type Integrations, type ProfileInput, type Who } from './backend';
import { pushToken } from './push';
import { setTappClaimer, startTapp } from './tapp';
import { captureException, initSentry, setSentryUser } from './sentry';
import { EMPTY_DB, newId, type AiChat, type Checkin, type DB, type Device, type Entry, type Progress, type Route, type SavedStatus, type Score, type User } from './types';

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
  /** Which integrations the server has switched on. */
  integrations: Integrations;
  refresh(): Promise<void>;
  signInWithGoogle(): Promise<void>;
  /** Pro: go to Stripe to buy, or to manage it. Web only (the app stores' rules). */
  goToBilling(action: 'checkout' | 'portal'): Promise<void>;
  ask(question: string): Promise<AiChat>;
  /** Owner only. */
  setPlan(memberId: string, plan: 'pro' | 'free'): Promise<void>;
  signUp(email: string, password: string, p: ProfileInput): Promise<'signed-in' | 'confirm-email'>;
  signIn(email: string, password: string): Promise<void>;
  finishProfile(p: ProfileInput): Promise<void>;
  signOut(): Promise<void>;
  deleteAccount(): Promise<void>;
  /** A message to the coach, with a video, photo or voice note if one is given (uploaded first). */
  saveEntry(e: Pick<Entry, 'title' | 'body' | 'link'> & { id?: string; media?: PickedMedia | null }): Promise<void>;
  /** A link that plays an uploaded file for the next hour. */
  mediaUrl(path: string): Promise<string>;
  /** Owner only: a member's coach. */
  assignCoach(memberId: string, coachId: string | null): Promise<void>;
  /** Owner only: onboarding again for a member; deleting a member's or coach's account. */
  resetOnboarding(memberId: string): Promise<void>;
  removeAccount(memberId: string): Promise<void>;
  /** Onboarding's answers and times, saved to the account as they're given; what the answers set (the level, the goal) goes with them. */
  saveOnboarding(patch: Partial<OnboardingRecord>): Promise<void>;
  /** The member's profile photo (picked and squared in src/lib/photo.ts), or null to remove it. */
  setProfilePhoto(photo: PickedMedia | null): Promise<void>;
  checkIn(c: Pick<Checkin, 'skillId' | 'minutes' | 'feel' | 'note'>): Promise<void>;
  /** Marks a skill got (or not). */
  setSkill(skillId: string, done: boolean): Promise<void>;
  /** Owner only: a note on a skill a member got. */
  noteOnSkill(progressId: string, note: string): Promise<void>;
  removeEntry(id: string): Promise<void>;
  /** Saves a thing from a catalogue (src/lib/saves.ts), or changes its status (null clears it); `unsave` removes it. */
  save(kind: string, itemId: string, status?: SavedStatus | null): Promise<void>;
  unsave(kind: string, itemId: string): Promise<void>;
  saveScore(game: string, points: number, seconds: number): Promise<void>;
  /** The points joined by the roads (api/route.ts), for the route being planned. */
  snapRoute(points: LngLat[], profile: Profile): Promise<Snapped>;
  /** A route planned on the map, new or changed (docs/ROUTES.md). */
  saveRoute(r: Pick<Route, 'name' | 'profile' | 'points' | 'track' | 'straightLegs' | 'distanceM'> & { id?: string }): Promise<void>;
  removeRoute(id: string): Promise<void>;
  /** Staff: a written reply, and a video one if given. */
  reply(entryId: string, reply: string, media?: PickedMedia | null): Promise<void>;
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
        initSentry(b.integrations.sentry);
        await initAnalytics(b.integrations.posthog);
        // Reads the link the app was installed through (iOS and Android, once Tapp is on); never waits.
        void startTapp(b.integrations.tapp);
        setBackend(b);
        await load(b);
      })
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setReady(true));
  }, [load]);

  // Once signed in: analytics and error reports know who, and a phone registers for push.
  useEffect(() => {
    setSentryUser(me?.id ?? null);
    // A held Tapp link (a friend's invite, a /go channel) goes to the server once someone is signed in.
    setTappClaimer(backend?.mode === 'api' && me ? (link) => backend.claim(link) : null);
    if (!backend || !me) return;
    identify(me.id, { role: me.role });
    if (Platform.OS === 'web' || backend.mode !== 'api') return;
    pushToken()
      .then(async (token) => {
        if (!token) return;
        const device: Device = { id: `dev_${token.replace(/[^a-zA-Z0-9]/g, '').slice(-24)}`, memberId: me.id, token, platform: Platform.OS, createdAt: new Date().toISOString() };
        await backend.upsertMany('devices', [device]);
      })
      .catch((e) => captureException(e, { where: 'push registration' }));
  }, [backend, me?.id]);

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
      integrations: backend?.integrations ?? NO_INTEGRATIONS,
      refresh,
      signInWithGoogle: () => b().signInWithGoogle(),
      async goToBilling(action) {
        const returnUrl = `${window.location.origin}/pro`;
        track(action === 'checkout' ? 'checkout_started' : 'billing_portal_opened');
        window.location.assign(await b().billing(action, returnUrl));
      },
      async ask(question) {
        const chat = await b().ask(question);
        await refresh();
        return chat;
      },
      mediaUrl: (path) => b().mediaUrl(path),
      async assignCoach(memberId, coachId) {
        await b().assignCoach(memberId, coachId);
        await refresh();
      },
      async setPlan(memberId, plan) {
        await b().setPlan(memberId, plan);
        await refresh();
      },
      async resetOnboarding(memberId) {
        await b().resetOnboarding(memberId);
        await refresh();
      },
      async removeAccount(memberId) {
        await b().removeAccount(memberId);
        await refresh();
      },
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
        forgetIdentity();
        setWho(null);
        setDb(EMPTY_DB);
      },
      async deleteAccount() {
        await b().deleteAccount();
        forgetIdentity();
        setWho(null);
        setDb(EMPTY_DB);
      },
      async saveEntry(e) {
        if (!me) return;
        const now = new Date().toISOString();
        const old = e.id ? db.entries.find((x) => x.id === e.id) : undefined;
        const uploaded = e.media ? { mediaPath: await b().uploadMedia(e.media), mediaType: e.media.type } : {};
        const entry: Entry = {
          ...old,
          ...uploaded,
          id: e.id ?? newId('ent'),
          memberId: old?.memberId ?? me.id,
          title: e.title.trim(),
          body: e.body?.trim() || undefined,
          link: e.link?.trim() || undefined,
          createdAt: old?.createdAt ?? now,
          updatedAt: now,
        };
        if (e.media) track('media_sent', { type: e.media.type });
        await b().upsertMany('entries', [entry]);
        if (!old) track('entry_created');
        await refresh();
      },
      async removeEntry(id) {
        const e = db.entries.find((x) => x.id === id);
        await b().remove('entries', id);
        if (e?.mediaPath) await b().removeMedia(e.mediaPath).catch(() => {});
        await refresh();
      },
      async setProfilePhoto(photo) {
        if (!me) return;
        const before = me.photoPath;
        const photoPath = !photo ? null : b().mode === 'api' ? await b().uploadMedia(photo) : await localPhoto(photo);
        await b().upsertMany('users', [{ ...me, photoPath }]);
        // The old file goes once the new one is saved; one that won't go is only a little storage.
        if (before && !isLocalPhoto(before)) await b().removeMedia(before).catch(() => undefined);
        track(photo ? 'profile_photo_set' : 'profile_photo_removed');
        await refresh();
      },
      async saveOnboarding(patch) {
        if (!me) return;
        // Saving any of it means it was opened: a save racing the first one never leaves it unasked.
        const onboarding = mergedRecord(me.onboarding, { seenAt: new Date().toISOString(), ...patch });
        const profile = ONBOARDING.profile?.(onboarding.answers) ?? {};
        const placed = profile.level ? { assessedAt: me.assessedAt ?? new Date().toISOString() } : {};
        await b().upsertMany('users', [{ ...me, ...profile, ...placed, onboarding }]);
        await refresh();
      },
      async checkIn(c) {
        if (!me) return;
        const now = new Date();
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        const checkin: Checkin = { id: newId('chk'), memberId: me.id, date: local, ...c, note: c.note?.trim() || undefined, createdAt: now.toISOString() };
        await b().upsertMany('checkins', [checkin]);
        track('checked_in', { feel: c.feel });
        await refresh();
      },
      async save(kind, itemId, status) {
        if (!me) return;
        const record = savedRecord(me.id, kind, itemId, saveOf(db.saved, me.id, kind, itemId), status, new Date().toISOString());
        await b().upsertMany('saved', [record]);
        track('item_saved', { kind, status: record.status ?? 'saved' });
        await refresh();
      },
      async unsave(kind, itemId) {
        if (!me) return;
        await b().remove('saved', saveId(me.id, kind, itemId));
        track('item_unsaved', { kind });
        await refresh();
      },
      async setSkill(skillId, done) {
        if (!me) return;
        const id = `prg_${me.id}_${skillId}`;
        if (done) {
          const now = new Date().toISOString();
          const p: Progress = { id, memberId: me.id, skillId, doneAt: now, createdAt: now };
          await b().upsertMany('progress', [p]);
          track('skill_done', { skillId });
        } else await b().remove('progress', id);
        await refresh();
      },
      async noteOnSkill(progressId, note) {
        const p = db.progress.find((x) => x.id === progressId);
        if (!p) return;
        await b().upsertMany('progress', [{ ...p, ownerNote: note.trim() || undefined }]);
        await refresh();
      },
      async saveScore(game, points, seconds) {
        if (!me) return;
        const score: Score = { id: newId('scr'), memberId: me.id, game, points, seconds, createdAt: new Date().toISOString() };
        await b().upsertMany('scores', [score]);
        track('game_finished', { game, points });
        await refresh();
      },
      snapRoute: (points, profile) => b().snapRoute(points, profile),
      async saveRoute(r) {
        if (!me) return;
        const now = new Date().toISOString();
        const old = r.id ? db.routes.find((x) => x.id === r.id) : undefined;
        const route: Route = {
          id: r.id ?? newId('rte'),
          memberId: old?.memberId ?? me.id,
          name: r.name.trim().slice(0, 120),
          profile: r.profile,
          points: r.points,
          track: thinTrack(r.track),
          straightLegs: r.straightLegs,
          distanceM: Math.max(0, Math.round(r.distanceM)),
          createdAt: old?.createdAt ?? now,
          updatedAt: now,
        };
        await b().upsertMany('routes', [route]);
        // What kind of route, never where: the profile, how many points and a band for its length.
        track('route_saved', { profile: route.profile, points: route.points.length, distance: distanceBucket(route.distanceM), straightLegs: route.straightLegs.length });
        await refresh();
      },
      async removeRoute(id) {
        await b().remove('routes', id);
        await refresh();
      },
      async reply(entryId, reply, media) {
        const e = db.entries.find((x) => x.id === entryId);
        if (!e) return;
        const video = media ? { replyMediaPath: await b().uploadMedia(media), replyMediaType: media.type } : {};
        await b().upsertMany('entries', [{ ...e, ...video, reply: reply.trim() || undefined, updatedAt: new Date().toISOString() }]);
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
