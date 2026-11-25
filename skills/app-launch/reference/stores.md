# The App Store and Google Play

Takes: Apple's review, usually a day or two; Google's first, up to a week.

**Why.** People can then install it like any other app.

## What the agent does

- Writes the listings: descriptions, keywords, the privacy policy URL (`https://<domain>/privacy`), and the screenshots (`npm run screens`, at the stores' sizes).
- Writes Google Play's Data safety and Apple's App Privacy answers from `src/lib/legal.ts`.
- `npm run submit:ios` and `npm run submit:android` once the apps exist in the consoles.
- Reads reviews and crashes later (the Expo connector's `appstore_reviews`, `playstore_reviews`, `testflight_crashes`).

## What is the person's

- App Store Connect: create the app with the bundle id; add the screenshots, the privacy policy URL and a review account (a member login).
- Google Play Console: create the app; fill in Data safety. A new personal account runs its 14-day closed test with 12 testers first ([store-accounts.md](store-accounts.md)).
- Press submit where the console asks a human to.

## How to check it

- Both listings show "Ready for sale" or "Published"; `curl -sI https://apps.apple.com/app/id<app store id>` answers 200.
