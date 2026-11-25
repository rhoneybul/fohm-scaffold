# Onboarding

Every coaching app made from this template opens on onboarding for a new member, after Naz's (`rhoneybul/naz`: `app/src/data/onboarding.js`, `app/src/screens/Onboarding.js`, `OnboardingGate` in `App.js`).
Strawberry Fields' is the worked example (`rhoneybul/strawberry-fields`, `app/docs/ONBOARDING.md`): it ends on a program building.

## What a member sees

1. **The opening**: a line to a screen under a photo (`APP.heroPhoto`), the app's key value first, as a question. Skip looks around; I already have an account signs in.
2. **Straight questions**, one to a screen: Back, the progress dots and Skip at the top, the button pinned at the foot. The level assessment's questions come first (`ASSESSMENT`).
3. **What they're here for**: a grid of a few words that shapes the rest. Here for none of the training, they land where they're here for (`landing`).
4. **Why it works**: what the training does, a row for each thing they chose, in the method's or the research's words.
5. **Their first number** (a `measure` step, where the app has a benchmark): a clock, then the count typed in.
6. **The commitment**: days a week and minutes, and the time that comes to.
7. **Notifications**, asked in context: only in the apps, only before the phone has answered; elsewhere the step passes by itself.
8. **The end**: what they get from their answers, and the way in. Signed out, it asks for an account first.

Each step is its own address (`/onboarding?step=`), so the phone's back gesture steps back.

## How it's built

- `src/lib/onboarding.ts`: the engine, shared by every app. Which steps the answers take (`stepsFor`, `when`), the dots, what analytics hears (`answerProperties`: ids and enums only), who's asked (`asksAtOpen`), and answers waiting for an account (`freshWaiting`, a day).
- `ONBOARDING` in `src/lib/progression.ts`: the app's own steps, its why rows, its end, where a member here for none of the training goes (`landing`), and what the answers set on the account (`profile`: the level, the goal).
- `src/app/onboarding.tsx`: draws each kind of step from the kit (`hello`, `choice`, `multi`, `grid`, `why`, `date`, `measure`, `commit`, `notify`, `text`, `ready`).
- `src/lib/onboardingKept.ts`: what the device keeps (that it was asked, and answers given signed out).
- `src/app/index.tsx`: who's asked at open, and answers given signed out carried to the account after sign-up; Home asks too, so a member never skips past it.
- `accounts.onboarding`: the answers as given, when it was opened and finished, and how they left. A member-only profile field, in `ADMIN_SEES`, on the member's page (each question and its answer) and in Activity (Finished onboarding). Reset onboarding on the member's page clears it with the level.
- Your account → Walk me through again opens it from the start with the answers kept.

## Who's asked

A member with no program who hasn't opened it on their account, signed in or not; signed out, once a device. Never the owner or a coach.
Opening it at all counts as asked: leaving any way is never asked again.
An app with programs passes whether the member has one (`hasProgram` in `index.tsx` and `home.tsx`).
On the web, the landing page stays at `/`, and its Get started opens onboarding; in the apps, the first open is onboarding and sign-in after it.

## Writing an app's steps

- **Start from the product.** The opening's first line is the app's key value as a question ("Want to reach the top with legs left for the descent?"). Then ask only what the end needs: for a programs app, every question its program builder takes, so the end can start one.
- **One question to a screen**, answers as rows with a line each, and a default for every question a member skips.
- **What they're here for** in four to six words, the training first, then the parts of the app that need none, each with its `landing`.
- **Why it works from the research, never invented.** A number only where a source gives it, each row naming its principle, and a test holding the number to the research (Strawberry Fields' `WHY_ROWS`).
- **A first number** where the app has a benchmark a member can do there and then, safely, in minutes.
- **Safety copy** goes in a step's `note` and the end's `note`.
- **Analytics**: a choice of the app's own ids is sent; a step whose ids say too much sends an enum instead (`count`: Strawberry Fields sends a tour as `tour`, never which). A date, a number measured and anything typed send only that they were answered.
- **The end**: `ready` says what they get in their own numbers; its action saves the answers and goes to `end` (default `/home`). An app with programs starts one from the answers instead and opens it building (Strawberry Fields' `startBuild` in `src/app/onboarding.tsx`), and its program walkthrough starts from the answers.
- **Step ids are stored**: change the words freely, never rename an id that's in use.
- `tests/onboarding.test.ts` holds the engine and the steps; extend it with the app's own.

## Events

`onboarding_step_seen`, `onboarding_step_answered`, `onboarding_skipped`, `onboarding_finished` and `onboarding_left` (`src/lib/events.ts`, `docs/ANALYTICS.md`): the funnel is `onboarding_step_seen` by `position`, then `onboarding_finished` with `how` = `build`.
