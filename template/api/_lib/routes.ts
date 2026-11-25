/**
 * Routes a member plans on a map (docs/ROUTES.md), borrowed from Etapa's route
 * builder: the points they tap, each leg between two of them snapped to real
 * roads and paths by Mapbox Directions on the server (api/route.ts), and a leg
 * Mapbox can't route left straight and drawn dashed, never guessed. Shared by
 * the API and the app: it lives here, beside the API, so Vercel runs it as
 * the API's own ES module, and the app reads it through src/lib/routes.ts.
 * Nothing here imports anything or touches React Native. Plain logic, tested
 * in Node (tests/routes.test.ts).
 */

/** A place on the map as Mapbox and GeoJSON take it: longitude first. */
export type LngLat = [lng: number, lat: number];

/** How the route is travelled: Mapbox Directions' profiles, which pick the roads and paths it follows. */
export const PROFILES = ['walking', 'cycling', 'driving'] as const;
export type Profile = (typeof PROFILES)[number];
export const isProfile = (v: unknown): v is Profile => typeof v === 'string' && (PROFILES as readonly string[]).includes(v);
export const PROFILE_LABELS: Record<Profile, string> = { walking: 'On foot', cycling: 'By bike', driving: 'By car' };

/** Points in one route: Mapbox Directions takes 25 coordinates a request, and a route this size is plenty to plan by hand. */
export const MAX_POINTS = 25;
/** A saved track is thinned to this many points (Etapa's limit: it keeps a save well inside a request's size). */
export const MAX_TRACK = 500;

/** Why a leg, or a whole snap, didn't follow a road: the reason `route_snap_failed` carries (an enum, never a place). */
export type SnapFailure = 'no_road' | 'unreachable' | 'rate_limited' | 'off' | 'error';

/** One leg, between two of the member's points: on a road, or straight (drawn dashed). */
export interface Leg {
  snapped: boolean;
  /** Why it stayed straight. */
  reason?: SnapFailure;
}

export interface Snapped {
  /** The whole line, the legs joined, at most MAX_TRACK points. */
  track: LngLat[];
  legs: Leg[];
  distanceM: number;
}

const finite = (n: unknown) => typeof n === 'number' && Number.isFinite(n);

/** A real place: two finite numbers inside the globe's bounds. */
export const isLngLat = (p: unknown): p is LngLat => Array.isArray(p) && p.length >= 2 && finite(p[0]) && finite(p[1]) && Math.abs(p[0] as number) <= 180 && Math.abs(p[1] as number) <= 90;

