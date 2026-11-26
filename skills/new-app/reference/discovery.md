# Discovery: the chat that leads to the prototype

**Why.** One long list of ten questions in a message got thin answers, asked what the idea had already said, and never asked what a member does in the app.
So discovery is a live chat: one or two questions a turn, each chosen from what the person has said so far, until the brief below holds everything the prototype, `new` and the launch need.
Then it hands straight on to the research and the prototype, with nothing left to ask.

## Starting from the app builder

Someone who used the app builder (fohm's site, `/app-builder`) has answered the first part already, and its brief comes as a link to a submission's `brief.json` or as `docs/BRIEF.md` in an app made with `new --from`.
Read it first: its answers are rows *said* (the idea, the business, the kind and the coach, the name and whether it's final, what people are here for and work towards, their content, the apps they like, the colour, the logo, the photo, the audience and the ambition), and its *Still to ask me* list is what's left.
Run the chat on those rows only, with the heads-up recounted to what's left (often one part, five or six questions), then the end of the chat as below.
If the app was already made from it, the brief's flags are in the app: a changed answer (the name, the words, the colour) is made again with `new --from` into a fresh folder while nothing else has been built, or edited where `lib/generate.mjs` wrote it once something has.

## How the chat runs

- **Open with a heads-up**: before the first question, say what's coming: about twelve questions in three parts, ten minutes or so, that anything the answers cover is skipped, that "I don't know" is fine, and that a prototype to tap through comes at the end.
  1. **The idea**: the idea, what it doesn't do, the business and who it's for (3 or 4 questions).
  2. **How it works**: the workflow and its gaps, the coach, what's paid (3 to 5).
  3. **How it looks, and the practical bits**: the apps they like, their brand, the name, who runs it (4 or 5).
- **Say where they are**: open each part with its name and how many questions it has, and keep a line on every turn ("Part 2 of 3, about 6 to go"), recounted as answers skip or add questions.
- **One or two questions a turn**, never a list. Open questions as plain text; a closed one (the kind, yes or no, a pick from drafts) with tappable choices where the surface has them (`AskUserQuestion` in Claude Code), each with a recommended option first.
- **Each turn**: say in a line what you took from their answer, fill the brief, then ask the next question.
- **The next question** is the most important empty row of the brief that their answers make relevant, in the brief's order. Skip a row that doesn't apply (the table's *Only when*), and never ask what an answer or their website already said.
- **Decide what you can, and say it to confirm**: "It sounds like programs with nobody behind them, so the app speaks as itself: right?" A yes or silence keeps it; mark it *decided*.
- **Read before you ask.** The moment they give a website, an Instagram or a document, read it and fill what it says (what they sell, the prices, the levels, the words they use, the photos, the content they have), then confirm it in a line rather than asking.
- **Show, don't describe**: the apps they like as their screens, the workflows as drafts, the names as a decision page.
- **"I don't know" is always a good answer**: offer your recommendation, or mark the row *later* with when it's needed, and move on.
- **Every five or six turns, and whenever they ask**, show the brief so far in a few lines, with what's left.
- **Keep it short**: ten to fifteen turns for an owner with a website and a clear idea. Don't pad it; don't end it with a required row empty.

## The brief

Every row ends *said* (their words), *decided* (yours, confirmed) or *later* (with the step that needs it).
The rows above the line are needed before the prototype; the rest before `new` or the launch, and can wait for the chat's last turns.

| # | Row | Only when | Goes to |
| -- | -- | -- | -- |
| 1 | The idea: what it does, for whom | Always | `--idea`, `PRODUCT.md` thesis |
| 2 | What it doesn't do: what people will expect or ask for that it leaves out, for now or for good | Always, straight after the idea; kept as said, never decided for them | `PRODUCT.md` out of scope; the prototype draws nothing for it |
| 3 | The business, what it sells now, and its website or socials | Always | `--business`, the research, *Evidence on hand* |
| 4 | The members: who they are and where they start from | Always | `PRODUCT.md` *Users*, the level assessment (`ASSESSMENT`) |
| 5 | **The workflow**: what a member does, from opening it the first time to getting what they came for | Always | The prototype's spine, `PRODUCT.md`'s one job |
| 6 | The result, and how a member knows it's working (a number, a feeling, a goal reached) | Always | `PRODUCT.md` *Purpose*, onboarding's why and first number |
| 7 | The kind: a coaching progression, a plain app or a game | Not plain from the workflow | `--kind` |
| 8 | A real coach, or programs with nobody behind them; with a coach, who, and what they answer (videos, questions) | Coaching | `--coach`, the coach screens |
| 9 | The levels, and the questions that place a member | Coaching | `LEVELS`, `ASSESSMENT` |
| 10 | The program: how long, how many sessions a week, how long each, the kit | It's a program | Onboarding's commitment, `docs/PROGRAMS.md` |
| 11 | The goals people train for (places, events, trips) | The workflow ends at one | The catalogue, `research/<name>.json` |
| 12 | A first number a member can take there and then, safely | There's a benchmark | Onboarding's `measure` step |
| 13 | What could hurt someone, and the safety line | It's physical or risky | Safety copy, the terms |
| 14 | What's free, what's paid, and the price | Always | Pro, the paywall, Stripe |
| 15 | Routes planned on a map | Members move outdoors | `--routes` |
| 16 | The content they already have (videos, programs, PDFs, photos) | Always | The library, *Evidence on hand* |
| 17 | **The apps they like**, what they like about each, and any they don't | Always | `--inspiration`, `DESIGN.md` *References* |
| 18 | Their brand: a logo or artwork, the colour they think of as theirs | Always | `assets/brand/`, `--accent`, the logo round in the prototype |
| 18a | The colour scheme they like most, from three or four suggested from their brand, what the app is about and the apps they like (`fohm-scaffold schemes`; the app-design skill's `reference/colour.md`) | Always, after the apps they like; shown on a decision page, not asked cold | `--scheme`, `DESIGN.md` *Colour* |
| 19 | What members are called, and the person who runs it | Always | `--member-word`, `--owner-word` |
| 20 | The name, and the landing's headline | Always | `--name` (the naming round if they aren't sure), `--tagline` |
| 21 | What it must never do (a safety or trust line) | Always; decide and confirm | `PRODUCT.md` *Capabilities and Constraints* |
| 22 | Where and when it's used | Decide from the workflow | `PRODUCT.md` *Operating context* |
| | *Before `new` and the launch* | | |
| 23 | The operator (person or company) and the country | Always; the checklist starts on it | `--operator`, `--country` |
| 24 | The registration number and registered office | It's registered | `--registration`, `--address` |
| 25 | The support email | Always | `--support-email` |
| 26 | The domain | They have one; else it follows the name | `--domain` |
| 27 | The app id | Decide from the domain or the name | `--bundle-id` |
| 28 | How many people they reach now (students, followers, a list) | Always; *later* is fine | The research's sizing |

## Asking for the workflow

Ask it early, in their world: "Describe what someone does in the app, from opening it the first time to getting what they came for."
Give an example from their field, such as "someone signs up wanting to improve their rowing fitness over 12 weeks; they answer a few questions about where they're at, get a program, do three sessions a week and see their 2k time drop".
Say that "I don't know, help me figure it out" is a fine answer.
Never call it a hero journey or a user flow: ask them to describe it.

**When they want help**, draft it:

1. From the idea, their website and what it sells, and the flows of the apps they named (Mobbin's `search_flows`), write two or three workflows, each in four to six plain steps, from signing up to the result.
2. Make them different in kind (a program to follow, a coach to send videos to, a catalogue to browse and save from), and recommend one in a line.
3. Leave out of every draft what they said it doesn't do.
4. Ask them to pick one, mix them or change a step. Their pick is the workflow.

**Then make it whole.** Write it back as numbered steps and ask about the gaps it leaves, two or three at most, one a turn: the first day before they've done anything, what they do each time they come back and how often, what happens when they miss a week or finish, where the coach comes in, where they meet the price.
Their answers fill the brief's rows 6 to 14 as they go.

## Showing the apps they like

As soon as they name an app, find its screens on Mobbin (`search_screens`, and `search_flows` for the flow their workflow needs) and show the three or four that matter here: its onboarding, home, a session or the core flow, progress, the paywall.
Show each as its image where the surface renders images, always with its Mobbin link, a line each: `**App, Screen** ([Mobbin](https://mobbin.com/...))`.
More than two apps, or a surface that shows no images: one references page (an Artifact) with the screenshots in a grid, and its link.
An app Mobbin doesn't have: say so, show the nearest it has, or ask for a screenshot or a link.

Then ask **what they like about each**, with the screens beside it: "What do you like about these, and is there anything you'd leave out?"
Write their answers in their own words: they are what the design takes from each reference (the app-design skill's `reference/references.md`).

## The end of the chat

When every row is *said*, *decided* or *later*:

1. Write the brief to `brief.md` in the working folder: each row with its answer and how it was settled, **the workflow** as the numbered steps they confirmed, and **the references** with their screens, Mobbin links and what they like about each.
2. Show it to them as a short summary, the workflow in full, with each decision you took marked so they can change it, and one question: "Is this your app? I'll research it and make the prototype next."
3. A correction goes into the brief and the summary again; a yes ends the chat.
4. Then, with no more questions: the naming round if the name isn't settled ([naming.md](naming.md)), the checklist page (the app-launch skill), the research ([research.md](research.md)), and the prototype ([prototype.md](prototype.md)), which walks the workflow step by step.
   Tell them in a line that it's under way and they'll get the link to tap through.

What the research raises goes to them with the prototype, not as more questions now.
At create, the brief fills `new`'s flags, `PRODUCT.md`, `DESIGN.md`'s references and onboarding's steps (`ONBOARDING` in `src/lib/progression.ts`).
