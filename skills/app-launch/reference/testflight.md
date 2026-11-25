# TestFlight, entirely from a Claude session

Takes: an hour of the person's clicks once the Apple account is verified; each build about 20 minutes, then 15 to 30 minutes of Apple's processing.

**Why.** The owner and their testers get the real iPhone app on their phones, and every later build ships from the session with no Mac, no Xcode and no terminal on the person's side.

## What the agent does

- Waits for the name (the new-app skill's `reference/naming.md`: the App Store record carries it and can't be renamed freely); a name marked **Name not final** on the checklist blocks this.
- In `app.json`: `ios.bundleIdentifier` from the name (`com.<name>.app`), `expo.owner` set to the Expo account (or organisation) the token belongs to, and `ios.config.usesNonExemptEncryption: false`, the export compliance answer, so TestFlight never stops to ask.
- In `eas.json`: `submit.production.ios` with `appleTeamId` and, once the app exists in App Store Connect, `ascAppId` (its Apple ID, under App Information).
- Runs the template's **Publish** workflow (`.github/workflows/publish.yml`, borrowed from Naz's Publish App): with `EXPO_TOKEN` it links the project on the first run (`eas init --non-interactive --force`; the agent then puts the `projectId` it printed into `app.json` in a PR), bumps the version from the highest `app-v` tag on the runner, and runs `eas build --platform ios --profile production --auto-submit --non-interactive`, tagging the version when the build succeeds.
  It triggers it with the GitHub tools (`actions_run_trigger`, workflow `publish.yml`, inputs `release_type: build-submit`, `bump: patch`, `platform: ios`), or `gh workflow run publish.yml -f platform=ios`.
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
  Upload it to expo.dev → the project → Credentials → iOS → App Store Connect API Key: EAS then manages the certificates and profiles and submits.
- **`EXPO_TOKEN`**: expo.dev → Account settings → Access tokens (a robot user with access to the project is better), saved as a GitHub Actions secret on the repository: Settings → Secrets and variables → Actions → New repository secret. Never in the chat.
- **Google OAuth**, when Google and Apple go in together: Google Cloud → a project → Google Auth Platform → Branding (the app's name, support email, privacy and terms URLs, authorised domains including `supabase.co`) → Audience External → Clients → a Web client with the redirect `https://<ref>.supabase.co/auth/v1/callback`.
  Its ID and secret go straight into Supabase → Authentication → Providers → Google.
- **Sign in with Apple**: the capability on the App ID, a Services ID, and a Sign in with Apple key, into Supabase → Authentication → Providers → Apple.
- Install TestFlight on the phone and accept the invitation.

### Where each secret lives

| Secret | Lives in |
| -- | -- |
| The App Store Connect `.p8` | Expo only |
| `EXPO_TOKEN` | A GitHub Actions secret |
| `SUPABASE_DB_URL`, `OWNER_CODE` | Vercel (Sensitive) |
| The Google client secret | Supabase |
| The Apple key | Supabase |

None ever goes through the chat: the agent asks where it was put, never what it is.
Not secret: the Team ID, the Issuer ID and the Key ID (still kept out of commits), and the bundle id.

## How to check it

- The Publish run is green: `gh run list --workflow publish.yml --limit 1`, or the GitHub tools' `actions_list`.
- The Expo connector's `build_list` shows the iOS build `finished`, and `build_info` shows it submitted.
- The build appears in App Store Connect → TestFlight within about 15 to 30 minutes, after Apple's processing.
- The person installs it with the TestFlight app and signs in with email.
