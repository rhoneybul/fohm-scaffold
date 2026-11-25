# Submit for review, from a Claude session

Takes: half an hour of the person's clicks once; each review after that a command, then Apple's review (usually a day or two).

**Why.** A build on TestFlight becomes an App Store release without anyone filling in App Store Connect's forms by hand: the listing, the screenshots, the price, the build and the submission all come from the repository and one command.

## What the agent does

- Writes the listing as data in `store.config.json` (EAS Metadata's file, pushed with `eas metadata:push`), from `src/lib/brand.ts` and `PRODUCT.md`: the name, a subtitle of up to 30 characters, the description, keywords of up to 100 characters with their commas, the categories, the support, marketing and privacy policy addresses (`https://<domain>/privacy`), the copyright (the year and `APP.operator`), the age rating answers (`advisory`) and the App Review contact (`review`).
  The generator fills what the answers know; every value still marked `TO FILL` is the agent's to write, and the review refuses to run until none is left.
  The language key (`en-US`) must be the app's primary language in App Store Connect (App Information); the review step says when it isn't.
- Takes the screenshots: `npx expo export --platform web`, then `npm run store:screens`, which signs up a member in demo mode and captures the screens in its `SHOTS` at the 6.9-inch iPhone's 1320×2868 and, while `ios.supportsTablet` is true, the 13-inch iPad's 2064×2752, into `store/apple/screenshot/`, and lists them in `store.config.json`.
  It reads each picture by eye before committing: no empty photo slot, nothing cut off, no real person's data.
- Starts the review with `npx tsx scripts/review.ts` (with `EXPO_TOKEN=proxy-injected NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt` in a Claude session, as for a release): a clean checkout of the commit runs the Expo workflow `.eas/workflows/review.yml` for the version last released.
  Its first job checks the listing and pushes it; its second runs `scripts/app-review.mjs` on Expo's servers, which sets the price to free in every territory (from `BASE_TERRITORY`, GBR by default) and availability everywhere unless either is set already, creates or picks the App Store version, puts the newest processed build of that version on it (waiting while Apple processes it), answers export compliance and content rights (`THIRD_PARTY_CONTENT` in the workflow), and checks the listing reached Apple.
  Without `--submit` it stops there and says what it would send; `npx tsx scripts/review.ts --submit` sends it to Apple's review.
  Every step reads before it writes, so running it again changes nothing.
- The Apple key never comes into the session: the agent never reads it from Expo, never asks for it, and never prints it. It lives on the Expo account, and only the workflow's jobs on Expo's servers see it.
- Watches the run with the Expo connector (`workflow_info`, `workflow_logs`); when the step stops, its log names what Apple still needs, in plain words, and the agent tells the person which click it is.
- Writes the App Privacy answers below for this app, from `privacy()` in `src/lib/legal.ts` and the integrations switched on.

## What is the person's

- **An App Store Connect API key with the Admin role** (setting prices and submitting need more than the key EAS uses to build): App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → + → a name (`Expo review`) and Access **Admin** → Generate.
  Note the Issuer ID (above the list) and the Key ID (in the key's row), and Download the `.p8`: Apple lets it download only once.
- **The key on the Expo account**, once for every app: expo.dev → the account → Settings → Environment variables → Add variables, each with scope the account, environment **production** and visibility **Secret**:
  - `EXPO_ASC_API_KEY_PATH`: type **File**, the `.p8` uploaded;
  - `EXPO_ASC_KEY_ID`: the Key ID;
  - `EXPO_ASC_ISSUER_ID`: the Issuer ID.
  Then delete the `.p8` from the computer's Downloads, or keep it in a password manager; never in the chat or a repository.
- **The App Review contact's phone number** and name, which the agent puts in `review` in `store.config.json` (not secret; Apple calls it only about the review).
- **App Privacy**, once (Apple has no API for it): App Store Connect → the app → App Privacy → Get Started → "Yes, we collect data from this app", then tick and answer:
  - Contact Info → **Email Address** and **Name**: App Functionality; linked to the user; not used for tracking.
  - Identifiers → **User ID**: App Functionality, and Analytics while PostHog is on; linked; not tracking.
  - User Content → **Photos or Videos** (the profile photo, clips to the coach), **Audio Data** (voice notes, where the app has them) and **Other User Content** (messages, notes, check-ins): App Functionality; linked; not tracking.
  - Health and Fitness → **Fitness** (training logs and sessions done, where the app has them): App Functionality; linked; not tracking.
  - Usage Data → **Product Interaction**: Analytics, only while PostHog is on; linked; not tracking.
  - Diagnostics → **Crash Data** and **Performance Data**: App Functionality, only while Sentry is on; not linked unless the app sends Sentry the account; not tracking.
  - Purchases only once the app sells in-app purchases. Then Publish.
  No data type is used for tracking: the app never shares data with data brokers or for others' advertising.
- **Sign in with Apple and account deletion** (guideline 5.1.1(v)): an app that offers Sign in with Apple is expected to revoke the account's Apple token when the account is deleted.
  The template doesn't yet (the app's `docs/SIGN-IN.md`, Open items): it needs a Sign in with Apple key (developer.apple.com → Certificates, Identifiers and Profiles → Keys → +, Sign in with Apple, for the App ID; the `.p8` kept as a server secret in Vercel, never in the chat), the app sending Apple's `authorizationCode` at sign-in for the server to trade for a refresh token (`https://appleid.apple.com/auth/token`), and `DELETE /api/accounts` calling `https://appleid.apple.com/auth/revoke` with it.
  Until then, if App Review asks, the answer is that deleting the account deletes everything, and Settings → Apple ID → Sign in with Apple stops the app's use of it.
- **Agreements**: App Store Connect → Business: the Free Apps agreement is accepted with the account; the **Paid Apps agreement**, with its tax and bank forms, only once in-app purchases are sold.
- Press **Release this version** after approval: the listing asks for a manual release (`release.automaticRelease: false`), so the owner chooses the day.

## How to check it

- `node scripts/app-review.mjs --listing --version <x.y.z>` locally prints `store.config.json is ready` (it needs no key; revert the version it writes).
- `npx tsx scripts/review.ts --dry-run` prints the version it would review.
- The workflow's log ends `Would submit <App> <x.y.z> (build <n>)`, or `Review: submitted`; the Expo connector's `workflow_info` shows it finished.
- App Store Connect → the app → the version reads **Waiting for Review**; the Expo connector's `appstore_reviews` later reads what people say.
