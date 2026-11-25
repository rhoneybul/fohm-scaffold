# Push notifications (iOS and Android)

Optional.

**Why.** Replies and new messages reach people's phones.
Expo's push service needs no key; devices register from the iOS and Android apps (`src/lib/push.ts`, `sendPush` in `api/_lib/notify.ts`).
Notifications never fail the request that caused them.

## What the agent does

- `npx eas-cli init` (writes the project id the app needs into `app.json`), once the person is signed in to Expo ([eas.md](eas.md)).
- Sets `"android.googleServicesFile"` in `app.json` once `google-services.json` is in the app folder.

## What is the person's

- Android: create a Firebase project, add the Android app with the package id, download `google-services.json` into the app folder (or send it to the agent as a file, never pasted), and upload the FCM V1 service account key in expo.dev → project → Credentials.
- iOS: EAS sets up the push key at build time (answer yes to push notifications).
- Build, sign in on a real phone, allow notifications; reply from the dashboard and the phone should buzz.

## How to check it

- A reply from the dashboard reaches the phone; `push_devices` (or the account's devices on the dashboard's People) lists the phone.
