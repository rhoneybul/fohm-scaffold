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

## 1. Discover: a live chat that leads to the prototype

A conversation, not a form: one or two questions a turn, each the most important thing their answers so far leave open, until the brief holds everything the prototype, `new` and the launch need. [reference/discovery.md](reference/discovery.md).

**From the app builder?** A submission's `brief.json` link, or an app already made from one (`docs/BRIEF.md`), has the first part answered: take its answers as said and ask only its *Still to ask me* rows (discovery.md, *Starting from the app builder*).

- **A heads-up first**: about twelve questions in three parts (the idea, how it works, how it looks and the practical bits), with where they are on every turn.
- **The brief** is 28 rows, from the idea to the app id, each mapped to where it goes (a flag of `new`, `PRODUCT.md`, onboarding, the catalogue, `DESIGN.md`); each ends *said*, *decided* (yours, confirmed) or *later*.
- **Read before you ask**: their website or socials fill what they say, confirmed in a line.
- **What it doesn't do** comes straight after the idea: the things people will expect or ask for that it leaves out, for now or for good. It's kept as said: the prototype draws nothing for it, and it goes into `PRODUCT.md`'s out of scope.
- **The workflow** comes early: "describe what someone does in the app, from opening it the first time to getting what they came for"; "I don't know, help me figure it out" gets two or three drafted workflows to pick from; its gaps are asked one a turn.
- **The apps they like** are shown as their screens from Mobbin, images with their links, and they say what they like about each.
- **Decide what you can** and say it to confirm; skip what doesn't apply; show the brief every few turns.
- **The end**: the brief in `brief.md`, a summary with the workflow in full and one question, "Is this your app?"; a yes hands straight on to the name, the checklist, the research and the prototype, with no more questions.

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
Go away and do the work: the business's own site, the owner's references from Mobbin, the house style, real photos; then make a high-fidelity, clickable prototype on a Claude Design canvas (the artifact tools' **Design** type, `create_from_type`).
Its spine is the workflow in the brief from discovery, walked step by step in detail, a screen or more to each step, joined so Play goes through it from signing up to the result; around it the screens every app has (landing, sign-in, onboarding, Home on day one and three weeks in, the paywall, Account) and the owner's dashboard, in the house style and the business's words.
A fresh review, then the owner gets the link that plays it, with the decisions taken (the kind, the navigation, the colour scheme the owner picked from three or four suggested) and the open questions.
Revise the same canvas until they say build it. [reference/prototype.md](reference/prototype.md).

**Nothing is created until the owner approves the prototype.**
An app already made by hand without one gets one now, before any design or feature work.

## 4. Create it

With the flags the brief and the approved prototype settled (each row of `brief.md` names its flag):

```bash
npx github:rhoneybul/fohm-scaffold new <folder> --name "<Name>" --idea "<idea>" --business "<business>" \
  --kind coaching|app|game --coach yes|no --inspiration "<apps>" --member-word <word> --owner-word <word> \
  --operator "<legal name>" --country <country> --registration "<number>" --address "<office>" \
  --support-email <email> --domain <domain> --bundle-id <id> --scheme <id> [--accent "#hex"] --json
```

From the app builder, one flag does it: `new [<folder>] --from <brief.json link or file>` takes the brief's answers as the flags (any flag given beside it wins: the operator, the domain, the app id the chat settled) and keeps the brief as `docs/BRIEF.md`.

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

Fill in `PRODUCT.md` from the brief, and with the owner where it's thin: who uses it, the one job (the workflow from discovery), who runs it, how you'll know it works, the rule that keeps it honest.
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
