import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BackLink } from '@/components/back';
import { Chips } from '@/components/board';
import { RouteMap } from '@/components/route-map';
import { Body, Button, Display, ErrorText, Field, IconButton, Note, Screen, Small, Strong, TextLink } from '@/components/ui';
import { track } from '@/lib/analytics';
import { hasRoutes } from '@/lib/brand';
import { confirmAsync } from '@/lib/confirm';
import { assemble, dashedLegs, distanceLabel, legKey, legsOf, MAX_POINTS, PROFILES, PROFILE_LABELS, type Leg, type LngLat, type Profile, type SnapFailure } from '@/lib/routes';
import { useStore } from '@/lib/store';
import { C, S } from '@/lib/theme';
import type { Route } from '@/lib/types';

type Snap = { track: LngLat[]; leg: Leg };

/** Why a snap that failed as a whole (the request, not a leg) failed: an enum for `route_snap_failed`. */
const failureOf = (e: unknown): SnapFailure => {
  const status = (e as { status?: number })?.status;
  return status === 429 ? 'rate_limited' : status === 503 ? 'off' : status ? 'error' : 'unreachable';
};

/** Back to Your routes: the screen it came from where there is one, so the list isn't stacked twice. */
const backToRoutes = () => (router.canGoBack() ? router.back() : router.replace('/routes'));

/**
 * Plan a route (docs/ROUTES.md), Etapa's route builder in the house style:
 * tap the map to add a point, drag one to move it, Undo, how it's travelled
 * (on foot, by bike, by car), and the distance. Each leg is snapped to the
 * roads and paths by the server (api/route.ts) as it's added or moved; a leg
 * with no road stays straight and dashed, never guessed. Then a name and
 * Save. `?id=` opens a saved route to change it.
 */
export default function NewRoute() {
  const { ready, me, db, integrations } = useStore();
  const params = useLocalSearchParams<{ id?: string; from?: string }>();
  if (!ready) return null;
  if (!me) return <Redirect href="/" />;
  if (!hasRoutes()) return <Redirect href="/home" />;
  if (!integrations.maps)
    return (
      <Screen>
        <BackLink fallback="/routes" />
        <Display>Plan a route</Display>
        <Note icon="map" title="Maps aren’t switched on yet">
          The people who run the app switch them on. Once they have, you can tap points on a map here and the route follows the roads and paths between them.
        </Note>
      </Screen>
    );
  const existing = params.id ? db.routes.find((r) => r.id === params.id && r.memberId === me.id) : undefined;
  if (params.id && !existing) return <Redirect href="/routes" />;
  const from = params.from === 'routes' || params.from === 'edit' ? params.from : 'link';
  return <Builder key={existing?.id ?? 'new'} token={integrations.maps.token} existing={existing} from={from} />;
}

