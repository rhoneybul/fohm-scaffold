# The iOS and Android apps (EAS)

**Why.** EAS builds them in the cloud: no Xcode or Android Studio needed.
The apps have no website of their own; they call the API at `expo.extra.apiUrl`.

## What the agent does

- Points the apps at the live API: in `app.json`, `extra.apiUrl` = `https://<domain>`, and `ios.bundleIdentifier` and `android.package` = the app's own id (not `com.example...`; `new --bundle-id` writes it).
- Once the person is signed in: `npx eas-cli init` (links the project; writes its id into `app.json`).
- `npm run build:android`: the `preview` profile makes an `.apk` to install from the link EAS gives.
- `npm run build:ios`: needs the Apple Developer account ([store-accounts.md](store-accounts.md)); EAS creates the certificates.
- Later releases raise `version` in `app.json`; web changes deploy on every push to main, app changes need a new build and submission.
- An iOS build to TestFlight goes through the template's Publish workflow, run from the session: [testflight.md](testflight.md).
- For a published app, borrow Naz's and Etapa's release machinery rather than building one: a publish workflow that bumps the version from tags, and over-the-air updates with a runbook (the new-app skill's `reference/borrow.md`, *Workflows*). Never build for the stores with a bare `eas build` once that exists.

## What is the person's

- Create an Expo account at expo.dev, and `npx eas-cli login` in a terminal (or an `EXPO_TOKEN` in the repository's secrets, set by them).
- Install the Android build on a real phone, and the iOS build through TestFlight.

## How to check it

- `node -e "const e=require('./app.json').expo;console.log(e.extra.apiUrl,e.ios.bundleIdentifier)"` shows the live https URL and the real id.
- `npx eas-cli build:list --limit 1` shows a finished build (or the Expo connector's `build_list`).
