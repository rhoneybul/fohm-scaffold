# The accounts every app shares

Takes: about an hour, once, for every app after it; each new app then needs about ten minutes of the person's clicks.

**Why.** Naz, Etapa and every app made from the template publish from the same Apple team, Expo account, Play account, Vercel team and GitHub organisation.
A key that lives on the account is set up once; a key that lives on a project is pasted again for every app, and that is where launches stall.
So each key goes on the highest level that can hold it.

## What the agent does

- Reads which accounts already exist from an app built like this one (Naz's and Etapa's `app.json` `owner`, `eas.json` `submit`, and their workflows' `secrets.*`) before asking for anything, and puts the same ids in the new app (`appleTeamId`, the Expo `owner`).
- Creates each new app's projects itself with the connectors (Supabase, Vercel, PostHog, Sentry, GitHub; Expo through Publish's first run), in the organisation or team below, never under a personal account when one exists.
- Runs **Set up app** (`.github/workflows/setup.yml`, `scripts/setup-app.mjs`) with the GitHub tools (`actions_run_trigger`) once the repository is in the organisation, and again after any key is added; it reads what is there first, so a second run changes nothing:
  - GitHub: the ruleset on `main` and the merge buttons (`REPO_ADMIN_TOKEN`);
  - Supabase: the project (found by name, else made), its sign-in URLs (the site and `<scheme>://**`), Apple sign-in for the bundle id once `app.json` asks for it, Google once its client is set, and a database password made on the runner and written straight into Vercel, so nobody ever sees it (`SUPABASE_ACCESS_TOKEN`);
  - Vercel: the project, `SUPABASE_DB_URL`, `SUPABASE_PUBLISHABLE_KEY` and `OWNER_EMAIL`, the team's shared variables linked, then a redeploy (`VERCEL_TOKEN`);
  - Firebase: the app's Android app in the shared project, its `google-services.json` into EAS as `GOOGLE_SERVICES_JSON` (`FIREBASE_SERVICE_ACCOUNT`);
  - App Store Connect: the bundle id registered with Apple, and once the owner has made the app on App Store Connect, its Apple ID written into `eas.json`, signed with the key the Expo account holds (`api.appstoreconnect.apple.com` allowed in the Claude environment; no key stored there);
  - Expo: the project made if missing, the bundle id registered and the account's App Store Connect key assigned to the iPhone app for builds and submissions, so a build with nobody signed in makes its own certificate and profile;
  - Expo: the project linked, and the shared FCM V1 and Play submission keys on its Android credentials (`EXPO_TOKEN`).
- The owner is whoever signs up with `OWNER_EMAIL` (a variable, not a secret: the account is made the owner only once Supabase confirms the address), so there is no owner code to make or hand over.
- Writes on the app's checklist only what is new for this app (the per-app list below), and says which keys it inherited.

### Where each key lives

| Key | Level | Where | Shared by every app |
| -- | -- | -- | -- |
| App Store Connect API key (`.p8`, App Manager) | Apple team | expo.dev → Account settings → Credentials → App Store Connect API Keys | yes |
| Google Play service account JSON | Play account | expo.dev → Account settings → Credentials → Google Service Account Keys; Play Console → Users and permissions → the account → **Account permissions** (release to testing tracks, manage testing tracks) | yes |
| The Expo token (a robot user, Developer role) | Expo account | The Claude environment, through the agent's secure form (host `api.expo.dev`): releases and Set up app run from a session, so no repository holds it | yes |
| `ANTHROPIC_API_KEY` | Anthropic organisation | Vercel team → Settings → Environment Variables (shared), Sensitive, linked to each project | yes; a workspace per app in the Anthropic console keeps the spend apart |
| `RESEND_API_KEY` | Resend account | Vercel shared variable, linked to each project; `EMAIL_FROM` stays per app (its own domain) | the key yes, the domain no |
| `REPO_ADMIN_TOKEN` (fine-grained, Administration: read and write), `SUPABASE_ACCESS_TOKEN`, `VERCEL_TOKEN`, `FIREBASE_SERVICE_ACCOUNT`, `PLAY_SERVICE_ACCOUNT_JSON` | the accounts | GitHub organisation secrets, for Set up app | yes |
| `OWNER_EMAIL`, `VERCEL_TEAM`, `SUPABASE_ORG` | the business | GitHub organisation variables | yes |
| `SUPABASE_DB_URL`, `STRIPE_*`, `POSTHOG_KEY`, `SENTRY_DSN`, `TAPP_*` | the app | Vercel project → Settings → Environment Variables | no |
| The Google OAuth client, the Apple sign-in key | the app | Supabase → Authentication → Providers | no: each consent screen names its app |

