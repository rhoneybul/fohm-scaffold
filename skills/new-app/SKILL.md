---
name: new-app
description: Make a new app with fohm-scaffold and take it from an idea to live, in the house style shared with Naz and Etapa. Use when the person wants a new app, to scaffold an app, to start an app or a coaching or programs app for a business, or asks what to do next on an app made with fohm-scaffold.
---

# Make a new app

The front door. One ordered playbook: discover, create, research, design, build, launch, and port back.
Detail lives in `reference/`; the design and the launch have skills of their own (`app-design`, `app-launch`).

The fundamentals, on every step:

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
2. The business behind it, and what it already sells.
3. A name. None yet? Propose five to ten short, sayable names and check each: `curl -s -o /dev/null -w '%{http_code}' https://rdap.org/domain/<name>.com` (404 is free; try `.app` and `.co` too). When RDAP is blocked, check with Vercel's `get_bulk_availability`. Check the GitHub name too.
4. The kind: a coaching progression (the default), a plain app, or a game.
5. A real coach, or programs with nobody behind them (then no coach is ever shown, and the app speaks as itself).
6. The apps they like the look and feel of (and any they don't): the design references.
7. What members are called, and the person who runs it.
8. The operator (person or company), the country, and, if it's registered, its registration number and registered office address.
9. The support email.
10. The domain, if they have one.

Then publish the person's checklist (the `app-launch` skill, step 1): the domain, the business and the store accounts take days, so they start today.

## 2. Create it

```bash
npx github:rhoneybul/fohm-scaffold new <folder> --name "<Name>" --idea "<idea>" --business "<business>" \
  --kind coaching|app|game --coach yes|no --inspiration "<apps>" --member-word <word> --owner-word <word> \
  --operator "<legal name>" --country <country> --registration "<number>" --address "<office>" \
  --support-email <email> --domain <domain> --bundle-id <id> --accent "#hex" --json
```

It copies the template, fills in the values, writes the workflows, runs `npm install`, and never prompts without a terminal.
Outside a git repository it makes a repository of its own; inside one, the app is a folder of it, its workflows at the repository's root scoped to the folder (`--in-repo no` to refuse).
In this repository, `node bin/fohm-scaffold.mjs new ...` does the same.

## 3. GitHub

- A repository of its own: create it **private** with the GitHub tools (ask whether it goes under an organisation), then `git remote add origin <url> && git push -u origin main`.
- In-repo: commit the folder and its workflows on a branch and open a pull request.
- From here on every change ships through a pull request: branch, push, open the PR at once, rebase and merge when green ([reference/borrow.md](reference/borrow.md), *Workflows*).

The app-launch skill's `reference/github.md` has the rest.

## 4. Research

With web search, write `docs/RESEARCH.md`: the categories next door, the incumbent, the insight, bottom-up sizing from the owner's own audience; a source for every number, none invented.
Take its open questions to the owner. [reference/research.md](reference/research.md).

## 5. The product brief

Fill in `PRODUCT.md` with the owner: who uses it, the one job, who runs it, how you'll know it works, the rule that keeps it honest.
A coaching app also gets the coach's own method in `src/lib/progression.ts`.
[reference/research.md](reference/research.md).

## 6. Catalogues, with photos

Research the goals members train for (places, events, trips: Naz's spots, Strawberry Fields' tours) and the real courses that prepare for them.
Every fact sourced, open-licence photos only, written to `research/<name>.json`, generated into typed data with `npx tsx scripts/research.ts <name>` (`tests/research.test.ts` fails on drift).
Saves, the goal on Home and a to-do list follow.
[reference/research.md](reference/research.md); programs dated to a goal: [reference/programs.md](reference/programs.md).

## 7. Design

Hand to the `app-design` skill: the owner's references from Mobbin adopted within the house style, three questions to the owner, a direction contract, the kit only, photos, and a fresh review.

## 8. Build features

For each feature, in order:

1. **Before building it, check [reference/borrow.md](reference/borrow.md)**: if Naz or Etapa has it, port theirs (generalised, no product names) rather than writing new code. Read their tests too.
2. A plan with a real design choice in it gets `/grilling` first; a fix or a small tweak goes straight to code.
3. Build it with the kit; everything a member creates or does goes through `/api/data` and shows on the dashboard (`ADMIN_SEES`, Activity, the member's page; Needs you when the owner must act).
4. Its PostHog events in the same change, each catalogued with its why (`src/lib/events.ts`, `docs/ANALYTICS.md`; `tests/events.test.ts` holds them together). Never anything typed.
5. Its tests; `npm run typecheck` and the tests for what changed. CI runs the rest.
6. Its photos in every slot (the app-design skill's checklist).

The checklist for a new table, screens, demo mode and staying safe: [reference/building.md](reference/building.md).

## 9. Launch

Hand to the `app-launch` skill: Supabase, Vercel, the domain, the inbox, the owner's account, smoke tests, legal, then the integrations and the stores, each through its connector where there is one, with the person's part on the checklist page.

## 10. Preview after every feature

1. A fresh review first (the `app-design` skill's review loop, and `/code-review` for the code).
2. `npx expo export --platform web && npm run screens`: the main flow at 393×852, failing on a page error or a sideways scroll.
3. A share link to the pull request's preview: the Vercel connector's `get_access_to_vercel_url` (previews are behind Vercel Authentication; the link lasts 23 hours). With no database yet, demo mode makes the preview work anyway.
4. Send the owner the link and the screenshots, with a line on what changed.

## 11. Port back

Every PR body carries a `Template:` line: what to port to this repository's template (the files and the idea), or `Template: nothing to port`.
A daily task, *Port to the template*, opens one PR here for them. [reference/port-back.md](reference/port-back.md).

## At the end

The proposal, a pitch deck in the owner's brand, and the handover: [reference/handover.md](reference/handover.md).
