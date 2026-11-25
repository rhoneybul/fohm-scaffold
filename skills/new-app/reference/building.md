# Building features

## What it needs

A domain; the business registered if it takes money or sells in the stores under its own name; accounts on GitHub, Vercel and Supabase (free to start) and Expo (free) for the iOS and Android builds; an Apple Developer account (US$99 a year) and a Google Play developer account (US$25 once) for the stores; later Stripe if it charges.
Locally: Node 22, and Docker for the full local stack.
The app-launch skill takes each in turn.

## Run it in demo mode

**Why.** Demo mode keeps everything on the device, so the app can be seen before anything is set up.

- `npm install`, then `npm run web` (the browser; on the landing page, Get started).
- Create an account; then another, ticking "I run ..." with the code `change-me`, to see the dashboard.
- `npm start`, then scan the QR code with Expo Go to try it on a phone.
- **App or game**: `kind` in `src/lib/brand.ts` switches the example game on Home (`'game'`) or off (`'app'`), any time. The game, Catch the dot, is there to replace: its rules in `src/lib/game.ts`, its screen in `src/app/game.tsx`. Keep saving each finished round with `saveScore`: scores are add-only on the server and show in Activity.

## A new kind of thing a member creates

The template's one example table is `entries`. For each new kind of thing:

1. **Migration**: `supabase/migrations/<yyyymmddhhmmss>_<name>.sql`, re-runnable (`create table if not exists`, `add column if not exists`), with an owner column (`member_id ... references accounts(id) on delete cascade`) and `alter table ... enable row level security`.
2. **`api/_lib/db.ts`**: the table in `TABLES`, listing every column.
3. **`api/data.ts`**: its read rule in `READS` and its write rule in `MEMBER_WRITES`; owner-only fields in `OWNER_ONLY`, member-only in `MEMBER_ONLY`. The typecheck fails until you do.
4. **`src/lib/activity.ts`**: a line per field in `ADMIN_SEES` (the typecheck fails until you do) and a case in `activity()` so it shows in Activity.
5. **`src/lib/types.ts`**: the record's interface, and its place in `DB` and `EMPTY_DB` (demo mode then just works).
6. **`src/lib/store.tsx`**: an action that saves it through the backend, with its event (`track`, catalogued in `src/lib/events.ts` and `docs/ANALYTICS.md`).
7. **Tests**: a case in `tests/activity.test.ts`; rules in `tests/api.test.ts`.

The prompt that does most of it: "Read PRODUCT.md and AGENTS.md. Add <thing> that members can <do>. Follow the checklist in AGENTS.md: migration, TABLES, READS/MEMBER_WRITES, ADMIN_SEES, Activity, types, store, events, tests. Then run typecheck and the tests."

## Screens

- Design first, with the app-design skill: the house style, the references within it, the photos, the kit only.
- Members: make `src/app/home.tsx` the product's board.
- Owner: put new information where the owner already looks (a filter on Activity, a column on People, a section on a member's page) before adding a page.
- Brand: the name, landing words and switches in `src/lib/brand.ts`; colours in `src/lib/theme.ts`, recorded in `DESIGN.md`; never hard-coded in screens.
- The brand from the owner's artwork: the person sends their logo and artwork, the largest files they have, into `assets/brand/`; the agent traces the logo into an SVG component (never redrawn by hand), takes the colours into `src/lib/theme.ts`, writes `DESIGN.md`'s north star, writes the tagline and the three landing features in `src/lib/brand.ts` in the owner's voice, and makes the icon (1024x1024 `icon.png`, `"icon"` in `app.json`) and splash from the logo.
- The landing page (`src/components/landing.tsx`) shows only on the web; the apps go straight to sign-in.
- Every screen runs on the web, iOS and Android: guard browser-only code with `isWeb` (`src/lib/config.ts`), and check the native bundles build with `npx expo export --platform ios` (and `android`) when native code or config changes.
- Check each change in a browser at phone width (393×852 and 412×915) and laptop width, with `npm run serve:local` and Playwright, failing on any page error.

## Keep it safe while it grows

- `npm run typecheck` and the tests for what changed before every push; CI runs everything against a fresh local Supabase, and every migration twice.
- Never rename or delete a migration that has deployed; retire it with a tombstone. Add fields; never rename or drop them (open tabs and installed apps still send the old shape).
- Secrets live only on the server (Vercel's environment variables); the app reads public settings from `/api/health`.
- Every write goes through `/api/data`, which decides who may do what. Never give the app a database key.

## Review, then preview

**Why.** Every feature in Aluzam got a fresh code review and a design review, and acting on them caught real bugs and the generic look.

1. `/code-review high`, then fix what it finds.
2. The design review (the app-design skill's review loop) at 393×852 and laptop width against `DESIGN.md` and its references; act on the verdict.
3. Send the owner what changed: a share link to the preview (the Vercel connector's `get_access_to_vercel_url`, since previews are behind Vercel Authentication; it lasts 23 hours) and the screenshots from `npm run screens` (the main flow at 393×852, which fails on a page error or a screen that scrolls sideways; add new screens to its `WALK`).
4. Repeat after each feature.

## Working with a coding agent, day to day

- One feature per branch and pull request; merge to `main` to ship.
- Start each request with the outcome and who it's for, not the code: "Members can attach a photo to an entry, and the owner sees it on their page."
- Record decisions where agents will read them: product rules in `AGENTS.md` (with who decided and when), product facts in `PRODUCT.md`, visual rules in `DESIGN.md`.
- When a review finds a class of bug, turn the fix into a rule the typechecker or a test enforces (that's where `ADMIN_SEES` came from).
