# Starter

Made with [fohm-scaffold](https://github.com/rhoneybul/fohm-scaffold). One
Expo codebase gives you:

- **A coaching progression** (by default): a level assessment, a path of skills with the next things to work on, check-ins (how it felt), clips and questions for the coach, and a library, all from `src/lib/progression.ts`, and all on the owner's dashboard.
- **Video feedback:** members attach or record a video (or photo) for their coach, and coaches can reply with a video. Files are private and play through short-lived links.
- **Multiple coaches:** the owner assigns members to coaches; each coach sees only their own members. With no coaches, the owner sees everyone.
- **A landing page** at `/` on the web for anyone signed out (words in `src/lib/brand.ts`).
- **The web app**, and **iOS and Android apps** (built with EAS), sharing one account.
- **An owner's dashboard** at `/admin` that sees everything members do: People, with what needs you on top, and Activity.
- **A backend that owns the database**: Vercel functions in `api/` over Supabase Postgres, with access rules on the server.
- **Migrations that ship with the code**, run first on every deploy.
- **Demo mode** with no setup: everything stays on the device until there's a database.
- **An optional game** (`kind: 'game'` in `src/lib/brand.ts`): Catch the dot, with every round saved and shown on the dashboard.
- **Integrations built in, each off until its key is set:** Stripe (Pro, a monthly plan), PostHog (analytics), Sentry (error reports), Resend (email: a welcome, replies and Supabase's sign-up emails in the app's look), a Claude AI assistant, Continue with Google, push notifications, Tapp (invite and /go links that survive the install), and Mapbox maps for planning routes on the roads and paths (with `APP.routes` on: `docs/ROUTES.md`). The dashboard's Settings page shows which are on; `.env.example` lists every variable.
- **Tests and CI**, smoke tests against production, privacy policy and terms pages, and `AGENTS.md` for coding agents.

## Where am I?

Open this folder in Claude Code and run fohm-scaffold's `new-app` skill: it
takes the app from here to live, with `app-design` for the screens and
`app-launch` for Supabase, Vercel, the integrations and the stores. What only
you can do (the domain, the business, the store accounts, keys) is on one
checklist page it publishes for you.

## Run it

```bash
npm install
npm run web            # the browser, in demo mode
npm start              # then scan the QR code with Expo Go for iOS or Android
```

The apps call the API at `expo.extra.apiUrl` in `app.json`. While developing
against a local backend, set it to your laptop's address on the network (for
example `http://192.168.1.20:4321`) and run `npm run serve:local`.

The full stack locally (Docker needed):

```bash
npx supabase start -x studio,imgproxy,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit
eval "$(npx supabase status -o env | grep -E '^(API_URL|DB_URL|PUBLISHABLE_KEY)=')"
export SUPABASE_DB_URL=$DB_URL SUPABASE_URL=$API_URL SUPABASE_PUBLISHABLE_KEY=$PUBLISHABLE_KEY
npm run migrate
npm run serve:local    # the site and the real /api on http://localhost:4321
```

To make an owner account, choose "I run ..." when creating an account and
enter the owner code (`OWNER_CODE` on the server; `change-me` locally). Coaches
choose "A coach here" with the coach code (`COACH_CODE`; `coach-me` locally).

## Check it

```bash
npm run typecheck
npm test               # with the variables above set, the backend tests run too
```

## Build the apps

```bash
npx eas-cli login
npx eas-cli init
npm run build:android  # preview: an installable .apk
npm run build:ios      # needs an Apple Developer account
npm run submit:ios
npm run submit:android
```

## Layout

```
src/app/                 routes (expo-router)
  index.tsx              landing page (web, signed out) or where each person belongs
  sign-in.tsx            create an account, sign in, finish a profile
  home.tsx               the member's home (replace with your product)
  onboarding.tsx         the level assessment (coaching)
  path.tsx, checkin.tsx, library.tsx   the progression (coaching)
  game.tsx               the example game (kind: 'game')
  pro.tsx                Pro: buy or manage it (Stripe, on the web)
  ask.tsx                the AI assistant (Pro)
  account.tsx            sign out, delete the account, legal pages
  privacy.tsx, terms.tsx public legal pages (words in src/lib/legal.ts)
  admin/                 the owner's dashboard: People, people/[id], Activity, Settings
src/lib/
  brand.ts               name, words, landing copy, and kind (coaching, app or game)
  progression.ts         the coaching method as data: levels, skills, assessment, library
  config.ts              where the API is (web vs the apps)
  types.ts               the shape of every record; DB and EMPTY_DB
  backend.ts             /api with Supabase Auth, or demo mode on the device
  store.tsx              app state and actions (every write goes to the backend)
  activity.ts            the Activity feed, Needs you, ADMIN_SEES
  game.ts                the game's rules
  legal.ts               privacy policy (naming the services switched on) and terms
  analytics.ts           PostHog
  sentry.ts              Sentry
  push.ts                push notifications (iOS and Android)
  theme.ts               design tokens: C (member app) and A (dashboard)
src/components/          ui.tsx (member kit), admin.tsx (dashboard kit), landing.tsx, legal-page.tsx
api/                     the backend; the only code that touches the database
                         (health, accounts, data, billing, stripe-webhook, ai; _lib/ for Stripe, PostHog, Sentry, email and push)
supabase/migrations/     SQL, applied on every deploy
tests/                   npm test; tests/smoke/ runs against the live site
docs/                    RESEARCH.md, PROPOSAL.md, HANDOVER.md
assets/brand/            the owner's own logo and artwork
.launch/checklist.html  what only you can do to go live, published as an Artifact by the app-launch skill
```