/** The builder itself, once the member, their route and the map's token are known. */
function Builder({ token, existing, from }: { token: string; existing?: Route; from: string }) {
  const { snapRoute, saveRoute, removeRoute } = useStore();
  const insets = useSafeAreaInsets();
  const [points, setPoints] = useState<LngLat[]>(existing?.points ?? []);
  const [history, setHistory] = useState<LngLat[][]>([]);
  const [profile, setProfile] = useState<Profile>(existing?.profile ?? 'walking');
  // Each leg as the server snapped it, by its two ends and the profile: a leg is asked for once, and again only when it moves.
  const [snaps, setSnaps] = useState<Record<string, Snap>>({});
  const asking = useRef(new Set<string>());
  const [step, setStep] = useState<'draw' | 'name'>('draw');
  const [name, setName] = useState(existing?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    track('route_builder_opened', { from });
  }, [from]);

  useEffect(() => {
    for (const [a, b] of legsOf(points)) {
      const key = legKey(a, b, profile);
      if (snaps[key] || asking.current.has(key)) continue;
      asking.current.add(key);
      snapRoute([a, b], profile)
        .then((r): Snap => ({ track: r.track, leg: r.legs[0] ?? { snapped: false, reason: 'error' } }))
        .catch((e): Snap => ({ track: [a, b], leg: { snapped: false, reason: failureOf(e) } }))
        .then((s) => {
          asking.current.delete(key);
          if (!s.leg.snapped) track('route_snap_failed', { reason: s.leg.reason ?? 'error', profile });
          setSnaps((all) => ({ ...all, [key]: s }));
        });
    }
  }, [points, profile, snaps, snapRoute]);

  const pairs = legsOf(points);
  const waiting = pairs.some(([a, b]) => !snaps[legKey(a, b, profile)]);
  const legs = pairs.map(([a, b]): Snap => snaps[legKey(a, b, profile)] ?? { track: [a, b], leg: { snapped: false } });
  const route = assemble(legs.map((l) => l.track), legs.map((l) => l.leg));
  const routeKey = JSON.stringify([points, route.track, route.legs]);
  const data = useMemo(() => ({ points, track: points.length >= 2 ? route.track : [], dashed: dashedLegs(points, route.legs) }), [routeKey]);
  const straight = waiting ? [] : route.legs.flatMap((l, i) => (l.snapped ? [] : [i]));

  const change = (next: LngLat[]) => {
    setHistory((h) => [...h, points].slice(-50));
    setPoints(next);
    setError(null);
  };
  const add = (p: LngLat) => {
    if (points.length >= MAX_POINTS) return setError(`A route takes up to ${MAX_POINTS} points. Drag one to change the way it goes.`);
    change([...points, p]);
    track('route_point_added', { points: points.length + 1 });
  };
  const move = (i: number, p: LngLat) => i < points.length && change(points.map((x, j) => (j === i ? p : x)));
  const undo = () => {
    setPoints(history[history.length - 1] ?? []);
    setHistory((h) => h.slice(0, -1));
  };

  async function save() {
    if (!name.trim()) return setError('Give the route a name.');
    setBusy(true);
    setError(null);
    try {
      await saveRoute({ id: existing?.id, name, profile, points, track: route.track, straightLegs: straight, distanceM: route.distanceM });
      backToRoutes();
    } catch (e: any) {
      setError(e?.message ?? 'That didn’t save. Try again.');
      setBusy(false);
    }
  }

  if (step === 'name')
    return (
      <Screen>
        <IconButton icon="chevron-left" tone="surface" label="Back to the map" onPress={() => setStep('draw')} />
        <Display>{existing ? 'Save your changes' : 'Name your route'}</Display>
        <Body>
          {distanceLabel(route.distanceM)} {PROFILE_LABELS[profile].toLowerCase()}, {points.length} points.
          {straight.length ? ` ${straight.length === 1 ? 'One leg is' : `${straight.length} legs are`} straight where no road or path was found.` : ''}
        </Body>
        <Field label="Name" value={name} onChangeText={setName} maxLength={120} autoFocus returnKeyType="done" onSubmitEditing={save} />
        <ErrorText text={error} />
        <Button label="Save route" icon="check" onPress={save} busy={busy} />
        {existing ? (
          <TextLink
            tone="muted"
            icon="trash-2"
            label="Delete this route"
            onPress={async () => {
              if (!(await confirmAsync('Delete this route for good?'))) return;
              await removeRoute(existing.id).then(() => backToRoutes(), (e) => setError(e?.message ?? 'That didn’t work. Try again.'));
            }}
          />
        ) : null}
      </Screen>
    );

  return (
    <Screen scroll={false} gap={S.md}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md }}>
        <BackLink fallback="/routes" />
        <Display style={{ flex: 1 }}>{existing ? 'Change route' : 'Plan a route'}</Display>
      </View>
      <Chips label="How you’ll go" hideLabel layout="even" value={profile} options={PROFILES.map((id) => ({ id, label: PROFILE_LABELS[id] }))} onChange={setProfile} />
      <RouteMap token={token} data={data} editable onAdd={add} onMove={move} centre={points[0]} label="Map: tap to add a point, drag a point to move it" style={{ flex: 1, minHeight: 240 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, minHeight: 44 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Strong>{points.length >= 2 ? distanceLabel(route.distanceM) : points.length === 1 ? 'Now tap where it goes next' : 'Tap the map where it starts'}</Strong>
          <Small lines={2}>{waiting ? 'Finding the roads and paths…' : straight.length ? (route.legs.some((l) => l.reason === 'no_road') ? 'Dashed: no road or path found, so it stays straight.' : 'Dashed: the roads couldn’t be looked up just now, so it stays straight.') : points.length >= 2 ? `${points.length} points. Drag one to move it.` : 'Then each point after it.'}</Small>
        </View>
        {history.length ? <TextLink label="Undo" icon="rotate-ccw" tone="muted" onPress={undo} /> : null}
      </View>
      <ErrorText text={error} />
      <View style={{ paddingBottom: Math.max(insets.bottom, S.lg) }}>
        <Button label="Next" disabled={points.length < 2 || waiting} onPress={() => setStep('name')} />
      </View>
    </Screen>
  );
}
