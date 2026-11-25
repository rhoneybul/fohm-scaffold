# Continue with Google

Optional; off until Supabase's Google provider is on.
Takes: about 20 minutes once for every app (the shared project and its consent screen), then about 5 minutes per app.

**Why.** One tap to sign up.
Google has no public API for the consent screen or for OAuth clients, so this is the one setup that stays in the person's hands; the agent guides it step by step and does everything around it.

## How it is shared

- **One Google Cloud project for every app** (for example "Fohm sign-in"), with one consent screen in the business's name, logo, privacy and terms: set up and verified once.
  Every app's sign-in then says "Continue to Fohm" rather than the app's own name, which is the price of doing it once.
- **Each app gets its own clients in that project:** a Web client (the web app, Supabase's callback, and the ID the iOS and Android apps sign in with) and an iOS client for the iPhone app's native sign-in; an Android client once there's an Android build.
- Their IDs aren't secret, so the person tells the agent and it puts them in `APP.google` in `src/lib/brand.ts` (`webClientId`, `iosClientId`), which the apps read and `app.config.js` writes the iOS URL scheme from, and Set up app puts them in Supabase (from `APP.google`, or `GOOGLE_WEB_CLIENT_ID` and `GOOGLE_IOS_CLIENT_ID`).
  The web client's secret is pasted by the person straight into Supabase (Authentication → Sign In / Providers → Google), never into the chat.
- The template signs in with Google natively in the iOS and Android apps and with Sign in with Apple on the iPhone, together, as Apple's guideline 4.8 requires ([testflight.md](testflight.md), the app's `docs/SIGN-IN.md`).
  Until `APP.google` has the IDs, the apps show no Google button; the web's redirect needs only Supabase's Google provider.

## What the agent does

- Walks the person through the steps below one at a time, in the checklist page and in the chat, with the app's values filled in: `<domain>`, `<project ref>`, `<bundle id>`.
- After each step, asks only what isn't secret (a client ID, "done"), checks it, and carries on.
- With the client IDs: writes them into `APP.google` in `src/lib/brand.ts` and runs Set up app, which turns the Google provider on in Supabase with both IDs (the secret already pasted there is kept).
  `npx expo config --type prebuild` then shows the iOS URL scheme (`com.googleusercontent.apps.<id>`) in `CFBundleURLTypes`; the apps get Google with the next store build.
- Adds the app's domain to the consent screen's list by telling the person the exact value (the list is the consent screen's, so it can't be done from here).

## What is the person's

### Once, for every app

1. console.cloud.google.com → the project picker → **New project**, named for the business ("Fohm sign-in"), no organisation needed.
2. **Google Auth Platform** → Get started → **Branding**:
   - App name: the business's name; user support email: the support address; logo: the business's mark (120 px square PNG).
   - App domain: the business's home page, privacy policy and terms (one app's pages are fine to start with).
   - Authorised domains: `supabase.co`, plus each app's domain as it gets one.
   - Developer contact: the support address.
3. **Audience** → External → **Publish app** (in production; with openid, email and profile only, Google doesn't ask for verification beyond the branding check).
4. **Data access** → Add or remove scopes → only `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`.

### For each app

1. **Clients** → Create client → **Web application**, named for the app:
   - Authorised JavaScript origins: `https://<domain>` (and the `vercel.app` address while there's no domain).
   - Authorised redirect URI: `https://<project ref>.supabase.co/auth/v1/callback`.
   - Create, then copy the **Client secret** straight into Supabase → Authentication → Sign In / Providers → Google (Client Secret), and tell the agent the **Client ID**.
2. **Clients** → Create client → **iOS**, bundle ID `<bundle id>`; tell the agent its Client ID.
3. Once there's an Android build: **Clients** → Create client → **Android**, package name `<bundle id>` and the SHA-1 of the app's signing key (the agent reads it from `eas credentials -p android`, or Expo's credentials page; for a Play release, also the SHA-1 of Play's app signing key, from Play Console → Test and release → App integrity).
   Nothing to tell the agent: the Android app signs in with the web client's ID, and Google matches the package and key.
4. Branding → Authorised domains: add `<domain>` once the app has one.

## How to check it

- `curl -s https://<domain>/api/health | jq .integrations.google` is `true`.
- Supabase's auth config (management API `GET /v1/projects/<ref>/config/auth`) shows `external_google_enabled: true` with the client IDs.
- The web sign-in page shows Continue with Google, and a sign-in round-trips back to the app signed in.
- In a TestFlight build, the sign-in screen shows Sign in with Apple, then Continue with Google; each signs in (a first time makes the account with the name given).
