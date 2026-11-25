# The App Store and Google Play

Takes: Apple's review, usually a day or two; Google's first, up to a week.

**Why.** People can then install it like any other app.

## What the agent does

- The App Store: the listing as data in `store.config.json`, the screenshots from `npm run store:screens`, and the submission through the Expo workflow `.eas/workflows/review.yml`, started with `npx tsx scripts/review.ts`: [app-review.md](app-review.md).
- Google Play: writes the listing (descriptions, the privacy policy URL `https://<domain>/privacy`, screenshots) and the Data safety answers from `src/lib/legal.ts`.
- Writes Apple's App Privacy answers from `src/lib/legal.ts` ([app-review.md](app-review.md) lists them).
- Reads reviews and crashes later (the Expo connector's `appstore_reviews`, `playstore_reviews`, `testflight_crashes`).

## What is the person's

- App Store Connect: create the app with the bundle id; the key, App Privacy and the review contact as [app-review.md](app-review.md) says; everything else comes from the repository.
- Google Play Console: create the app; fill in Data safety. A new personal account runs its 14-day closed test with 12 testers first ([store-accounts.md](store-accounts.md)).
- Press submit where the console asks a human to.

## How to check it

- Both listings show "Ready for sale" or "Published"; `curl -sI https://apps.apple.com/app/id<app store id>` answers 200.
