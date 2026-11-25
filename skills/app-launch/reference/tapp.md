# Share links that survive the install (Tapp)

Optional; after the apps are in the stores.

**Why.** An invite link a member sends a friend, and one `/go/<channel>` link for each place people are found, still say where someone came from after they install the app: the dashboard shows who invited whom and which link each person came through.
The App Store tells an app nothing about that on its own.

## What the agent does

- Knows what's built: `api/_lib/tapp.ts`, invite links and claims in `api/accounts.ts`, `/go/<channel>` in `api/go.ts`, `src/lib/tapp.native.ts`, Invite a friend on Your account.
  Tapp never sees an account id, name or email: only an opaque invite code or a channel's slug.
- After the keys are in: redeploys (the privacy policy then names Tapp, and Your account shows Invite a friend), and builds new store versions (`npm run build:ios`, `npm run build:android`) and submits them: the SDK is native code, so only a store build carries it.
  The first iOS build after `TAPP_LINK_DOMAIN` adds the Associated Domains capability: let EAS regenerate the provisioning profile.
- On iPhone, Tapp runs only for people who have allowed tracking: the app never asks.
  To count iPhone installs from links too, add `expo-tracking-transparency` and ask in context, with a line in `app.json` saying why.
- Posts `https://<domain>/go/<channel>` links (`/go/newsletter`, `/go/instagram`): phones go through Tapp, everyone else to the site with the channel in its utm tags.

## What is the person's

- Make an account at tapp.so and add the app: bundle id (`app.json` → `ios.bundleIdentifier`), App Store ID and Team ID (App Store Connect), URL scheme (`app.json` → `scheme`), the Play package and its app signing SHA-256 (Play Console → Test and release → App integrity).
- Copy the auth token and Tapp token into Vercel as `TAPP_AUTH_TOKEN` and `TAPP_TOKEN`, and the app's link domain (Tapp shows it, e.g. `yourapp.tapp.so`) into EAS → Environment variables (production) as `TAPP_LINK_DOMAIN`.
- App Store Connect → App Privacy and Play Console → Data safety: add device identifiers and attribution, used for analytics and not for ads (Tapp matches an install to a click).

## How to check it

- `curl -s https://<domain>/api/health | jq .integrations.tapp` is `true`; otherwise set `TAPP_AUTH_TOKEN` and `TAPP_TOKEN`.
