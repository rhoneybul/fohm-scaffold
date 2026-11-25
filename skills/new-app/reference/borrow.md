# Borrow from Naz and Etapa first

Naz (surfing, `rhoneybul/naz`) and Etapa (cycling, `rhoneybul/etapa`) are the owner's two apps in production, and every app made here is their sibling.
Before building a feature, a workflow or a rule, look here: if one of them has it, port theirs, generalised (no surf, cycling or product names), with its tests, rather than writing new code.
Read their tests as well as their code: the tests hold the lessons.
Both repositories are read-only from another app's session: read them (clone with the GitHub tools, or `/home/user/naz` and `/home/user/etapa` where they're checked out), never edit them.

How to borrow:

- **Copy**: take it as it is, renaming product words.
- **Adapt**: the shape and most of the code, fitted to this app's stack (Naz's API is Node on Railway and Etapa's too; the template's is Vercel functions over Supabase).
- **Read**: the pattern and its rules; write this app's own.

**In the template** marks what the template already has (in its own form); start there.

## Workflows

| Path | What it is | Borrow | In the template |
| -- | -- | -- | -- |
| etapa `CLAUDE.md` *How every change ships*, naz `CLAUDE.md` same | Branch off main, open the PR the moment it's pushed, rebase onto the latest main, Rebase and merge once green: no merge commits, no squash | Copy into the app's `AGENTS.md` | No |
| etapa `.claude/skills/get-it-home/`, naz `.claude/skills/get-it-home/` | `/get-it-home`: drives a PR to merged on its own, rebasing and fixing CI until it lands | Copy into the app's `.claude/skills/` | No |
| naz `docs/branch-protection.md`, etapa `docs/branch-protection.md` | The ruleset and merge-button settings behind rebase-only merges | Copy, set on the new repository | No |
| naz `.github/workflows/test.yml` | CI as parallel jobs (app, server, scripts, database, dashboard) with one `All tests` job that needs them all: the only required check | Adapt as the app grows past one job | Yes: one job named `All tests` (`.github/workflows/test.yml`) |
| naz `.github/workflows/app-publish.yml`, etapa `.github/workflows/app-publish.yml`, etapa `scripts/bump-app-version.js`, `scripts/highest-built-version.js` | *Publish App* (the template moved it to an Expo workflow, `.eas/workflows/publish.yml` with `scripts/release.ts`, so no repository holds an Expo token; the version-from-tags mechanism is theirs): store builds by hand from Actions, the version bumped from the highest `app-v*` tag (never committed back to main) | Taken into the template | Yes: Publish (`.github/workflows/publish.yml`, `scripts/bump-app-version.ts`), run from a session (the app-launch skill's `reference/testflight.md`) |
| naz `app/.eas/workflows/update.yml`, naz `app/fingerprint.config.js`, naz `docs/native-app.md` | Over-the-air updates by hand, refused until a release with the same native fingerprint exists | Adapt once the apps are in the stores | No |
| etapa `docs/ota-runbook.md`, etapa `scripts/check-native-deps-for-ota.js`, `scripts/eas-update-local-guard.sh` | Patching a shipped runtime: maintenance branches from the release tag, the native-dependency diff a targeted OTA must pass, OTA only from CI | Read before the first OTA | No |
| naz `scripts/migrate.sh`, `scripts/migrate.test.mjs`, `docs/migrations.md`, `supabase/test/` | Migrations pushed with the pinned Supabase CLI before each deploy, re-runnable, tombstones, each migration run again on its own in CI | Read; the template has its own | Yes: `scripts/migrate.sh` on every Vercel deploy, migrations run twice in CI |
| etapa `docs/deployment.md`, etapa `.github/workflows/pre-deploy.yml`, `deploy-watch.yml` | Railway's deploy gated on green CI, migrations pre-deploy, rollback at 2am, watching a deploy land | Read when the API moves off Vercel | No |
| etapa `docs/automation-routines.md` | Scheduled routines commit nothing but code: dedupe state lives in Slack, Sentry or PR labels, never in git | Copy the rule into `AGENTS.md` once a routine exists | No |
| naz `.github/workflows/voice.yml`, `scripts/voice.mjs`, `scripts/voice-lib.mjs` | Generating recorded lines (ElevenLabs) in an Action that opens a PR with the files, its key a repository secret | Adapt for any generated asset that needs a key | No |
| naz `.github/workflows/synthetic-plans.yml`, naz `server/syntheticPlans.js` | Synthetic members put through the real builder by hand, flagged synthetic | Adapt with a plan builder | No |
| naz `scripts/vercel-ignore.sh` | Vercel skips builds a commit can't change | Copy for a monorepo | No |
| every app's `CLAUDE.md` *Work every app can use goes to the template* | The `Template:` line in every PR body, read by the daily *Port to the template* task | Copy ([port-back.md](port-back.md)) | Yes: the template's `AGENTS.md` |
| etapa `scripts/install-hooks.sh`, etapa `tests/mergeMarkers.test.js` | A pre-commit hook (lock-file drift, staged secrets, big files, conflict markers), and a test that fails on a conflict marker | Copy | No |
| etapa `scripts/rules-tests.mjs` | Tests discovered, not listed: adding a test is adding a file | Read | Yes: `node --test tests/*.test.ts` |

## Technical

| Path | What it is | Borrow | In the template |
| -- | -- | -- | -- |
| naz `server/plans.js`, `server/planBuilds.js`, `server/principles.js`, `docs/plans.md`, `app/src/data/plans.js`, `app/src/data/rotation.js` | The plan builder: Claude Haiku composing a plan from a written catalogue to a gold standard, checked, retried once, built in the background, emailed and pushed when ready | Adapt ([programs.md](programs.md) is its pattern) | The pattern: `docs/PROGRAMS.md` |
| etapa `CLAUDE.md` *Plan-generation changes*, etapa `server/src/routes/ai.js`, `server/src/lib/planPostProcessors.js` | Plan generation's pipeline (prompt, parse, post-processors, retry, defaults, injectors, enum coercers) and the rules for changing it: read it all, grill, server-only, tests at three levels | Read before any change to a builder | No |
| naz `server/planReviews.js`, `docs/plan-review.md`, etapa `server/src/lib/planReviews.js` | Every plan written recorded anonymised for coaches to review and refine the builder | Adapt with a builder | No |
| naz `app/src/components/player.js`, `app/src/data/guided.js`, `app/src/data/moves.js`, `app/src/data/clock.js`, `app/src/data/stepSounds.js`, `docs/do-now.md`, `server/doNow.js` | The guided player and Do now: timed sessions compiled from moves, Back, Pause, Skip, sounds, a clock that survives leaving the app, sessions served by the API with a version | Adapt for any follow-along session | No |
| naz `app/src/data/swaps.js`, `app/src/components/swap.js` | Swapping a move for one that does the same job, with any kit, keeping the dose | Adapt | No |
| naz `app/src/data/underway.js`, `app/src/components/pickUp.js` | A session under way kept as it goes, offered back on another device | Adapt with the player | No |
| naz `app/src/data/saves.js`, `savedSessions.js`, `savedCourses.js`, `favourites.js` | Saves of every kind, the latest first | Read | Yes: the `saved` table, `src/lib/saves.ts` |
| naz `app/src/data/journeyMerge.js` | Two copies of a member's state that both moved on, merged so each keeps what it changed, deletions included; the database refuses a stale save | Adapt if state is kept as one JSON | Not needed: the template keeps rows per table |
| naz `app/src/data/healthData.js`, `app/src/components/healthConsent.js` | Consent before keeping health data, withdrawn with deletion, the later decision winning a merge | Adapt the moment the app keeps a health number | No |
| naz `app/src/components/agreementGate.js`, `app/src/data/agreement.js`, `app/src/data/ageCheck.js`, `docs/legal.md` | The age check and agreeing to the terms, recorded with timestamps by the database, asked again when the terms' version moves | Adapt before the stores (they ask about age) | No (agreeing is implied at sign-up in `src/lib/legal.ts`) |
| naz `docs/push.md`, `app/src/push.js`, `app/src/push.native.js`, etapa `docs/push-notifications.md`, `docs/android-push-fcm.md` | Push asked for in context, never on load; Expo for phones and Web Push for browsers; Android's FCM setup | Read | Yes: Expo push, `src/lib/push.ts` |
| naz `app/src/telemetry/events.js`, `docs/analytics.md`, `app/test/telemetryEvents.test.js` | The analytics catalogue: every event with its why, held by a test to the code that sends it and to the doc | Copy the pattern | Yes: `src/lib/events.ts`, `docs/ANALYTICS.md`, `tests/events.test.ts` |
| etapa `docs/posthog-do-now.md` (and the other `docs/posthog-*.md`), `tests/analyticsHelpersDefined.test.js` | One doc per feature: its events, funnel and insights | Copy the shape for each feature | No |
| naz `scripts/posthog.mjs`, `scripts/posthog-lib.mjs` | PostHog dashboards and funnels as code, tested against the catalogue | Adapt once there's a funnel worth watching | No |
| naz `docs/flags.md`, `server/flags.js`, etapa `server/src/lib/featureFlags.js`, `src/services/remoteConfig.js` | Feature flags in PostHog read by the API, so installed apps follow them with no release: `paywall`, `maintenance`, `min-app-version` | Adapt before the first store release | No |
| naz `docs/payments.md`, `server/payments.js`, `app/src/purchases.js`, `scripts/revenuecat.mjs`, etapa `src/services/revenueCatService.js` | In-app purchases through RevenueCat, the API reading what an account has, products made by script | Adapt when the apps sell | No (Stripe on the web) |
| naz `docs/slack.md`, `server/teamPings.js`, `server/riderPings.js` | Slack pings for the funnel: downloads, sign-ups, purchases | Adapt | No |
| naz `app/modules/naz-live-activity/`, `app/targets/widgets/`, `app/src/data/lockScreen.js`, etapa `src/services/sessionLiveActivity.js` | A session under way on the lock screen and in the Dynamic Island | Adapt with the player (native: a release carries it) | No |
| naz `docs/offline.md`, `app/src/data/downloads.js`, `app/landing/offline.mjs`, etapa `src/services/sessionDownloads.js` | Sessions downloaded to play with no connection; the service worker on the web | Adapt | No |
| naz `app/src/share/`, `app/src/components/share.js` | Share cards: a session's facts as Story and Post cards, a canvas on the web and SVG in the apps | Adapt (the app-design skill points here) | No |
| naz `app/landing/build.mjs`, `app/landing/forward.js`, `app/landing/homeScreen.mjs` | A static landing page built from the app's own data after the export, store pills first, the web app's manifest and service worker | Read | A landing page in the app (`src/components/landing.tsx`) |
| naz `admin-dashboard/`, `docs/admin-dashboard.md`, `docs/coach-mode.md`, etapa `admin-dashboard/` | A Next.js admin dashboard with Google sign-in, and coach mode: coaches see their athletes and change their programs | Read; the template's is in the app | Yes: `/admin` with coaches (`src/app/admin/`) |
| etapa `server/src/lib/versionAdapt.js`, etapa `CLAUDE.md` *API compatibility* | Several app versions on one API: add fields, never rename; `atLeast` and `below` on the `X-App-Version` header | Copy the rules into `AGENTS.md` before the first store release | Part: add-never-rename is in `AGENTS.md`; every request sends `x-app-version` |
| naz `app/src/components/keyboard.js`, `app/test/keyboardRoom.test.js` | Every field rises above the keyboard, in a browser and in the apps, and a test lists every file with a `TextInput` | Copy | No |
| etapa `tests/tabBarClearance.test.js`, `tests/chatComposerSizing.test.js` | Guards that every screen clears the tab bar and every chat composer uses its token | Adapt | No |
| naz `app/src/data/photoLicences.js`, `research/spot-photos.json`, `docs/legal.md` | Which photos may be shown: open licences or the photographer's yes, the rest kept unshown | Read | Yes: `src/lib/photos.ts`, `/credits` |
| naz `app/src/data/profilePhoto.js`, `app/src/components/profilePhoto.js` | The member's photo, squared and scaled on the device | Read | Yes: `src/lib/photo.ts`, `src/components/avatar.tsx` |
| naz `app/src/data/onboarding.js`, `app/src/data/homeTab.js` | Onboarding one question to a screen ending in their own plan; Home as a board of tiles with Today's one thing | Read for the flows | Yes, simpler: `onboarding.tsx`, `home.tsx` |
| naz `app/src/data/signInWait.js` | A tap that needs an account waits on the sign-in, then carries straight on | Adapt | No |
| naz `scripts/app-icons.mjs` | Icons and splash drawn from the logo by script | Adapt | Yes: `npm run brand` renders every PNG from the SVGs in `assets/brand/` (the app-design skill's `reference/logo.md`) |
| etapa `src/theme/index.js`, naz `app/src/components/ui.js` | The house style's tokens and kit in the two apps | Read (the app-design skill) | Yes: `src/lib/theme.ts`, `src/components/ui.tsx` |
| etapa `src/utils/guideArc.js` | Copy that says where a member starts, where they get to and by when, from the plan's own numbers | Adapt for programs | No |
| etapa `server/src/lib/claudeCostCap.js`, `aiModels.js` | A cap on the AI's spend, and the models in one place | Adapt with the AI on | Part: `AI_DAILY_LIMIT` |
| etapa `server/src/lib/accountDeletion.js` | Deleting an account and everything it owns | Read | Yes: `api/accounts.ts` |
| etapa `docs/conversion-qa.md`, `qa/conversion/` | The sign-up to payment funnel's QA pack: scenarios, tracking plan, flows | Read before paid launch | No |

## Agent rules that keep paying off

| Source | Rule | In the template |
| -- | -- | -- |
| naz and etapa `CLAUDE.md` *Working with Robert* | Concise chat: lead with the conclusion; reasoning in commits, PR bodies and docs | No: add to `AGENTS.md` |
| naz `CLAUDE.md` *Docs that stay mergeable* | One sentence to a line in docs many PRs edit; table rows short | No |
| naz `game/HANDOFF.md`, `.gitattributes` | A handoff file merged with `union`, read after a rebase to drop the stale line | No |
| every app's `CLAUDE.md` *Tests* | Fewer full test runs: CI runs everything; a session runs the tests for what it changed | Yes |
| every app's `CLAUDE.md` | `/grilling` and `/impeccable` only where they earn their cost | Part: the design steps |
| etapa `CLAUDE.md` *Standards* | A fresh reviewer before anything is called done | Yes |
| naz `CLAUDE.md` *Naz is web first* | Web first, verified in a browser at 393×852 and 412×915; every change reaches the iPhone and Android apps in the same PR, browser-only code guarded | Yes |
| naz and etapa `CLAUDE.md` *Analytics* | Every feature ships with its PostHog events, never anything typed | Yes |
| etapa `CLAUDE.md` *API compatibility* | A fix that can be made on the server is made on the server: it reaches every installed version | No: add before the stores |

## Next to port into the template

Missing from the template, in both siblings, wanted by every app; most valuable first.
Each is its own PR into the template, generalised, with its test.

1. The keyboard rule and its test: naz `app/src/components/keyboard.js`, `app/test/keyboardRoom.test.js`.
2. The PR flow, rebase-only merges and `/get-it-home`: naz `.claude/skills/get-it-home/`, `docs/branch-protection.md`.
3. Feature flags read by the API (`maintenance`, `min-app-version`): naz `server/flags.js`, `docs/flags.md`; etapa `server/src/lib/featureFlags.js`.
4. OTA updates with the fingerprint guard (the publish workflow is in): naz `app/.eas/workflows/update.yml`, `app/fingerprint.config.js`; etapa `docs/ota-runbook.md`.
5. The age check and agreement gate: naz `app/src/components/agreementGate.js`, `app/src/data/ageCheck.js`, `docs/legal.md`.
6. API version adaptation: etapa `server/src/lib/versionAdapt.js`.
7. In-app purchases through RevenueCat: naz `docs/payments.md`, `scripts/revenuecat.mjs`.
8. Slack pings for the funnel: naz `docs/slack.md`, `server/teamPings.js`.
9. PostHog dashboards as code: naz `scripts/posthog.mjs`, `scripts/posthog-lib.mjs`.
10. The pre-commit hook and the conflict-marker test: etapa `scripts/install-hooks.sh`, `tests/mergeMarkers.test.js`.
