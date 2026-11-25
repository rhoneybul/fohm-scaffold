# Maps and route planning (Mapbox)

Optional; only for an app with route planning (`APP.routes` true in `src/lib/brand.ts`, or `--routes yes` when it was made), and off until its token is set.

**Why.** Members plan a route on a map: they tap points, each leg follows the real roads and paths Mapbox finds, and they save it; the owner sees every route.
A leg with no road stays straight and dashed, never a guess.
The app's `docs/ROUTES.md` has the decisions.

## What the agent does

- Knows what's built: `api/route.ts` snaps each leg with Mapbox Directions, `api/_lib/maps.ts` reports the token on `/api/health`, `src/components/route-map.tsx` draws Mapbox GL JS in a WebView in the apps and an iframe on the web, and the screens are `src/app/routes/`.
- Checks `APP.routes` is true; if the person wants maps and it isn't, switches it on in `src/lib/brand.ts` in a PR.
- After the token is in: redeploys (the privacy policy then names Mapbox, Home shows Your routes, and the dashboard's Settings shows maps on), and builds new store versions (`npx tsx scripts/release.ts all`): `react-native-webview` is native, so only a store build carries it.
- Plans a short route on the live site at a phone's size and checks a leg follows the roads, then sees it on the member's page in the dashboard.
- There is no Mapbox connector: it never asks for the token in the chat.

## What is the person's

- Make an account at account.mapbox.com (free to start: map loads and Directions requests have a monthly free allowance; add a card only when it's outgrown).
- Account → Tokens → Create a token: public scopes only (the default ones; no secret scopes), named after the app.
  Under URL restrictions, add the site's address (`https://<domain>/*`) and, while testing, the Vercel preview address; the apps load the map as the site, so the same restriction covers them.
  If Mapbox's token page offers app restrictions for the iOS bundle id and the Android package (`app.json` → `ios.bundleIdentifier`, `android.package`), add those too.
- Copy the token (it starts `pk.`) into Vercel → Settings → Environment Variables, Production, as `MAPBOX_TOKEN`.
  Never a secret `sk.` token, which the app would refuse to use, and never in the chat.
- App Store Connect → App Privacy and Play Console → Data safety: the app never reads the phone's location; declare the routes a member plans as other user content, linked to the account, used for app functionality.

## How to check it

- `curl -s https://<domain>/api/health | jq .integrations.maps` shows `{ "token": "pk.…" }` after a redeploy; null means `MAPBOX_TOKEN` is missing or isn't a public `pk.` token.
- `https://<domain>/routes/new` signed in as a member shows the map, not "Maps aren't switched on yet"; a map that says it didn't load means Mapbox refused the token from that address: check its URL restrictions.
