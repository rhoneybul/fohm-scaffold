# The prototype

**Why.** The owner decides from what they can tap through, not from a list of features or the template with a new name.
Scaffolding the template and showing it straight away showed the template, not their app.
So the first thing the owner sees is a prototype of **their** app, end to end, made in Claude Design (Anthropic's design canvas): every screen a member goes through and the dashboard the owner keeps up from, in the house style, in the business's own words, with real photos.
Nothing is created or built until they approve it.

## 1. Gather the material first

Take the time it needs: tell the person it's under way in a line, then do the work before drawing anything.

- From the app builder, the prototype the owner already tapped through (the brief's *The prototype*, and its link): the first draft, screen for screen; the canvas starts from it and builds out (the workflow in full, sign-in, the paywall, Account), never starts again from the template.
- The brief from the discovery chat (`brief.md`, [discovery.md](discovery.md)) and the research (the SKILL's step 2): who it's for, the workflow they confirmed, the insight, the numbers with their sources.
- What it doesn't do (the brief's second row): no screen, tab or button for any of it.
- The business's own site and channels, fetched: what it sells, its prices, its levels and programmes, its words, its photos.
- The owner's references from Mobbin, the screens they were shown in discovery, and what they said they like about each: that, not the app's name, is what each screen takes.
- The house style (the app-design skill's `reference/house-style.md`) and the template's `DESIGN.md` and `src/lib/theme.ts`: the faces, the tokens and the kit's components, so the build can match the prototype screen for screen.
- What Naz and Etapa already have for any screen here ([borrow.md](borrow.md)), and the earlier prototypes in the account (the artifact tools' `list_artifacts` with type `Design`): the finish expected.
- Open-licence photos for every slot, each with its credit (the app-design skill's `reference/photos.md`).

Then decide, from the answers and the references, what the owner would otherwise be asked: the kind of app, the navigation (a tab bar and its tabs, or a hub), and the colour scheme: three or four whole palettes suggested from their logo or site, what the app is about and the apps they like (`fohm-scaffold schemes`), shown to the owner on a decision page to pick the one they like most (the app-design skill's `reference/colour.md`); draw the prototype in the one they pick, or in the strongest while they decide.
Each decision goes on the canvas's brief and in the message to the owner, so they can change it.

## 1a. The logo, with options, before a screen is drawn

The prototype is the app with its own mark, never the template's placeholder ring and dot or the name set in type.
So the logo round (the app-design skill's `reference/logo.md`) runs here, once the name is chosen and before the first artboard:

- With the owner's artwork, it's traced: one option, theirs, and the other options are only the lockups (the mark beside the name, the name under it) and the icon's ground.
- Without it, three or four concepts, each a different idea about the product (a place, a motion, a letterform, an object), on the 512 grid, in the picked scheme's ink and accent; the `logo-designer` skill if it's there.
- Each concept on one sheet at 1024, 180, 58 and 29 px and a 32 px favicon, on light and dark, judged at 29 px first: `npx tsx scripts/brand-assets.ts --sheet concepts.png concepts/*.svg` in a scaffold's `template/`, or drawn on the canvas.
- Shown on a decision page (an Artifact) beside the colour schemes, with each concept's idea in a line and the one you'd pick; the owner picks one or asks for another round.
- The one they pick is refined once more (fewer, thicker strokes for 29 px; centred by weight), and kept as SVG with the brief: the mark alone, the lockup, and the app icon on the scheme's ink.
- While the owner decides, draw with the one you'd pick, and swap it on every artboard once they choose.

## 1b. The mark throughout

Wherever the app or the dashboard says whose it is, it's the chosen mark, in one colour, the same shape at every size:

- The app icon on a phone's home screen, beside other apps, and the launch screen: the mark in white on the ink, then throbbing as it loads.
- The landing page's header (the lockup), its footer, and the favicon in the browser tab drawn above it.
- Sign-in and the opening of onboarding (the lockup over the first screen).
- Every loading state: the mark throbbing, never a spinner.
- The dashboard's sidebar (the lockup over the pages) and its sign-in.
- The emails (the welcome and the sign-in link) and the share card, where the app has them.

Never a second logo, a different mark on another screen, or the name typed where the lockup belongs.

## 2. Make it in Claude Design

With the artifact tools: `list_types`, then `create_from_type` with the **Design** type, titled "<Name> prototype", and follow the instructions it returns.
One canvas for the app; every round revises it, never a new one.
Without the artifact tools (Claude Code on a laptop): write the brief below to `prototype.md` and ask the person to start a high-fidelity prototype in Claude Design on claude.ai with it, and send back the link.

Lay the canvas out in rows, each under a title note:

- **The member, in the app**: one artboard a screen at 390×844, left to right in the order a member meets them, joined by links so Play walks the whole journey. The first is `Main.dc.html`, marked `is_interactive`, so `<link>#play-Main` taps through from the first screen to a week in.
- **The owner, in the dashboard**: People with what needs them on top, a member's page, Overview, and Needs you, as pages 1280 wide (`expand: fill`).
- **The landing page** as a page 1280 wide, led by a photo.
- **The brand**: the concepts as they were shown, the chosen mark refined, the lockup, the app icon on a home screen and the launch screen.
- **A brief note**: what the app is, the decisions taken, and the open questions.

## 3. The workflow, step by step

The prototype walks the owner's workflow from discovery, in detail: the steps they confirmed, in their order and their words.

- Each step gets the screens it really takes, not a summary: "they get a program" is the program's overview, its first week, a session's page, the session played start to done, and what they see after it.
- Show the step as it is the first time and as it is once it's routine: the first session and the tenth, Home on day one and three weeks in.
- Where the workflow promises a result (a 2k time that drops, a first song played through), draw the screen where they see it, with a believable number in brackets.
- Where it has a decision or a fork (missed a week, finished the program, asked the coach), draw what happens next.
- Every step's screen is linked to the next, so Play goes through the whole workflow without a dead end.

Around it, the screens every app has, in this app's words:

1. The landing page, then signing in.
2. Onboarding as the template has it (Naz's): the opening with the app's key value as a question, straight questions one to a screen with the dots and Skip, what they're here for, why it works from the research, a first number, the week they can give, and the end, which hands on to the workflow's first step.
3. The catalogue, where the workflow ends at a goal: a goal with its photo and the courses for it, saved, on the to-do list.
4. With a real coach, a video or question to the coach and the reply; with Pro, the paywall, where the workflow meets the price.
5. Account, and the empty states.

A game: the first play, a round, the score, and the way back in.
With routes: planning one on the map.

On the brief note, the workflow's steps are listed with the artboards that draw each, so the owner can check none was skipped.

Every screen:

- Drawn in the house style from the kit's components and tokens, and held to the same checklist as a build (the app-design skill's `reference/review.md`).
- In the business's own words and numbers: a fact you don't have is a [placeholder] in brackets, never invented, and never lorem ipsum.
- Photos in every slot, credited.
- The chosen mark wherever the app signs itself (1b above), never the template's placeholder.
- Real states: the first visit and a member three weeks in, an empty state, an error where one matters.

## 4. Review it, then send it

1. A fresh reviewer before the owner sees it, as for a build: a new agent with the canvas, the references, the house style and the checklist, asked where the prototype differs from them, where the mark is missing or isn't the chosen one, which of the workflow's steps it skips or skims, and where the journey breaks (a dead end, a screen Play can't reach). Fix it, and look again.
2. The canvas starts private: the person shares it with the owner from the canvas (the agent can't change who sees it).
3. Send the owner the link that plays it (`<link>#play-Main`), with a line on each decision taken (the kind, the navigation, the colour scheme, the logo) and the research's open questions.
4. The owner comments on the canvas or replies; revise the same canvas and send it again, round after round, until they say build it.

Nothing is created or built before they do: their approval is the gate to the SKILL's step 4.

## 5. Once it's approved

- `new`'s flags follow it: the kind, the coach, routes, the two roles' words, the colour scheme (`--scheme`, or `--accent` for their own colour) and the reference apps.
- The chosen mark goes into `src/lib/logo.ts` (`MARK_PATH`, `BOX`) straight after `new`, and `npm run brand` draws the icons, the favicon and the splash from it; the kit's `Lockup` and `Mark` (`src/components/logo-loader.tsx`) put it on the landing, sign-in and the dashboard, and `LogoLoader` on every loading state, so the build matches the prototype with nothing else to change.
- The workflow goes into `PRODUCT.md` as the one job, step by step.
- Its link goes in the app's `DESIGN.md` under *Prototype*, with the date it was approved.
- The app-design skill builds to it: the direction contract's STORY names the prototype's screen each screen follows, and every review compares the screenshots with it.
- Its words become the app's: onboarding's steps (`ONBOARDING`), the landing's lines, the empty states.
- The build reads its screens from the canvas itself (the artifact tools' `list_files` and `read_file`), or from Claude Design's handoff to Claude Code.
- A later flow it doesn't have is added to the same canvas, on a page of its own, and the owner sees it before it's built.
