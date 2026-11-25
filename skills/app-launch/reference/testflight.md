# TestFlight, entirely from a Claude session

Takes: an hour of the person's clicks once the Apple account is verified; each build about 20 minutes, then 15 to 30 minutes of Apple's processing.

**Why.** The owner and their testers get the real iPhone app on their phones, and every later build ships from the session with no Mac, no Xcode and no terminal on the person's side.

## What the agent does

- Waits for the name (the new-app skill's `reference/naming.md`: the App Store record carries it and can't be renamed freely); a name marked **Name not final** on the checklist blocks this.
- In `app.json`: `ios.bundleIdentifier` from the name (`com.<name>.app`), `expo.owner` set to the Expo account (or organisation) the token belongs to, and `ios.config.usesNonExemptEncryption: false`, the export compliance answer, so TestFlight never stops to ask.
- In `eas.json`: `submit.production.ios` with `appleTeamId` and, once the app exists in App Store Connect, `ascAppId` (its Apple ID, under App Information).
- Links the Expo project once: `npx eas-cli init --non-interactive --force` in the app's folder (with `EXPO_TOKEN=proxy-injected` in a Claude session), which creates it under `expo.owner` and writes `extra.eas.projectId` into `app.json`, committed in a PR.
- Releases with `npx tsx scripts/release.ts ios patch` (or `android`, `all`; `--build-only` to keep it off the stores): a clean checkout of the commit, its version bumped from the highest `app-v` tag in that checkout only, the Expo workflow `.eas/workflows/publish.yml` run on Expo's servers (`eas workflow:run`, which uploads the checkout, so GitHub needn't be linked), and the commit tagged once it succeeds.
  Expo signs and submits with the account's own App Store Connect key and Google service account, so nothing is asked of the person per build and no repository holds a token.
  In a Claude session, eas-cli reaches Expo through the proxy: `EXPO_TOKEN=proxy-injected NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt`.
- Watches it with the Expo connector: `build_list` and `build_info` for the status, `build_logs` when it fails; later `testflight_crashes` and `testflight_feedback`.
- The App Store Connect record: `eas submit` creates it when it's missing (with the API key on EAS), or the person creates it (My Apps → +, the bundle id, the final name, a SKU).
- TestFlight: internal testers first (up to 100 App Store Connect users, no review).
  External testers need Beta App Review, the test information (what to test, a contact, a review login) and a privacy policy URL (`https://<domain>/privacy`); the agent writes those words.

### Supabase for a real build

- `SUPABASE_DB_URL` (the Session pooler string, with the password the person resets: [supabase.md](supabase.md)) and `OWNER_CODE` are in Vercel, so the API the app calls works.
- Authentication → URL Configuration: the web URL **and the app's scheme** in Redirect URLs (`https://<domain>/**` and `<scheme>://**`, the scheme from `app.json`), so sign-in links open the app.

### Sign-in for the first build

- The first TestFlight build ships with **email sign-in only**.
- Google sign-in in the iOS app needs its own iOS client and a native flow, and **Apple's guideline 4.8 requires Sign in with Apple whenever an app offers Google sign-in**: the Sign in with Apple capability on the App ID, a Services ID, and a key in Supabase's Apple provider.
  So Google and Apple are added together, in a later build ([google.md](google.md)).

## What is the person's

- **The Apple Developer Program**, as an organisation with a D-U-N-S number for a company ([store-accounts.md](store-accounts.md)), and the Team ID from developer.apple.com → Membership details.
- **An Expo account** at expo.dev.
- **An App Store Connect API key**: App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → +, with the **App Manager** (or Admin) role.
  Note the Issuer ID and the Key ID, and download the `.p8` (it downloads once).
  Upload it once on the Expo **account** (Account settings → Credentials → App Store Connect API Keys), not a project, so every app uses it: EAS then manages each app's certificates and profiles and submits ([accounts.md](accounts.md)).
- **The Expo token**: expo.dev → the account → Settings → Robot users → a robot with the Developer role → a token, saved through the agent's secure form into the Claude environment (host `api.expo.dev`) once for every app. Never in the chat, never in a repository.
- **Google OAuth**, when Google and Apple go in together: Google Cloud → a project → Google Auth Platform → Branding (the app's name, support email, privacy and terms URLs, authorised domains including `supabase.co`) → Audience External → Clients → a Web client with the redirect `https://<ref>.supabase.co/auth/v1/callback`.
  Its ID and secret go straight into Supabase → Authentication → Providers → Google.
- **Sign in with Apple**: the capability on the App ID, a Services ID, and a Sign in with Apple key, into Supabase → Authentication → Providers → Apple.
- Install TestFlight on the phone and accept the invitation.

### Where each secret lives

| Secret | Lives in |
| -- | -- |
| The App Store Connect `.p8` | The Expo account, shared by every app |
| The Expo token | The Claude environment (`api.expo.dev`), once |
| `SUPABASE_DB_URL`, `OWNER_CODE` | Vercel (Sensitive) |
| The Google client secret | Supabase |
| The Apple key | Supabase |

None ever goes through the chat: the agent asks where it was put, never what it is.
Not secret: the Team ID, the Issuer ID and the Key ID (still kept out of commits), and the bundle id.

## How to check it

- `scripts/release.ts` ends with `Released x.y.z: tagged app-vx.y.z.`, and the Expo connector's `workflow_list` shows the run finished.
- The Expo connector's `build_list` shows the iOS build `finished`, and `build_info` shows it submitted.
- The build appears in App Store Connect → TestFlight within about 15 to 30 minutes, after Apple's processing.
- The person installs it with the TestFlight app and signs in with email.