An app whose API runs on Railway (Naz, Etapa) keeps the same split: the shared keys in a Railway **project's shared variables** or each service's Variables, referenced rather than retyped, and never in the repository.

### Running it from a Claude session

The same script runs in a Claude cloud session whose environment holds the tokens as network secrets (the agent asks for each with `request_credential`: `api.supabase.com`, `api.vercel.com`, `api.expo.dev`), so nothing waits on GitHub secrets.
Node's fetch then needs the proxy: `NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`, each token variable set to the placeholder `proxy-injected`, `APP_FOLDER`, `VERCEL_TEAM`, `VERCEL_PROJECT` and `OWNER_EMAIL` set, then `node scripts/setup-app.mjs` in the app's folder.
Keys already on the Expo account are reused by their client email (`EXPO_FCM_KEY_EMAIL`, `EXPO_PLAY_KEY_EMAIL`), so no key file passes through the session.
The ruleset and Firebase still run on GitHub (they need a GitHub admin token or a key file); the store builds run on Expo's servers, started from the session (`scripts/release.ts`, [testflight.md](testflight.md)).

## What is the person's

### Once, for every app

1. **Expo**: expo.dev → the account → Settings → Robot users → a robot with the Developer role → its token, kept in a password manager.
2. **Apple**: App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → +, App Manager; download the `.p8` (it downloads once), then upload it on the Expo account's Credentials, not a project's.
3. **Google Play**: upload the service account JSON on the Expo account's Credentials, and give it Account permissions in Play Console so every new app is covered.
4. **GitHub**: the keys below go on each app's repository (Settings → Secrets and variables → Actions), a few pastes per app, when the repositories stay under a personal account (Robert's choice, Nov 2026: rhoneybul, with the existing Expo account and App Store Connect team).
   One command sets them on every repository from the person's own machine, with the GitHub CLI signed in and the values exported in the shell (or through a password manager, `op run -- …`): `npx github:rhoneybul/fohm-scaffold secrets --all`, or `--repo owner/name` for a new one. Each value goes to `gh` on its standard input; nothing passes through a chat, and a Claude session can't run it (its keys stay in the proxy).
   An organisation (github.com → + → New organization) holds them once for every repository instead; moving a repository into it means installing Vercel's, Railway's and Expo's GitHub apps on the organisation, or their deploys stop.
5. **Vercel**: the team → Settings → Environment Variables → shared: `ANTHROPIC_API_KEY` and `RESEND_API_KEY`, Sensitive.
6. **Sentry**: the organisation → General Settings → **Let Members Create Projects**, so the agent can make each app's project.
7. **Supabase**: renew the session's Supabase management token (the environment's network secrets) when the management API refuses the proxy, so the agent sets each app's URL configuration itself.

8. **The Set up app keys**, as secrets on the repository (or the organisation's): `REPO_ADMIN_TOKEN`, `SUPABASE_ACCESS_TOKEN` (supabase.com → Account → Access tokens), `VERCEL_TOKEN` (vercel.com → Account settings → Tokens, scoped to the team), `FIREBASE_SERVICE_ACCOUNT` (the shared Firebase project's Admin service account) and `PLAY_SERVICE_ACCOUNT_JSON`; and as variables `OWNER_EMAIL`, `VERCEL_TEAM` and `SUPABASE_ORG`.
9. **Google sign-in, once:** one Google Cloud project with the business's consent screen (its name, logo, privacy and terms), verified once; Google has no API for it.

### For each new app

1. The final name, before the store records: they carry it ([testflight.md](testflight.md)).
2. Google Play → Create app, and upload the first build by hand (Testing → Internal testing): Google has no API for either. Every later build uploads itself.
3. When Google sign-in goes in: its web and iOS OAuth clients in the shared Google Cloud project, the IDs as repository variables `GOOGLE_WEB_CLIENT_ID` and `GOOGLE_IOS_CLIENT_ID` and the web secret as `GOOGLE_WEB_CLIENT_SECRET`; Set up app puts them into Supabase.

Everything else is Set up app's.

## How to check it

- `npm run launch:check` in the app, with the same variables as Set up app: every account, key and setting above, done or missing, with the fix for each missing one (Set up app ends with its summary).

- Expo: `npx eas-cli credentials` in the app (with `EXPO_TOKEN`) lists the account's App Store Connect key and the Google service account against the project.
- Expo: `EXPO_TOKEN=proxy-injected npx eas-cli whoami` in a session names the robot.
- Vercel: `get_project_env` or `filter_project_envs` on the new project lists `ANTHROPIC_API_KEY` (shared) without showing its value, and `curl -s https://<domain>/api/health | jq .integrations` reports the AI on.
- Play: the new app is listed in Play Console with the service account under its users.
