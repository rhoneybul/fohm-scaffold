# Signing in

Members sign in with Sign in with Apple (the iPhone app), Continue with Google (the web, iPhone and Android) or an email and password, all on Supabase Auth.
Etapa's native Apple sign-in is the model; Google is native in the apps too, and a redirect on the web.

## How it works

- **Which buttons show** is `signInMethods` in `src/lib/signInWith.ts`, drawn by `src/components/sign-in-with.tsx` over the email form on `src/app/sign-in.tsx`.
  Apple first on an iPhone, then Google, then email.
  A button shows only where it works: Apple on iOS once `/api/health` reports `integrations.apple`; Google on the web once it reports `integrations.google`, and in the apps only with the client IDs in `APP.google` (`src/lib/brand.ts`) as well.
- **Apple** (`src/lib/nativeSignIn.native.tsx`): `expo-apple-authentication` asks for the full name and email with a random nonce, its SHA-256 to Apple (`sha256Hex`) and the nonce itself to Supabase's `signInWithIdToken({ provider: 'apple', token, nonce })`.
  Apple gives the name on the first sign-in only, so the account is made with it straight away (`signInWith` in `src/lib/store.tsx`).
- **Google in the apps**: `@react-native-google-signin/google-signin` (the original, free API) with `GoogleSignin.configure({ webClientId, iosClientId })`, then `signInWithIdToken({ provider: 'google', token: idToken })`.
  Supabase skips Google's nonce check (`external_google_skip_nonce_check`, which Set up app sets): the iOS SDK puts a nonce in the token that the app can't see.
- **Google on the web** stays Supabase's redirect (`signInWithGoogle` in `src/lib/backend.ts`).
- **A first sign-in** with a name (Apple's first time, Google's) makes a member's account at once; the owner is still whoever signs in with `OWNER_EMAIL` (`api/accounts.ts`).
  Without a name, the sign-in screen asks for it, as for email.
- **The server** says which providers are on: `/api/health` reads Supabase's `/auth/v1/settings` (`external.google`, `external.apple`) every five minutes.
- **Analytics**: `signed_in` (the app) and `signed_up` (the API, from Supabase's provider for the login) carry `method`: `apple`, `google` or `email` (`docs/ANALYTICS.md`).
- **Privacy**: `privacy()` in `src/lib/legal.ts` names Apple and Google as sign-in providers while each is on.

## Switching it on

1. **Apple**: `ios.usesAppleSignIn` is true in `app.json` and `expo-apple-authentication` is in its plugins, so the build carries the entitlement and EAS turns the capability on for the App ID.
   Set up app (`scripts/setup-app.mjs`) turns Supabase's Apple provider on with the bundle id as its client ID; native sign-in needs no secret.
2. **Google**: a Web client and an iOS client in the shared Google Cloud project (the app-launch skill's `reference/google.md`).
   Put their IDs in `APP.google` in `src/lib/brand.ts`; `app.config.js` writes the iOS URL scheme (the iOS client ID reversed) from it, and Set up app puts both IDs in Supabase's Google provider.
   The web client's secret goes into Supabase by hand, never the chat.
   Android needs an Android client too, with the signing key's SHA-1 from `eas credentials` once there's an Android build; the app still signs in with the web client's ID.
3. **A store build**: all three modules are native, so they reach the apps only with a release.
   An older build without them keeps email sign-in: each `require` is in a try, and its button doesn't show.

## Decisions

1. Apple is iOS only: `expo-apple-authentication`, Apple's own `AppleAuthenticationButton` (black, full width, the kit's button height and pill corners), scopes full name and email, a random nonce hashed with SHA-256 to Apple and raw to Supabase, and Apple's first-time name passed into the account's creation.
2. Google is native in the apps with `@react-native-google-signin/google-signin`'s original API; the client IDs are public and live in `APP.google`, empty in the template, and the iOS URL scheme comes from them in `app.config.js`, so `app.json` needs no hand edit.
3. Google on the web keeps Supabase's redirect.
4. A button shows only where it works (platform, `/api/health`, the client IDs, the module in the build); Apple first on iOS, then Google, then email, as Apple's guideline 4.8 and its HIG ask.
5. Every native module is required in a try, so an older build keeps email sign-in.
6. Revoking a Sign in with Apple account's token when it's deleted is not built yet: see Open items.
7. `signed_in` and `signed_up` carry `method`; the privacy policy names Apple and Google while each is on.
8. Set up app reads the Google client IDs from the environment, else from `APP.google`, and turns Apple on when `ios.usesAppleSignIn` is true, with no secret.
9. The SHA-256 of the nonce is plain code (`sha256Hex`), tested against Node's, so the hash the app sends is the one tested; the random bytes come from `expo-crypto`.

## Open items

- **Revoke Apple's token when an account is deleted.** Apple expects an app that offers Sign in with Apple to revoke the account's token when it's deleted (App Review guideline 5.1.1(v)).
  It needs a Sign in with Apple key (developer.apple.com → Keys, with Sign in with Apple, kept as a server secret), the app to send Apple's `authorizationCode` at sign-in so the server can trade it for a refresh token (`https://appleid.apple.com/auth/token`), and `DELETE /api/accounts` to call `https://appleid.apple.com/auth/revoke` with it before deleting.
  Until then, deleting an account removes everything on our side, and the person can stop using Apple ID with the app in their iPhone's Settings.
