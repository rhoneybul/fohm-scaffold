# The prototype

**Why.** The owner decides from what they can tap through, not from a list of features or the template with a new name.
Scaffolding the template and showing it straight away showed the template, not their app.
So the first thing the owner sees is a prototype of **their** app, end to end, made in Claude Design (Anthropic's design canvas): every screen a member goes through and the dashboard the owner keeps up from, in the house style, in the business's own words, with real photos.
Nothing is created or built until they approve it.

## 1. Gather the material first

Take the time it needs: tell the person it's under way in a line, then do the work before drawing anything.

- The discovery answers and the research (the SKILL's step 2): who it's for, the one job, the insight, the numbers with their sources.
- What it doesn't do (discovery's second question): no screen, tab or button for any of it.
- The business's own site and channels, fetched: what it sells, its prices, its levels and programmes, its words, its photos.
- The owner's references from Mobbin (the app-design skill, step 1): the onboarding, home, progress and paywall screens of each app they like, and what to take from each.
- The house style (the app-design skill's `reference/house-style.md`) and the template's `DESIGN.md` and `src/lib/theme.ts`: the faces, the tokens and the kit's components, so the build can match the prototype screen for screen.
- What Naz and Etapa already have for any screen here ([borrow.md](borrow.md)), and the earlier prototypes in the account (the artifact tools' `list_artifacts` with type `Design`): the finish expected.
- Open-licence photos for every slot, each with its credit (the app-design skill's `reference/photos.md`), downloaded, not just linked: the canvas shows only photos uploaded to it (*Photos on the canvas* below).

Then decide, from the answers and the references, what the owner would otherwise be asked: the kind of app, the navigation (a tab bar and its tabs, or a hub), and the accent (from their logo or site).
Each decision goes on the canvas's brief and in the message to the owner, so they can change it.

## 2. Make it in Claude Design

The prototype is a **Claude Design canvas** (the artifact tools' **Design** type), never a plain HTML page, a web artifact or a mock drawn another way: only a canvas lets the owner play the flow, comment artboard by artboard, and hand it to the build.

- **claude.ai chat**: `list_types`, then `create_from_type` with the **Design** type, titled "<Name> prototype".
- **Claude Code (cloud or laptop)**: the Artifact tool's `quickstart` with intent `design` (or `list` with scope `types`), then publish with the Design type's `type_url`, a `title` of "<Name> prototype" and no files.

Either way, follow the instructions the new canvas returns: artboards are `.dc.html` files under `project/`, indexed by `project/canvas.json`.
One canvas for the app; every round revises it, never a new one.
Only with no artifact tools at all: write the brief below to `prototype.md` and ask the person to start a high-fidelity prototype in Claude Design on claude.ai with it, and send back the link.
Never fall back to a page of your own and call it the prototype.

### Photos on the canvas

The canvas loads nothing from the web but Google Fonts: an `<img>` pointing at Wikimedia, Flickr or the business's site draws blank.
So every photo goes in like this, before the artboard that shows it:

1. Download the file into the session (the scratchpad).
2. Upload it to the canvas as an asset: the Artifact tool's publish with the canvas's `url`, the file and `asset: true` (`upload_asset` in claude.ai).
3. Put the `/_blob/<id>` url the reply gives, verbatim, in the artboard's `<img src>`, with the credit in the card.

If a download is refused because the session's network doesn't allow the host, **stop and tell the person which hosts to allow** (`upload.wikimedia.org`, `commons.wikimedia.org`, `live.staticflickr.com`, and the business's own site), never draw grey placeholders and carry on.
In a cloud session that's the environment's allowed hosts (the environment tools propose the change); in claude.ai chat, the person can upload the photos into the chat instead.
The prototype reaches the owner with a photo in every slot: a placeholder is a finding.

Lay the canvas out in rows, each under a title note:

- **The member, in the app**: one artboard a screen at 390×844, left to right in the order a member meets them, joined by links so Play walks the whole journey. The first is `Main.dc.html`, marked `is_interactive`, so `<link>#play-Main` taps through from the first screen to a week in.
- **The owner, in the dashboard**: People with what needs them on top, a member's page, Overview, and Needs you, as pages 1280 wide (`expand: fill`).
- **The landing page** as a page 1280 wide, led by a photo.
- **A brief note**: what the app is, the decisions taken, and the open questions.

## 3. The journey, end to end

The screens the template will build, in this app's words:

1. The landing page, then signing in.
2. Onboarding as the template has it (Naz's): the opening with the app's key value as a question, straight questions one to a screen with the dots and Skip, what they're here for, why it works from the research, a first number, the week they can give, and the end, where a programs app starts the member's program.
3. Home on the first day, and Home three weeks in: the goal as the hero, the next thing to do.
4. The path or program, one session from start to done, and a check-in.
5. The catalogue: a goal with its photo and the courses for it, saved, on the to-do list.
6. With a real coach, a video or question to the coach and the reply; with Pro, the paywall.
7. Account, and the empty states.

A plain app: its one job from start to done in place of 3 to 5.
A game: the first play, a round, the score, and the way back in.
With routes: planning one on the map.

Every screen:

- Drawn in the house style from the kit's components and tokens, and held to the same checklist as a build (the app-design skill's `reference/review.md`).
- In the business's own words and numbers: a fact you don't have is a [placeholder] in brackets, never invented, and never lorem ipsum.
- Photos in every slot, credited.
- Real states: the first visit and a member three weeks in, an empty state, an error where one matters.

## 4. Review it, then send it

1. A fresh reviewer before the owner sees it, as for a build: a new agent with the canvas, the references, the house style and the checklist, asked where the prototype differs from them and where the journey breaks (a dead end, a screen Play can't reach), and every photo slot that's empty or not a `/_blob/` upload. Fix it, and look again.
2. The canvas starts private: the person shares it with the owner from the canvas (the agent can't change who sees it).
3. Send the owner the link that plays it (`<link>#play-Main`), with a line on each decision taken (the kind, the navigation, the accent) and the research's open questions.
4. The owner comments on the canvas or replies; revise the same canvas and send it again, round after round, until they say build it.

Nothing is created or built before they do: their approval is the gate to the SKILL's step 4.

## 5. Once it's approved

- `new`'s flags follow it: the kind, the coach, routes, the two roles' words, the accent and the reference apps.
- Its link goes in the app's `DESIGN.md` under *Prototype*, with the date it was approved.
- The app-design skill builds to it: the direction contract's STORY names the prototype's screen each screen follows, and every review compares the screenshots with it.
- Its words become the app's: onboarding's steps (`ONBOARDING`), the landing's lines, the empty states.
- The build reads its screens from the canvas itself (the artifact tools' `list_files` and `read_file`), or from Claude Design's handoff to Claude Code.
- A later flow it doesn't have is added to the same canvas, on a page of its own, and the owner sees it before it's built.
