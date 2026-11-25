# Route planning

Members plan a route on a map: they tap points, each leg between two points follows the real roads and paths, and they save it with a name.
The owner sees every route in Activity and on the member's page.
It is off until it is switched on in two places: `APP.routes` in `src/lib/brand.ts`, and `MAPBOX_TOKEN` in Vercel.
Natural for an app about places people go: a hill walk, a ski tour, a ride.

Borrowed from Etapa's route builder (`etapa` `src/components/RouteBuilderMap.js`, `src/lib/snapLeg.js`, `server/src/lib/roadSnap.js`, and *Creating routes* in its `CLAUDE.md`), in the template's TypeScript and kit.

## Where it lives

| Path | What |
| -- | -- |
| `api/_lib/routes.ts`, read by the app as `src/lib/routes.ts` | Points checked, legs, snapping a leg with Mapbox Directions (fetch passed in), joining, thinning to 500 points, distances, the analytics band. Shared by the API and the app; it sits beside the API so Vercel runs it as the API's own ES module |
| `src/lib/routeMap.ts` | The map's HTML page (Mapbox GL JS), the messages it sends back, the small static picture of a saved route |
| `src/components/route-map.tsx` | `RouteMap`: the page in a WebView (iOS, Android) or an iframe's `srcdoc` (web); `RouteThumb` for a row |
| `api/route.ts`, `api/_lib/maps.ts` | `POST /api/route`: the legs snapped on the server; the token `/api/health` reports |
| `src/app/routes/index.tsx`, `src/app/routes/new.tsx` | Your routes, and Plan a route (also opens a saved route to change it, `?id=`) |
| `supabase/migrations/20261126000001_routes.sql` | `routes` (member-owned, through `/api/data`) and `route_snaps` (the hourly limit's count) |
| `tests/routes.test.ts`, `tests/routeMap.test.ts` | The logic and the page, with Mapbox mocked; the rules are in `tests/api.test.ts`, the feed in `tests/activity.test.ts` |

## Decisions

1. **Off by default, in two places.** `APP.routes` (false) says the app has route planning; `MAPBOX_TOKEN` in Vercel switches Mapbox on. The screens and the way in from Home show only when both are on; with `APP.routes` on and no token, the screens say plainly that maps aren't switched on yet, and nothing calls Mapbox. `fohm-scaffold new --routes yes` sets `APP.routes`.
2. **One public token, read from `/api/health`.** `integrations.maps` is `{ token }` or null, like PostHog's key, so there are no `EXPO_PUBLIC_` variables. It is a public `pk.` token restricted in Mapbox to the site's address; a secret `sk.` token set by mistake is never sent and keeps maps off. The server sends the site's address as the Referer when it asks Mapbox, and the apps load the map page as the site (the WebView's `baseUrl`), so the restricted token is accepted from all three.
3. **Mapbox GL JS in a WebView, no native SDK** (Etapa's choice). One HTML page, built by a pure function and tested in Node, drawn in `react-native-webview` in the apps and in an iframe's `srcdoc` on the web; the route goes in as data (`injectJavaScript`, or `postMessage` on the web), so a tap never reloads the map, and taps and drags come back as messages. Mapbox GL JS is pinned to 3.7.0 from api.mapbox.com.
4. **`react-native-webview` is native** (14.0.1, as Expo SDK 58 expects): it reaches the iOS and Android apps only with a store build. Its `require` is guarded, so an older build says maps need the latest version of the app instead of crashing.
5. **Outdoors style, the line in the accent.** `MAP_STYLE` in `src/lib/theme.ts` is Mapbox Outdoors (contours, paths, peaks); change it there for a city app. The start is an accent dot, the finish an ink dot, the points between white with an accent ring.
6. **Snapped on the server, a leg at a time.** `POST /api/route { points, profile }` asks Mapbox Directions (`geometries=geojson`, `overview=full`) for each leg and returns `{ track, legs: [{ snapped, reason? }], distanceM }`. The builder asks once for each leg a tap or a drag changes, keyed by its two ends and the profile, so moving one point asks for two legs, not the whole route.
7. **Real roads, or straight and dashed: never a guess** (Etapa's rule). A leg Mapbox can't route (`NoRoute`, `NoSegment`), or can't be asked, stays a straight segment between the two points, flagged with why, and the map draws white dashes over it. The saved route keeps which legs are straight (`straight_legs`), and the member is told on the screen and when naming it.
8. **Profiles are Mapbox's**: on foot (`walking`, the default), by bike (`cycling`), by car (`driving`).
9. **Limits.** Up to 25 points a route (one Directions request's worth). A saved track is thinned to 500 points, keeping the first and last (Etapa's limit). Snapping is limited per account to `ROUTE_SNAPS_PER_HOUR` (default 300), counted in `route_snaps`, which only that limit reads and which clears itself after a day.
10. **Stored and seen like everything a member does.** `routes` (id, member, name, profile, points, track, straight legs, distance, created and updated) is member-owned through `scoped()`, in `TABLES`, `READS`, `MEMBER_WRITES` (own rows), `MEMBER_ONLY` and `ADMIN_SEES`; the API refuses points or a line that aren't places. Activity says "Planned a route" (or "Changed") with its length, how it's travelled and any legs off the roads; the member's page lists each with its line drawn small. Demo mode keeps routes on the device.
11. **Two screens, a way in from Home.** Your routes (rows on one card, each with the line drawn small by Mapbox's static images, Plan a route as the primary) and Plan a route (the map filling the screen, profile chips, the distance, Undo, Next; then the name on its own screen with Save, where a field is in a plain scrolling `Screen` as every other field in the template, since the template has no keyboard-avoiding container yet). Home's More card has Your routes only while both switches are on.
12. **A member's places go to no new party but Mapbox** (Etapa's rule). The points go to Mapbox to draw the map and find the roads, and nowhere else; the server never logs them. The privacy policy names Mapbox only while routes and maps are on.
13. **Events carry ids, enums and counts, never a place or a name**: `route_builder_opened` (`from`), `route_point_added` (`points`, how many now), `route_saved` (`profile`, `points`, `distance` as a band, `straightLegs`), `route_snap_failed` (`reason`: `no_road`, `unreachable`, `rate_limited`, `off`, `error`).

## Switching it on

1. `APP.routes: true` in `src/lib/brand.ts` (or `--routes yes` when the app is made).
2. A Mapbox account and a public token restricted to the site's address: fohm-scaffold's app-launch skill, `reference/mapbox.md`.
3. `MAPBOX_TOKEN` in Vercel, then a redeploy; `curl -s https://<domain>/api/health | jq .integrations.maps` shows the token.
4. A store build for the iOS and Android apps, for `react-native-webview`.

## Not yet

- Following a route outdoors (the member's position on the map), a GPX file in or out, elevation: Etapa has each.
- Snapping on the device as a fallback when the server can't (Etapa's `snapLeg` asks Mapbox from the phone too); here a leg the server can't snap stays straight.
