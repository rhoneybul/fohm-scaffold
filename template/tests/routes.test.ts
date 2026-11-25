/**
 * Route planning's plain logic (src/lib/routes.ts): points checked, legs
 * snapped by Mapbox Directions with fetch mocked, a leg with no road left
 * straight and flagged (never guessed), tracks thinned, distances measured
 * and banded. No network: Mapbox is never called. Plain Node: npm test.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assemble, cleanPoints, dashedLegs, distanceBucket, distanceLabel, joinLegs, lengthM, metresBetween, routeLine, snapLeg, snapRoute, thinTrack, type LngLat } from '../src/lib/routes';

const A: LngLat = [-3.1, 54.5];
const B: LngLat = [-3.09, 54.51];
const C: LngLat = [-3.08, 54.5];

test('points: two to 25 real places, rounded; anything else is refused', () => {
  assert.deepEqual(cleanPoints([[-3.123456789, 54.5], B]), [[-3.123457, 54.5], B]);
  assert.equal(cleanPoints([A]), null, 'one point is not a route');
  assert.equal(cleanPoints([A, [200, 0]]), null, 'longitude out of range');
  assert.equal(cleanPoints([A, [0, 'x']]), null);
  assert.equal(cleanPoints('nope'), null);
  assert.equal(cleanPoints(Array.from({ length: 26 }, () => A)), null, 'more than Mapbox takes in one request');
});

test('distance: a degree of latitude is about 111 km, and a line is measured along it', () => {
  assert.ok(Math.abs(metresBetween([0, 0], [0, 1]) - 111_195) < 50);
  assert.equal(lengthM([A]), 0);
  assert.equal(lengthM([A, B, C]), Math.round(metresBetween(A, B) + metresBetween(B, C)));
  assert.equal(distanceLabel(843), '840 m');
  assert.equal(distanceLabel(4240), '4.2 km');
  assert.equal(distanceLabel(128_400), '128 km');
});

test('analytics get a band for the length, never the distance', () => {
  assert.equal(distanceBucket(900), 'under_5km');
  assert.equal(distanceBucket(7_000), '5_to_10km');
  assert.equal(distanceBucket(30_000), '25_to_50km');
  assert.equal(distanceBucket(250_000), '100km_plus');
});

test('a track is thinned to at most 500 points, keeping where it starts and ends', () => {
  const long: LngLat[] = Array.from({ length: 2000 }, (_, i) => [i / 1000, 0]);
  const thin = thinTrack(long);
  assert.equal(thin.length, 500);
  assert.deepEqual(thin[0], long[0]);
  assert.deepEqual(thin[499], long[1999]);
  assert.equal(thinTrack([A, B]).length, 2, 'a short line is left alone');
});

test('legs join into one line, a shared point kept once; straight legs are the dashed ones', () => {
  assert.deepEqual(joinLegs([[A, B], [B, C]]), [A, B, C]);
  assert.deepEqual(dashedLegs([A, B, C], [{ snapped: true }, { snapped: false, reason: 'no_road' }]), [[B, C]]);
  const r = assemble([[A, B], [B, C]], [{ snapped: true }, { snapped: true }]);
  assert.equal(r.distanceM, lengthM([A, B, C]));
});

test('a route in a line, for its row and the dashboard', () => {
  assert.equal(routeLine({ distanceM: 12_400, profile: 'cycling', points: [A, B, C], straightLegs: [] }), '12.4 km by bike, 3 points');
  assert.equal(routeLine({ distanceM: 900, profile: 'walking', points: [A, B, C], straightLegs: [1] }), '900 m on foot, 3 points, 1 leg off the roads');
});

/** Mapbox Directions, mocked: the URL each call asked for, and the answer given. */
function mapbox(answer: (url: string) => { status?: number; body: unknown } | Error) {
  const asked: { url: string; referer?: string }[] = [];
  const fetchImpl = async (url: string, init?: RequestInit) => {
    asked.push({ url, referer: (init?.headers as Record<string, string>)?.referer });
    const a = answer(url);
    if (a instanceof Error) throw a;
    return { ok: (a.status ?? 200) < 400, status: a.status ?? 200, json: async () => a.body };
  };
  return { asked, fetchImpl };
}
const onRoad = (coords: LngLat[]) => ({ body: { code: 'Ok', routes: [{ geometry: { coordinates: coords } }] } });

test('a leg on the roads: Mapbox’s line, asked with the profile, geojson, the full overview and the site as Referer', async () => {
  const road: LngLat[] = [A, [-3.095, 54.507], B];
  const m = mapbox(() => onRoad(road));
  const r = await snapLeg(A, B, 'walking', { token: 'pk.test', referer: 'https://app.example/', fetchImpl: m.fetchImpl });
  assert.deepEqual(r, { track: road, leg: { snapped: true } });
  assert.match(m.asked[0].url, /^https:\/\/api\.mapbox\.com\/directions\/v5\/mapbox\/walking\/-3\.1,54\.5;-3\.09,54\.51\?/);
  assert.match(m.asked[0].url, /geometries=geojson/);
  assert.match(m.asked[0].url, /overview=full/);
  assert.match(m.asked[0].url, /access_token=pk\.test/);
  assert.equal(m.asked[0].referer, 'https://app.example/');
});

test('a leg with no road stays straight between the two points, flagged, never guessed', async () => {
  for (const answer of [{ body: { code: 'NoRoute', routes: [] } }, { status: 422, body: { code: 'NoSegment', message: 'x' } }, onRoad([])]) {
    const r = await snapLeg(A, B, 'cycling', { token: 'pk.t', fetchImpl: mapbox(() => answer).fetchImpl });
    assert.deepEqual(r, { track: [A, B], leg: { snapped: false, reason: 'no_road' } });
  }
});

test('when Mapbox can’t be asked, or refuses, the leg stays straight with why', async () => {
  const down = await snapLeg(A, B, 'walking', { token: 'pk.t', fetchImpl: mapbox(() => new Error('offline')).fetchImpl });
  assert.deepEqual(down.leg, { snapped: false, reason: 'unreachable' });
  const limited = await snapLeg(A, B, 'walking', { token: 'pk.t', fetchImpl: mapbox(() => ({ status: 429, body: { message: 'Too many' } })).fetchImpl });
  assert.deepEqual(limited.leg, { snapped: false, reason: 'rate_limited' });
  const refused = await snapLeg(A, B, 'walking', { token: 'pk.t', fetchImpl: mapbox(() => ({ status: 401, body: { message: 'Not Authorized' } })).fetchImpl });
  assert.deepEqual(refused, { track: [A, B], leg: { snapped: false, reason: 'error' } });
});

test('a whole route: each leg asked once, joined, measured, with a flag a leg', async () => {
  const m = mapbox((url) => (url.includes(`${B[0]},${B[1]};${C[0]},${C[1]}`) ? { body: { code: 'NoRoute' } } : onRoad([A, [-3.096, 54.506], B])));
  const r = await snapRoute([A, B, C], 'walking', { token: 'pk.t', fetchImpl: m.fetchImpl });
  assert.equal(m.asked.length, 2);
  assert.deepEqual(r.legs, [{ snapped: true }, { snapped: false, reason: 'no_road' }]);
  assert.deepEqual(r.track, [A, [-3.096, 54.506], B, C]);
  assert.equal(r.distanceM, lengthM(r.track));
});
