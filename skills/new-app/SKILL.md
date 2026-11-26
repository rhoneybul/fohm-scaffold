---
name: new-app
description: Make a new app with fohm-scaffold and take it from an idea to live, in the house style shared with Naz and Etapa. Use when the person wants a new app, to prototype or scaffold an app, to start an app or a coaching or programs app for a business, or asks what to do next on an app made with fohm-scaffold.
---

# Make a new app

The front door. One ordered playbook: discover, research, prototype, create, design, build, launch, and port back.
Detail lives in `reference/`; the design and the launch have skills of their own (`app-design`, `app-launch`).

The fundamentals, on every step:

- **A prototype before any code**: the owner taps through their app, end to end in Claude Design, and approves it before anything is created ([reference/prototype.md](reference/prototype.md)).
- **One house style**, Naz's and Etapa's, and **the kit only**: never a one-off style.
- **Naz and Etapa first**: borrow before building ([reference/borrow.md](reference/borrow.md)).
- **Every member action reaches the owner's dashboard** (`ADMIN_SEES`; the typecheck fails until it does).
- **Integrations are off until their keys are set**, and secrets never go through the chat.
- **Photos everywhere**: personal, real, credited (the app-design skill's `reference/photos.md`).
- **A fresh review before every preview**, and a preview to the owner after every feature.
- **Port back** what every app could use ([reference/port-back.md](reference/port-back.md)).

The strategy and why it works: [reference/strategy.md](reference/strategy.md).
What the earlier apps taught: [reference/lessons.md](reference/lessons.md).

## 1. Discover: ask once

Ask these in one message, the idea first, and take any the person has already answered:

1. The idea, in a sentence: what it does, and for whom.
2. What it doesn't do: the things people will expect or ask for that it leaves out, for now or for good.
3. The business behind it, and what it already sells.
4. A name, if they have one they're sure of.
5. The kind: a coaching progression (the default), a plain app, or a game.
6. A real coach, or programs with nobody behind them (then no coach is ever shown, and the app speaks as itself).
7. The apps they like the look and feel of (and any they don't): the design references.
8. What members are called, and the person who runs it.
9. The operator (person or company), the country, and, if it's registered, its registration number and registered office address.
10. The support email.
11. The domain, if they have one.

What it doesn't do is kept as said: the prototype draws nothing for it, and it goes into `PRODUCT.md`'s out of scope.

**Then the name, before anything carries it.**
Unless they're sure of one, run a naming round: ask the direction and what they dislike, 12 to 15 candidates across three styles, each checked for domains, store clashes and trade marks, shown on a decision page; the owner picks or asks for another round.
The bundle id, the Expo slug and the domain come from the chosen name, and the App Store record waits for it.
A placeholder is never settled on silently: it goes on the checklist as **Name not final**. [reference/naming.md](reference/naming.md).

Then publish the person's checklist (the `app-launch` skill, step 1): the domain, the business and the store accounts take days, so they start today.

## 2. Research, before anything is drawn

With web search: the categories next door, the incumbent, the insight, bottom-up sizing from the owner's own audience; a source for every number, none invented.
The app doesn't exist yet, so write it in the headings of the template's `docs/RESEARCH.md` in the working folder; it becomes the app's `docs/RESEARCH.md` at step 4.
Its open questions go to the owner with the prototype, not before it. [reference/research.md](reference/research.md).

## 3. Prototype it, end to end, in Claude Design

The first thing the owner sees is their app, not the template with a new name.
Go away and do the work: the business's own site, the owner's references from Mobbin, the house style, real photos; then make a high-fidelity, clickable prototype on a Claude Design canvas (the artifact tools' **Design** type, `create_from_type`; never a plain page), every photo downloaded and uploaded to the canvas, since it shows nothing linked from the web.
Every screen a member meets, joined so Play walks the whole journey (landing, sign-in, onboarding, Home on day one and three weeks in, a session start to done, a check-in, a goal, the coach or the paywall, Account), and the owner's dashboard, in the house style and the business's words.
A fresh review, then the owner gets the link that plays it, with the decisions taken (the kind, the navigation, the accent) and the open questions.
Revise the same canvas until they say build it. [reference/prototype.md](reference/prototype.md).

**Nothing is created until the owner approves the prototype.**
An app already made by hand without one gets one now, before any design or feature work.

## 4. Create it

With the flags the approved prototype settled:

```bash
npx github:rhoneybul/fohm-scaffold new <folder> --name "<Name>" --idea "<idea>" --business "<business>" \
  --kind coaching|app|game --coach yes|no --inspiration "<apps>" --member-word <word> --owner-word <word> \
  --operator "<legal name>" --country <country> --registration "<number>" --address "<office>" \
  --support-email <email> --domain <domain> --bundle-id <id> --accent "#hex" --json
```

It copies the template, fills in the values, writes the workflows, runs `npm install`, and never prompts without a terminal.
Outside a git repository it makes a repository of its own; inside one, the app is a folder of it, its workflows at the repository's root scoped to the folder (`--in-repo no` to refuse).
In this repository, `node bin/fohm-scaffold.mjs new ...` does the same.
Then the research becomes `docs/RESEARCH.md` (its template line deleted), and the prototype's link and the date it was approved go in `DESIGN.md` under *Prototype*.

## 5. GitHub

- A repository of its own: create it **private** with the GitHub tools (ask whether it goes under an organisation), then `git remote add origin <url> && git push -u origin main`.
- In-repo: commit the folder and its workflows on a branch and open a pull request.
- From here on every change ships through a pull request: branch, push, open the PR at once, rebase and merge when green ([reference/borrow.md](reference/borrow.md), *Workflows*).

The app-launch skill's `reference/github.md` has the rest.

## 6. The product brief

Fill in `PRODUCT.md` with the owner: who uses it, the one job, who runs it, how you'll know it works, the rule that keeps it honest.
A coaching app also gets the coach's own method in `src/lib/progression.ts`, and its onboarding's steps there (`ONBOARDING`).
Every coaching app gets Naz's onboarding: the opening with the app's key value as a question, straight questions one to a screen with the dots and Skip, what they're here for, why it works from the research, a first number, the week they can give, and the end, where a programs app starts the member's program from the answers.
Write its steps from the prototype's onboarding, the product and the research, never invented numbers: the template's `docs/ONBOARDING.md` → Writing an app's steps.
[reference/research.md](reference/research.md).

## 7. Catalogues, with photos

Research the goals members train for (places, events, trips: Naz's spots, Strawberry Fields' tours) and the real courses that prepare for them.
Every fact sourced, open-licence photos only, written to `research/<name>.json`, generated into typed data with `npx tsx scripts/research.ts <name>` (`tests/research.test.ts` fails on drift).
Saves, the goal on Home and a to-do list follow.
[reference/research.md](reference/research.md); programs dated to a goal: [reference/programs.md](reference/programs.md).

## 8. Design

Hand to the `app-design` skill to build the approved prototype for real: the owner's references from Mobbin adopted within the house style, a direction contract whose STORY follows the prototype screen by screen, the kit only, photos, and a fresh review that compares the screens with the prototype.
The prototype already answered the three questions it would ask the owner.

## 9. Build features

For each feature, in order:

1. **Before building it, check [reference/borrow.md](reference/borrow.md)**: if Naz or Etapa has it, port theirs (generalised, no product names) rather than writing new code. Read their tests too.
2. A plan with a real design choice in it gets `/grilling` first; a fix or a small tweak goes straight to code.
   A new flow the prototype doesn't have is added to its canvas first, on a page of its own, and the owner sees it before it's built.
3. Build it with the kit; everything a member creates or does goes through `/api/data` and shows on the dashboard (`ADMIN_SEES`, Activity, the member's page; Needs you when the owner must act).
4. Its PostHog events in the same change, each catalogued with its why (`src/lib/events.ts`, `docs/ANALYTICS.md`; `tests/events.test.ts` holds them together). Never anything typed.
5. Its tests; `npm run typecheck` and the tests for what changed. CI runs the rest.
6. Its photos in every slot (the app-design skill's checklist).

The checklist for a new table, screens, demo mode and staying safe: [reference/building.md](reference/building.md).

## 10. Launch

Hand to the `app-launch` skill: Supabase, Vercel, the domain, the inbox, the owner's account, smoke tests, legal, then the integrations and the stores, each through its connector where there is one, with the person's part on the checklist page.

## 11. Preview after every feature

1. A fresh review first (the `app-design` skill's review loop, and `/code-review` for the code).
2. `npx expo export --platform web && npm run screens`: the main flow at 393×852, failing on a page error or a sideways scroll.
3. A share link to the pull request's preview: the Vercel connector's `get_access_to_vercel_url` (previews are behind Vercel Authentication; the link lasts 23 hours). With no database yet, demo mode makes the preview work anyway.
4. Send the owner the link and the screenshots, with a line on what changed.

## 12. Port back

Every PR body carries a `Template:` line: what to port to this repository's template (the files and the idea), or `Template: nothing to port`.
A daily task, *Port to the template*, opens one PR here for them. [reference/port-back.md](reference/port-back.md).

## At the end

The proposal, a pitch deck in the owner's brand, and the handover: [reference/handover.md](reference/handover.md).
