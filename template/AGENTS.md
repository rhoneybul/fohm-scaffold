# Notes for coding agents

This app was made with fohm-scaffold. One Expo codebase is the web app
(on Vercel, with the landing page and the owner's dashboard), the iOS app and
the Android app (built with EAS); its backend is in `api/` (Vercel functions
over Supabase Postgres). fohm-scaffold's skills (`new-app`, `app-design`,
`app-launch`) take it from here to live. `README.md` has the layout, `PRODUCT.md`
the product, `DESIGN.md` the visual system. (Claude Code reads this file
through `CLAUDE.md`.) Replace this first paragraph with one sentence on what
your app is and who it is for.

## How this app is built (the strategy)

1. **Productise what the owner already sells.** A coaching business's method
   becomes a progression: assessment, path, check-ins, feedback, library
   (`src/lib/progression.ts`). Monetise their existing audience first.
2. **Research before building** (`docs/RESEARCH.md`), and write the product
   down (`PRODUCT.md`): agents decide from it.
3. **Design in the house style, from the references.** The app starts in
   the house style shared with the owner's professional apps, Naz and Etapa
   (DESIGN.md): Space Grotesk and DM Sans on a closed scale, a grey canvas
   with white borderless cards, lists as rows on one card, the ink pill with
   an accent disc, the floating tab bar. The owner's reference apps from
   Mobbin (DESIGN.md → References) and their own artwork (`assets/brand/`,
   traced, never redrawn) are adopted within it, not instead of it. No
   emoji, nothing AI-generic. Before building screens, run `/impeccable`
   (shape or critique) against the references and write the direction to
   `.impeccable/surfaces/`, saying which reference each screen follows and
   what it takes; then build from the kit, and have a fresh reviewer compare
   the screens with the references and the house style before the owner
   sees a preview. Lists of references that nobody followed got one first
   build rejected; a heavier, soft-shadowed look of its own got another
   called "vibe coded" beside Naz and Etapa.
4. **Review after every feature**: a code review (`/code-review`) and a
   design review of the screens, then act on them.
5. **Hand over well** (`docs/HANDOVER.md`): the owner builds on it with
   Claude Code; respect its "ask before changing" list.

## The owner sees everything members do

The owner's dashboard (`/admin`) is how the person running the app keeps up
with everyone. Keep it **simple**: People (everyone, with what needs the owner
on top, each with their photo, when they were last in, on what, their plan and
where they came from), Overview (members, active this week, sign-ups by week,
platforms and versions, and the funnel from signing up to paying:
`src/lib/overview.ts`), Activity (everything members do and write, newest
first, filtered by kind, time and who) and the owner's Settings. A member's
page has everything they did, and the owner's switches: Pro, the coach,
resetting onboarding and deleting the account (`action: 'reset'` and
`'remove'` in `api/accounts.ts`). Add a page only if the product truly needs one.

**Every feature is built so the dashboard can see what it produces**, in the
same change as the feature, not as a follow-up:

1. **Anything a member creates or does is stored on the server and shown on
   the dashboard.** It goes through `/api/data`, never only on the device, and
   shows in Activity (a case in `activity()` in `src/lib/activity.ts`) and on
   the member's page. Anything the owner must act on also goes into Needs you.
2. **Say where the owner sees it.** Every field the backend stores is listed
   in `ADMIN_SEES` (`src/lib/activity.ts`) with the screen that shows it. A new
   column in `TABLES` (`api/_lib/db.ts`) fails `npm run typecheck` until it has
   a line there, and a new table also needs its read rule in `READS` and its
   write rule in `MEMBER_WRITES` (`api/data.ts`), typed the same way.
3. **Test it.** `tests/activity.test.ts` holds the feed to every kind of member
   content; rules about who may read or write what go in `tests/api.test.ts`.
4. **What is the owner's stays the owner's, and the member's stays the
   member's.** Private notes (`ownerNotes`) never reach a member. A member
   writes only their own rows and never `OWNER_ONLY` fields; the owner's save
   never overwrites `MEMBER_ONLY` fields (both in `api/data.ts`).

