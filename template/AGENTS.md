# Notes for coding agents

This app was made with fohm-scaffold. One Expo codebase is the web app
(on Vercel, with the landing page and the owner's dashboard), the iOS app and
the Android app (built with EAS); its backend is in `api/` (Vercel functions
over Supabase Postgres). `npx github:rhoneybul/fohm-scaffold status` shows
which setup steps are left. `README.md` has the layout and setup, `PRODUCT.md`
the product, `DESIGN.md` the visual system. (Claude Code reads this file
through `CLAUDE.md`.) Replace this first paragraph with one sentence on what
your app is and who it is for.

## How this app is built (the strategy)

1. **Productise what the owner already sells.** A coaching business's method
   becomes a progression: assessment, path, check-ins, feedback, library
   (`src/lib/progression.ts`). Monetise their existing audience first.
2. **Research before building** (`docs/RESEARCH.md`), and write the product
   down (`PRODUCT.md`): agents decide from it.
3. **Design from references, not templates.** The owner's reference apps from
   Mobbin (DESIGN.md → References) and their own artwork (`assets/brand/`,
   traced, never redrawn). No emoji, nothing AI-generic.
4. **Review after every feature**: a code review (`/code-review`) and a
   design review of the screens, then act on them.
5. **Hand over well** (`docs/HANDOVER.md`): the owner builds on it with
   Claude Code; respect its "ask before changing" list.

## The owner sees everything members do

The owner's dashboard (`/admin`) is how the person running the app keeps up
with everyone. Keep it **simple**: People (everyone, with what needs the owner
on top) and Activity (everything members do and write, newest first). Add a
third page only if the product truly needs one.

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

- **Three roles**: `member`, `coach` (signs up with `COACH_CODE`) and `owner`
  (`OWNER_CODE`). The owner sees everything and assigns each member a coach
  (`accounts.coach_id`); a coach sees only their own members and writes only
  the staff's fields on them (`STAFF_FIELDS` in `api/data.ts`: replies, video
  replies, notes). With no coaches, the owner sees and answers everyone.
  Reads are scoped in `READS`; every new member-owned table uses `scoped()`.
- **Videos, photos and voice notes** go straight from the app to the private
  Storage bucket `member-media`, each in the uploader's own folder, and play
  through signed links that last an hour. Who may play a file is decided in
  the database (`fohm_can_read_media`, migration `20260101000005`): its
  uploader, the owner, and for a file on a message, that member and their
  coach. The server refuses a message whose file isn't in the sender's own
  folder. Files are capped at 50 MB (the bucket's limit).

## Integrations

Built in, each **off until its variables are set in Vercel** (`.env.example`
lists them all). `/api/health` reports which are on, with their public parts,
and the app, the dashboard's Settings page and fohm-scaffold's checks read it.
Code must work with any of them off.

| Integration | Server | App | Switch |
| -- | -- | -- | -- |
| Payments for Pro (Stripe) | `api/billing.ts`, `api/stripe-webhook.ts`, `api/_lib/stripe.ts`; `requirePro` in `api/_lib/access.ts` | `src/app/pro.tsx`; `isPro` in `src/lib/types.ts` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Analytics (PostHog) | `capture` in `api/_lib/analytics.ts` | `track`, `identify`, `screen` and `forgetIdentity` (on sign-out and delete, so the next person on the device starts anonymous) in `src/lib/analytics.ts` | `POSTHOG_KEY` |
| Errors (Sentry) | every 500 from `handle()` | `src/lib/sentry.ts`, `ErrorBoundary` | `SENTRY_DSN` |
| Email (Resend) | `api/_lib/notify.ts` | | `RESEND_API_KEY`, `EMAIL_FROM` |
| AI assistant (Claude) | `api/ai.ts` | `src/app/ask.tsx` | `ANTHROPIC_API_KEY` |
| Google sign-in | Supabase | `signInWithGoogle` (web) | Supabase's Google provider |
| Push (Expo) | `sendPush` in `api/_lib/notify.ts` | `src/lib/push.ts` | `npx eas-cli init` |

- **Pro** is enforced on the server (`requirePro` returns 402), never only by
  hiding a button. The plan is set only by the Stripe webhook (checked against
  Stripe's own record) and the owner's switch; a record save never changes it.
  In the iOS and Android apps, Pro is bought on the web: the app stores require
  their own in-app purchase for digital subscriptions sold inside an app.
- **Analytics** carries what people did, never what they wrote. Add events
  with `track()`; name them `noun_verbed`.
- **AI**: model `claude-opus-5-5` through the official SDK, with the
  server-side refusal fallback on. Every question and answer is stored and
  shown on the dashboard. Members can't write `ai_chats` themselves.
- **Notifications** never fail the request that caused them.
- **Privacy**: `privacy()` in `src/lib/legal.ts` names only the services
  switched on. A new integration gets its line there in the same change.

## Where things live

| Path | What |
| -- | -- |
| `src/app/` | Routes (expo-router): `index.tsx` (the landing page on the web when signed out, otherwise where each person belongs), `sign-in.tsx`, `home.tsx` (member), `game.tsx` (the example game), `account.tsx`, `privacy.tsx`, `terms.tsx`, `admin/` (the dashboard) |
| `src/lib/brand.ts` | The app's name, words, who runs it and its registration (shown on the privacy policy and terms), landing page copy, and `kind` (`coaching`, `app` or `game`) |
| `src/lib/progression.ts` | The coaching method as data: levels, skills, the assessment, the library |
| `src/app/onboarding.tsx`, `path.tsx`, `checkin.tsx`, `library.tsx` | The progression on the member's side |
| `docs/` | `RESEARCH.md`, `PROPOSAL.md`, `HANDOVER.md` |
| `src/lib/config.ts` | Where the API is: same origin on the web, `expo.extra.apiUrl` in the apps |
| `src/lib/game.ts` | The example game's rules (tested in `tests/game.test.ts`) |
| `src/components/landing.tsx` | The public landing page (web only) |
| `src/app/admin/settings.tsx` | Which integrations are on (owner only) |
| `src/lib/media.ts`, `src/components/media.tsx` | Choosing or recording a video or photo, uploading it, playing it |
| `.env.example` | Every server variable |
| `src/lib/store.tsx`, `src/lib/types.ts` | App state and its actions; the shape of every record |
| `src/lib/backend.ts` | Talks to `/api` with Supabase Auth, or keeps everything on the device in demo mode |
| `src/lib/activity.ts` | The Activity feed, Needs you, and `ADMIN_SEES` |
| `src/lib/theme.ts` | Design tokens for the member app (`C`) and the dashboard (`A`) |
| `src/components/ui.tsx`, `src/components/admin.tsx` | The member app's kit and the dashboard's kit |
| `api/` | The backend, and the only code that touches the database. `api/data.ts` decides who reads and writes what |
| `supabase/migrations/` | The schema, pushed on every Vercel deploy (`scripts/migrate.sh`) |

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
width, failing on any page error.

## Conventions

- **Data**: migrations are re-runnable (`if not exists`; CI runs each one
  twice), one 14-digit version each, and one that has deployed is never
  renamed or deleted (retire it with an empty tombstone, `select 1;`). Add
  fields; never rename or drop them, since open tabs still send the old shape.
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
