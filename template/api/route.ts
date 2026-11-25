/**
 * POST /api/route { points: [lng, lat][], profile } → { track, legs, distanceM }:
 * the member's points joined by real roads and paths, each leg asked of Mapbox
 * Directions with MAPBOX_TOKEN (docs/ROUTES.md). A leg Mapbox can't route
 * comes back straight, `snapped: false` with why, so the map draws it dashed:
 * never a line it made up. Needs a signed-in account and MAPBOX_TOKEN; at
 * most ROUTE_SNAPS_PER_HOUR asks an hour each (default 300: the builder asks
 * once for each leg a tap or a drag changes). The points go to Mapbox and
 * nowhere else; they're never logged.
 */
import { actorFrom } from './_lib/access.js';
import { siteUrl } from './_lib/app.js';
import { HttpError, handle, sql } from './_lib/db.js';
import { mapsPublicConfig } from './_lib/maps.js';
import { cleanPoints, isProfile, snapRoute } from './_lib/routes.js';

export const POST = handle(async (req) => {
  const actor = await actorFrom(req);
  const token = mapsPublicConfig()?.token;
  if (!token) throw new HttpError(503, 'Maps aren’t switched on yet.');
  const body = (await req.json().catch(() => null)) as { points?: unknown; profile?: unknown } | null;
  const points = cleanPoints(body?.points);
  const profile = body?.profile;
  if (!points || !isProfile(profile)) throw new HttpError(400, 'Expected { points: [lng, lat][] (2 to 25), profile: walking, cycling or driving }');

  const db = sql();
  const [{ n }] = await db`select count(*)::int as n from route_snaps where member_id = ${actor.id} and created_at > now() - interval '1 hour'`;
  if (n >= Number(process.env.ROUTE_SNAPS_PER_HOUR || 300)) throw new HttpError(429, 'That’s a lot of route planning for one hour. Try again in a little while.');
  // Counted, and the account's older counts cleared: nothing but this limit reads them.
  await db`insert into route_snaps (member_id) values (${actor.id})`;
  await db`delete from route_snaps where member_id = ${actor.id} and created_at < now() - interval '1 day'`;

  const site = siteUrl();
  return Response.json(await snapRoute(points, profile, { token, referer: site ? `${site}/` : undefined }));
});