## Coaches and media

- **Never invent a coach or a person.** Members must never think a person
  is answering when nobody is. An app with no real coach (`APP.coach` false in
  `src/lib/brand.ts`: programs, not coaching) shows and offers no coach: no
  "Ask your coach", no coach role at sign-up, no coach in the privacy policy,
  and the people who run it are "the team". Leave `COACH_CODE` unset. With no
  coach, the app speaks as the product ("Your program", "We built this for
  your trip"), never as a named person or a made-up persona; an AI assistant
  says it's an AI.
- **Three roles**: `member`, `coach` (signs up with `COACH_CODE`) and `owner`
  (whoever signs up with `OWNER_EMAIL`, confirmed, or with `OWNER_CODE`). The owner sees everything and assigns each member a coach
  (`accounts.coach_id`); a coach sees only their own members and writes only
  the staff's fields on them (`STAFF_FIELDS` in `api/data.ts`: replies, video
  replies, notes). With no coaches, the owner sees and answers everyone.
  Reads are scoped in `READS`; every new member-owned table uses `scoped()`.
- **Photos wherever they make it personal**, in every slot: the member's own
  photo by Home's greeting and large on Account (`accounts.photo_path`, picked
  and squared on the device in `src/lib/photo.ts`); the goal they train for
  as Home's hero (`GoalCard`, from `currentGoal` and `SAVED_PHOTOS` in
  `src/lib/saves.ts`) and on its own page; a thumbnail on every list row and
  a photo on every hub card; the landing page led by `APP.heroPhoto`; empty
  states with a photo and a line (`Empty`'s `photo`); the content's own
  stills. `tests/photoSlots.test.ts` holds the template's slots; a new list
  or hub without photos is a review finding. Each
  photo carries its licence and credit (`CreditedPhoto` in
  `src/lib/photos.ts`): only public domain, CC0, CC BY or CC BY-SA with a
  named author, or the photographer's written permission, is shown (`canShow`),
  and every photo shown is listed on `/credits` (a section in
  `src/lib/credits.ts`, held by `tests/photos.test.ts`). Find them on
  Wikimedia Commons and Flickr, read each licence from its file page, and
  never show one the licence doesn't allow.
- **Imagery** (DESIGN.md → Imagery): a sharp photo of the member's own goal
  leads. A demo or video still is a frame from mid-video (YouTube's
  `hq1.jpg` to `hq3.jpg`, the middle first, never `hqdefault`'s title card),
  cropped to its middle: `stillOf` in `src/lib/stills.ts` and `letterboxed`
  on `Photo`; a large slot passes `sources={videoStillsLarge(id)}`, sharpest
  first. Never a blurred still under text, and burnt-in third-party
  lettering never shows: check each still by eye and name a clean frame in
  `STILL_FRAME_FOR`, or pick another photo. A photo's credit sits inside its
  card.
- **Videos, photos and voice notes** go straight from the app to the private
  Storage bucket `member-media`, each in the uploader's own folder, and play
  through signed links that last an hour. Who may play a file is decided in
  the database (`fohm_can_read_media`, migration `20260101000005`): its
  uploader, the owner, and for a file on a message, that member and their
  coach. The server refuses a message whose file isn't in the sender's own
  folder. Files are capped at 50 MB (the bucket's limit).

## Catalogues and saves

A coaching or programs app is about the thing members train for: Naz's
surf spots, Strawberry Fields' ski tours. Make it real and personal:

- **Research the catalogue** (the goals: places, events, trips) and the real
  courses that prepare for each into `research/<name>.json`, every fact with
  its source and every photo with its licence and credit; never invent one.
  Generate the typed data with `npx tsx scripts/research.ts <name>` (Code the
  API and the app share, below).
- **Saves** are one table for every catalogue (`saved`: kind, item, status;
  `save` and `unsave` in the store, `src/lib/saves.ts`): a heart on a goal, a
  bookmark on a session, a course kept. Name each catalogue in `SAVED_NAMES`
  so Activity says what was saved. A goal on their list or that they're going
  to shows on Progress as a to-do list (`toDo`), with a way to mark it done.
- **Programs dated to a goal**, built by AI from a written catalogue with a
  rule-based fallback: `docs/PROGRAMS.md`.

## Integrations

Built in, each **off until its variables are set in Vercel** (`.env.example`
lists them all). `/api/health` reports which are on, with their public parts,
and the app, the dashboard's Settings page and the app-launch skill's checks read it.
Code must work with any of them off.

| Integration | Server | App | Switch |
| -- | -- | -- | -- |
| Payments for Pro (Stripe) | `api/billing.ts`, `api/stripe-webhook.ts`, `api/_lib/stripe.ts`; `requirePro` in `api/_lib/access.ts` | `src/app/pro.tsx`; `isPro` in `src/lib/types.ts` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Analytics (PostHog) | `capture` in `api/_lib/analytics.ts` | `track`, `identify`, `screen` and `forgetIdentity` (on sign-out and delete, so the next person on the device starts anonymous) in `src/lib/analytics.ts` | `POSTHOG_KEY` |
| Errors (Sentry) | every 500 from `handle()` | `src/lib/sentry.ts`, `ErrorBoundary` | `SENTRY_DSN` |
| Email (Resend) | `api/_lib/notify.ts` (sending), `api/_lib/emails.ts` (what each says: HTML in the app's colours with a plain-text twin; a welcome to each new member); sign-up and password emails are Supabase's, through Resend's SMTP with `supabase/templates/` | | `RESEND_API_KEY`, `EMAIL_FROM` |
| AI assistant (Claude) | `api/ai.ts` | `src/app/ask.tsx` | `ANTHROPIC_API_KEY` |
| Google sign-in | Supabase | `signInWithGoogle` (web) | Supabase's Google provider |
| Share links (Tapp) | `api/_lib/tapp.ts`; invite links and claims in `api/accounts.ts`; `/go/<channel>` in `api/go.ts` | `src/lib/tapp.native.ts` (reads the link an install came through; the web's `tapp.ts` does nothing); Invite a friend on `src/app/account.tsx` | `TAPP_AUTH_TOKEN`, `TAPP_TOKEN`; a store build with the SDK; `TAPP_LINK_DOMAIN` in EAS |
| Push (Expo) | `sendPush` in `api/_lib/notify.ts` | `src/lib/push.ts` | `npx eas-cli init` |
| Maps and route planning (Mapbox) | `api/route.ts` (legs snapped to the roads), `api/_lib/maps.ts`, `api/_lib/routes.ts` | `src/app/routes/`, `src/components/route-map.tsx` (Mapbox GL JS in a WebView or an iframe), `src/lib/routeMap.ts`; `docs/ROUTES.md` | `APP.routes` in `src/lib/brand.ts`, and `MAPBOX_TOKEN` (a public `pk.` token restricted to the site's address); a store build for `react-native-webview` |

- **Pro** is enforced on the server (`requirePro` returns 402), never only by
  hiding a button. The plan is set only by the Stripe webhook (checked against
  Stripe's own record) and the owner's switch; a record save never changes it.
  In the iOS and Android apps, Pro is bought on the web: the app stores require
  their own in-app purchase for digital subscriptions sold inside an app.
- **Analytics on the web** keeps nothing on the device until a visitor
  chooses Allow all on the landing page's banner (`src/lib/consent.ts`);
  counting only uses an id that goes with the tab.
- **Analytics** carries what people did, never what they wrote. Every
  feature ships with its events in the same change: each in `src/lib/events.ts`
  with its why and in `docs/ANALYTICS.md`, sent with `track()` (the app) or
  `capture()` (the API), named `noun_verbed`; `tests/events.test.ts` fails
  on one missing from either.
- **AI**: model `claude-opus-5-5` through the official SDK, with the
  server-side refusal fallback on. Every question and answer is stored and
  shown on the dashboard. Members can't write `ai_chats` themselves.
- **Notifications** never fail the request that caused them. An email that
  must go once (the welcome) carries an idempotency key.
- **Tapp** is native (`com-tapp-so-sdk`, `plugins/withTappStaticFrameworks.js`,
  JitPack through `expo-build-properties`): a change to it reaches the apps
  only with a store build. Its `require` is guarded, so an older build keeps
  working. On iOS it starts only for someone who has allowed tracking; the
  app never asks for that itself. Tapp never sees an account id, name or
  email: only an opaque invite code or a channel's slug. Who invited whom
  (`accounts.invited_by`, within 14 days of sign-up) and the channel
  (`accounts.came_from`) show in Activity and on the member's page.
- **Last seen**: every request names its platform and version
  (`x-app-platform`, `x-app-version`); `GET /api/accounts` notes them at most
  every five minutes (`api/_lib/seen.ts`), for People and the member's page.
- **Routes** (`docs/ROUTES.md`, from Etapa's route builder): a leg follows
  the roads Mapbox finds, or stays straight and dashed, never a guess; a
  member's points go to Mapbox and nowhere else, and events carry counts
  and enums, never a place or a name. `react-native-webview` is native: a
  change to it reaches the apps only with a store build.
- **Privacy**: `privacy()` in `src/lib/legal.ts` names only the services
  switched on. A new integration gets its line there in the same change.

## Where things live

| Path | What |
| -- | -- |
| `src/app/` | Routes (expo-router): `index.tsx` (the landing page on the web when signed out, otherwise where each person belongs), `sign-in.tsx`, `home.tsx` (member: a board), `write.tsx` (writing to the owner), `game.tsx` (the example game), `account.tsx`, `privacy.tsx`, `terms.tsx`, `admin/` (the dashboard) |
| `src/lib/brand.ts` | The app's name, words, who runs it and its registration (shown on the privacy policy and terms), landing page copy, `kind` (`coaching`, `app` or `game`), `coach` (whether a real person coaches members) and `routes` (route planning on a map: `docs/ROUTES.md`) |
| `src/lib/progression.ts` | The coaching method as data: levels, skills, the assessment, the library |
| `src/app/onboarding.tsx`, `path.tsx`, `checkin.tsx`, `library.tsx` | The progression on the member's side |
| `docs/` | `RESEARCH.md`, `PROPOSAL.md`, `HANDOVER.md`, and `PROGRAMS.md` (programs built for a member, dated to a goal: the AI picks from a catalogue, a rule-based fallback) |
| `src/lib/config.ts` | Where the API is: same origin on the web, `expo.extra.apiUrl` in the apps |
| `src/lib/game.ts` | The example game's rules (tested in `tests/game.test.ts`) |
| `src/components/landing.tsx`, `src/lib/landing.ts`, `src/components/consent.tsx`, `src/lib/consent.ts` | The public landing page (web only), from Naz's and Etapa's: the hero photo and promise, a pill to each store in `APP.stores` (the web app a quiet link), the app's real screens in phone frames (`APP.screens`, else drawn live), how it works (`APP.steps`), the catalogue's photos (`LANDING_GOALS`), the price once payments are on, and a footer with who runs it; the cookie banner (counting only, or allow all) while analytics is on |
| `scripts/seo.ts`, `scripts/og-image.ts`, `public/og.png` | Search and share tags written into every web export (title, description, canonical, Open Graph, JSON-LD), and the share card rendered from the brand (`npm run og`; run it again after changing the name, words, accent or hero photo) |
| `src/app/admin/settings.tsx` | Which integrations are on (owner only) |
| `src/lib/media.ts`, `src/components/media.tsx` | Choosing or recording a video or photo, uploading it, playing it |
| `src/lib/photo.ts`, `src/lib/photoSize.ts`, `src/components/avatar.tsx` | The profile photo: picked, cut square and scaled on the device, uploaded to the member's own folder, shown on the avatar (Home, Account, the dashboard) |
| `src/lib/photos.ts`, `src/lib/credits.ts`, `src/app/credits.tsx` | Which photos may be shown (their licence and credit), and `/credits`, listing every one |
| `.env.example` | Every server variable |
| `src/lib/store.tsx`, `src/lib/types.ts` | App state and its actions; the shape of every record |
| `src/lib/backend.ts` | Talks to `/api` with Supabase Auth, or keeps everything on the device in demo mode |
| `src/lib/activity.ts` | The Activity feed, Needs you, and `ADMIN_SEES` |
| `src/lib/theme.ts`, `src/lib/fonts.ts` | Design tokens for the member app (`C`, the faces `F`, the type scale `T`, spacing `S`, radius `R`, `GUTTER`, `shadowFloat`) and the dashboard (`A`); the fonts (Space Grotesk and DM Sans, the house style's), loaded once in `src/app/_layout.tsx` |
| `src/components/ui.tsx`, `board.tsx`, `choice.tsx`, `src/components/admin.tsx` | The member app's kit (buttons, `TextLink`, fields, `Card` with `Rows` and `Row`, chips, notes, photos), the board's pieces (photo cards and heroes, stat tiles, the week, numerals, first steps, the segmented control, the pinned primary), answers as rows (`ChoiceGroup`) and the dashboard's kit (DESIGN.md) |
| `src/lib/stills.ts` | A video's still: a mid-video frame, never the title card, and the crop to its middle |
| `src/lib/tabs.ts`, `src/components/tab-bar.tsx` | The member's main tabs (`TAB_ROUTES`) and the floating tab bar, shown only on them |
| `src/lib/home.ts` | What Home's board shows: the week, the greeting, a new member's first steps |
| `api/` | The backend, and the only code that touches the database. `api/data.ts` decides who reads and writes what |
| `supabase/migrations/` | The schema, pushed on every Vercel deploy (`scripts/migrate.sh`) |
| `src/lib/saves.ts` | Saves (the `saved` table) and the to-do list |
| `.eas/workflows/publish.yml`, `scripts/release.ts`, `scripts/bump-app-version.ts` | Publish: the store apps built on Expo's servers by an Expo workflow and sent to TestFlight and Play's internal track, with nothing on GitHub and no Expo token in any repository: `npx tsx scripts/release.ts [ios|android|all] [patch|minor|major|x.y.z]` builds a clean checkout of the commit, its version bumped from the highest release tag (`app-v1.2.0`) in that checkout only, and tags the commit once the run succeeds. Run it from a Claude session whose environment holds the Expo token (with `EXPO_TOKEN=proxy-injected`), or signed in with `eas login`. Never a bare `eas build` for the stores |
| `store.config.json`, `scripts/store-screenshots.mjs`, `.eas/workflows/review.yml`, `scripts/review.ts`, `scripts/app-review.mjs` | Submit for review: the App Store listing as data (EAS Metadata; every `TO FILL` written from `PRODUCT.md` first), its screenshots at the 6.9-inch iPhone's and 13-inch iPad's sizes (`npm run store:screens` after a web export: add the app's screens to its `SHOTS`, and look at each), and an Expo workflow that pushes the listing, then sets the price (free), availability, the version and its newest processed build, export compliance and content rights, and with `--submit` sends it to Apple's review. `npx tsx scripts/review.ts [x.y.z] [--submit]` runs it on a clean checkout for the version last released. The App Store Connect key is on the Expo account (secret, production), never in a session or a repository; Apple's App Privacy answers are clicked once by hand (the app-launch skill's `reference/app-review.md`) |
| `.github/workflows/setup.yml`, `scripts/setup-app.mjs` | Set up app: from keys set once on the GitHub organisation, the ruleset and merge buttons, the Supabase project (its sign-in URLs, a database password nobody sees), the Vercel project (its variables, the team's shared ones linked), Android push in the shared Firebase project and the Expo account's keys on the app; safe to run again (the app-launch skill's `reference/accounts.md`) |
| `src/lib/logo.ts`, `scripts/brand-assets.ts`, `assets/brand/` | The mark as numbers (a placeholder ring and dot until the app's own replaces it), and `npm run brand`, which draws every icon, Android's adaptive icon, the favicon, the splash and the web page's splash from it; never edit an SVG or PNG it writes by hand (DESIGN.md, The mark and the launch screen) |
| `src/lib/splash.ts`, `src/components/logo-loader.tsx` | The launch screen, one picture three times (the phone's splash in `app.json`, the web page's in `public/index.html`, `LoadingSplash` in the app, which `_layout.tsx` keeps up until the fonts and the session are in, for 4 s at most), and Naz's throbbing mark (`LogoLoader`, `PageLoader`) for anything loading; still under reduced motion. expo-splash-screen and react-native-svg are native: a change reaches the apps only with a store build |
| `metro.config.js`, `scripts/research.ts` | `.js` imports resolved to `.ts` for the app's own files; research generated into TypeScript for the API |

## Before you push

CI (`.github/workflows/test.yml`) runs every test on each pull request, so
a session doesn't run them all again first. Locally, run `npm run
typecheck` and the tests for what you changed; start the stack and run
everything only when the change touches `api/`, a migration or who may read
and write what, or CI has failed and you need to reproduce it:

```bash
npm run typecheck
npx supabase start -x studio,imgproxy,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit
eval "$(npx supabase status -o env | grep -E '^(API_URL|DB_URL|PUBLISHABLE_KEY)=')"
SUPABASE_DB_URL=$DB_URL SUPABASE_URL=$API_URL SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY npm test
```

`supabase start` needs Docker; in a cloud session, start the daemon first
(`dockerd &`). CI (`.github/workflows/test.yml`) runs the same on every pull
request and push to main. A push to `main` deploys production (Vercel:
migrations, then the app), and the Smoke workflow then checks the live site.
Check UI changes in a browser: `npm run serve:local`, then drive it with
Playwright at phone sizes (393×852, 412×915) and, for the dashboard, laptop
width, failing on any page error. `npm run screens` (after `npx expo export
--platform web`) walks the main member flow in demo mode at 393×852, scale 2,
into `screens/`, and fails on a page error or a screen that scrolls sideways:
add new screens to its `WALK`. After each feature, send the owner the preview
link (pull request previews are behind Vercel Authentication: a share link
from the Vercel connector's `get_access_to_vercel_url`, good for 23 hours)
with those screenshots. With no database the app runs in demo mode, so a
preview works before Supabase is set up.

## Conventions

- **Data**: migrations are re-runnable (`if not exists`; CI runs each one
  twice), one 14-digit version each, and one that has deployed is never
  renamed or deleted (retire it with an empty tombstone, `select 1;`). Add
  fields; never rename or drop them, since open tabs still send the old shape.
- **Code the API and the app share** (a catalogue, a builder, rules both
  sides check) lives in `src/lib` and is written for Vercel, which runs the
  API as compiled ES modules: relative imports end in `.js`
  (`import { x } from './catalogue.js'`; `metro.config.js` maps them to the
  `.ts` file for the app's own code, never for packages), no `@/` aliases
  anywhere the API imports, and no JSON imports. Research the API reads is
  generated into a `.ts` file (`npx tsx scripts/research.ts <name>` writes
  `src/lib/<name>.data.ts` from `research/<name>.json`), with
  `tests/research.test.ts` failing while the two drift. Each passes the
  typecheck and tsx and fails every request in production;
  `tests/api-build.test.ts` compiles the API as Vercel does and loads every
  route in plain Node to catch it.
- **Demo mode** (no database) keeps working: a new collection needs only its
  place in `DB` and `EMPTY_DB`.
- **Web, iOS and Android from one codebase.** Guard browser-only APIs
  (`window`, `document`) with `isWeb` from `src/lib/config.ts`, and use
  `confirmAsync` instead of `window.confirm`. Check native builds still bundle:
  `npx expo export --platform ios` and `--platform android`. No `EXPO_PUBLIC_`
  variables: the app reads public settings from `/api/health`, and secrets
  stay on the server.
- **Games**: every finished round is saved through `saveScore`, so the owner
  sees it in Activity. Scores are add-only on the server.
- **Copy**: plain English, no emoji.
- **Privacy**: a change to what's stored updates the privacy policy in the
  same change.