/** The points as given, or null when any of them isn't a place, there are fewer than two, or more than MAX_POINTS. Rounded to 6 places (about 10 cm). */
export function cleanPoints(points: unknown): LngLat[] | null {
  if (!Array.isArray(points) || points.length < 2 || points.length > MAX_POINTS || !points.every(isLngLat)) return null;
  return points.map((p) => [round6(p[0]), round6(p[1])]);
}
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** Metres between two places on the globe (haversine). */
export function metresBetween(a: LngLat, b: LngLat): number {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLng = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** A line's length in metres, rounded to the metre. */
export const lengthM = (track: LngLat[]) => Math.round(track.slice(1).reduce((sum, p, i) => sum + metresBetween(track[i], p), 0));

/** At most `max` points of a line, evenly through it, always keeping its first and last so it starts and ends where the member said. */
export function thinTrack(track: LngLat[], max = MAX_TRACK): LngLat[] {
  if (track.length <= max) return track;
  const out: LngLat[] = [];
  const step = (track.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) out.push(track[Math.round(i * step)]);
  return out;
}

/** Each leg's two ends: the member's points taken in pairs, one after another. */
export const legsOf = (points: LngLat[]): [LngLat, LngLat][] => points.slice(1).map((p, i) => [points[i], p]);

/** The legs' lines joined into one, a point shared by two legs kept once. */
export function joinLegs(tracks: LngLat[][]): LngLat[] {
  const out: LngLat[] = [];
  for (const t of tracks)
    for (const p of t) {
      const last = out[out.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
    }
  return out;
}

/** The straight legs, as the map draws them dashed: each a pair of the member's points. */
export const dashedLegs = (points: LngLat[], legs: Leg[]): [LngLat, LngLat][] => legsOf(points).filter((_, i) => legs[i] && !legs[i].snapped);

/** A leg's key, for keeping what's been snapped while points are added and moved. */
export const legKey = (a: LngLat, b: LngLat, profile: Profile) => `${profile}:${a[0]},${a[1]};${b[0]},${b[1]}`;

/** A distance as people read it: '850 m', '4.2 km', '128 km'. */
export function distanceLabel(m: number): string {
  if (m < 1000) return `${Math.round(m / 10) * 10} m`;
  const km = m / 1000;
  return `${km < 100 ? km.toFixed(1) : Math.round(km)} km`;
}

/** A route in a line, for its row, the feed and the member's page: '12.4 km by bike, 6 points, 1 leg off the roads'. */
export function routeLine(r: { distanceM: number; profile: Profile; points: unknown[]; straightLegs: unknown[] }) {
  const straight = r.straightLegs.length;
  return `${distanceLabel(r.distanceM)} ${PROFILE_LABELS[r.profile].toLowerCase()}, ${r.points.length} points${straight ? `, ${straight === 1 ? '1 leg' : `${straight} legs`} off the roads` : ''}`;
}

/** A route's length as a band, for analytics: never the distance itself, which with a profile could narrow down a place. */
export function distanceBucket(m: number): string {
  const km = m / 1000;
  return km < 5 ? 'under_5km' : km < 10 ? '5_to_10km' : km < 25 ? '10_to_25km' : km < 50 ? '25_to_50km' : km < 100 ? '50_to_100km' : '100km_plus';
}

// ---------------------------------------------------------------------------
// Snapping, with Mapbox Directions (the server's; fetch is passed in so tests mock it)
// ---------------------------------------------------------------------------

type Fetch = (url: string, init?: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>;

export interface SnapOptions {
  token: string;
  /** Sent as the Referer, so a token restricted to the site's URL is accepted from the server too. */
  referer?: string;
  fetchImpl?: Fetch;
  timeoutMs?: number;
}

/** Mapbox Directions' answers that mean there is no road between the two (as against a failure to ask). */
const NO_ROAD = new Set(['NoRoute', 'NoSegment']);

/**
 * One leg on the roads: Mapbox's line between `a` and `b` for the profile, or
 * the two points straight with why. Never throws, and never logs the URL (it
 * carries the token).
 */
export async function snapLeg(a: LngLat, b: LngLat, profile: Profile, o: SnapOptions): Promise<{ track: LngLat[]; leg: Leg }> {
  const straight = (reason: SnapFailure) => ({ track: [a, b], leg: { snapped: false, reason } });
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${a[0]},${a[1]};${b[0]},${b[1]}?geometries=geojson&overview=full&access_token=${encodeURIComponent(o.token)}`;
  try {
    const res = await (o.fetchImpl ?? (fetch as Fetch))(url, { headers: o.referer ? { referer: o.referer } : {}, signal: AbortSignal.timeout(o.timeoutMs ?? 7000) });
    const data = (await res.json().catch(() => null)) as { code?: string; routes?: { geometry?: { coordinates?: unknown[] } }[] } | null;
    if (data?.code && NO_ROAD.has(data.code)) return straight('no_road');
    if (!res.ok) return straight(res.status === 429 ? 'rate_limited' : 'error');
    const coords = (data?.routes?.[0]?.geometry?.coordinates ?? []).filter(isLngLat).map((p) => [round6(p[0]), round6(p[1])] as LngLat);
    if (data?.code !== 'Ok' || coords.length < 2) return straight('no_road');
    return { track: coords, leg: { snapped: true } };
  } catch {
    return straight('unreachable');
  }
}

/** Every leg of a route snapped (at once), joined, measured along the line and thinned for saving. */
export async function snapRoute(points: LngLat[], profile: Profile, o: SnapOptions): Promise<Snapped> {
  const legs = await Promise.all(legsOf(points).map(([a, b]) => snapLeg(a, b, profile, o)));
  return assemble(legs.map((l) => l.track), legs.map((l) => l.leg));
}

/** The legs' lines and flags as one route: its line (thinned), the flags and its length along the full line. */
export function assemble(tracks: LngLat[][], legs: Leg[]): Snapped {
  const whole = joinLegs(tracks);
  return { track: thinTrack(whole), legs, distanceM: lengthM(whole) };
}
