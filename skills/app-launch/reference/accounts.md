# The accounts every app shares

Takes: about an hour, once, for every app after it; each new app then needs about ten minutes of the person's clicks.

**Why.** Naz, Etapa and every app made from the template publish from the same Apple team, Expo account, Play account, Vercel team and GitHub organisation.
A key that lives on the account is set up once; a key that lives on a project is pasted again for every app, and that is where launches stall.
So each key goes on the highest level that can hold it.

## What the agent does

- Reads which accounts already exist from an app built like this one (Naz's and Etapa's `app.json` `owner`, `eas.json` `submit`, and their workflows' `secrets.*`) before asking for anything, and puts the same ids in the new app (`appleTeamId`, the Expo `owner`).
- Creates each new app's projects itself with the connectors (Supabase, Vercel, PostHog, Sentry, GitHub; Expo through Publish's first run), in the organisation or team below, never under a personal account when one exists.
- Links the account-level keys to the new project instead of asking for them again: Vercel's shared environment variables (`get_shared_env_var`, then link the project in the dashboard), the Expo account's credentials, the GitHub organisation's secrets.
- Writes on the app's checklist only what is new for this app (the per-app list below), and says which keys it inherited.

### Where each key lives

| Key | Level | Where | Shared by every app |
| -- | -- | -- | -- |
| App Store Connect API key (`.p8`, App Manager) | Apple team | expo.dev → Account settings → Credentials → App Store Connect API Keys | yes |
| Google Play service account JSON | Play account | expo.dev → Account settings → Credentials → Google Service Account Keys; Play Console → Users and permissions → the account → **Account permissions** (release to testing tracks, manage testing tracks) | yes |
| `EXPO_TOKEN` (a robot user, Developer role) | Expo account | GitHub organisation → Settings → Secrets and variables → Actions, access **All repositories** | yes, once repos are in the organisation |
| `ANTHROPIC_API_KEY` | Anthropic organisation | Vercel team → Settings → Environment Variables (shared), Sensitive, linked to each project | yes; a workspace per app in the Anthropic console keeps the spend apart |
| `RESEND_API_KEY` | Resend account | Vercel shared variable, linked to each project; `EMAIL_FROM` stays per app (its own domain) | the key yes, the domain no |
| `SUPABASE_DB_URL`, `OWNER_CODE`, `STRIPE_*`, `POSTHOG_KEY`, `SENTRY_DSN`, `TAPP_*` | the app | Vercel project → Settings → Environment Variables | no |
| The Google OAuth client, the Apple sign-in key | the app | Supabase → Authentication → Providers | no: each consent screen names its app |

An app whose API runs on Railway (Naz, Etapa) keeps the same split: the shared keys in a Railway **project's shared variables** or each service's Variables, referenced rather than retyped, and never in the repository.

## What is the person's

### Once, for every app

1. **Expo**: expo.dev → the account → Settings → Robot users → a robot with the Developer role → its token, kept in a password manager.
2. **Apple**: App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → +, App Manager; download the `.p8` (it downloads once), then upload it on the Expo account's Credentials, not a project's.
3. **Google Play**: upload the service account JSON on the Expo account's Credentials, and give it Account permissions in Play Console so every new app is covered.
4. **GitHub**: create a free organisation (github.com → + → New organization → Free), then move each app's repository into it (the repository → Settings → General → Danger Zone → Transfer).
   Set `EXPO_TOKEN` once on the organisation (Settings → Secrets and variables → Actions → New organization secret, access All repositories).
   If GitHub offers it only to public repositories, which some plans do, set it on each repository instead: one paste per app.
   After a transfer, Vercel, Railway and Expo keep building only once the GitHub app of each is installed on the organisation (github.com → the organisation → Settings → GitHub Apps) with access to the repository.
5. **Vercel**: the team → Settings → Environment Variables → shared: `ANTHROPIC_API_KEY` and `RESEND_API_KEY`, Sensitive.
6. **Sentry**: the organisation → General Settings → **Let Members Create Projects**, so the agent can make each app's project.
7. **Supabase**: renew the session's Supabase management token (the environment's network secrets) when the management API refuses the proxy, so the agent sets each app's URL configuration itself.

### For each new app

1. The final name, before the store records: they carry it ([testflight.md](testflight.md)).
2. Google Play → Create app, and upload the first build by hand (Testing → Internal testing): Google has no API for either. Every later build uploads itself.
3. Link the Vercel shared variables to the new project, and add its own (`SUPABASE_DB_URL` with the reset password, `OWNER_CODE`).
4. Import the ruleset and set the merge buttons ([github.md](github.md)).

## How to check it

- Expo: `npx eas-cli credentials` in the app (with `EXPO_TOKEN`) lists the account's App Store Connect key and the Google service account against the project.
- GitHub: the organisation's Settings → Secrets lists `EXPO_TOKEN` with the repository in its access; Actions → Publish gets past its token check.
- Vercel: `get_project_env` or `filter_project_envs` on the new project lists `ANTHROPIC_API_KEY` (shared) without showing its value, and `curl -s https://<domain>/api/health | jq .integrations` reports the AI on.
- Play: the new app is listed in Play Console with the service account under its users.
