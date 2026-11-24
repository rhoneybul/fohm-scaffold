# fohm-scaffold

Make a new app, then get walked through every step until it's live on the
web and in the app stores, following one strategy (`docs/STRATEGY.md`):
productise what a coaching business already sells, research first, design
from the apps the owner likes (Mobbin) and their own brand, build a lean
skeleton, launch, grow, and hand it over to build on with Claude Code.
Distilled from building Etapa and Aluzam (`docs/WHAT-WE-LEARNED.md`).

**What you get, from one Expo codebase:**

- by default, a **coaching progression**: a level assessment, a path of skills, check-ins, questions and **video uploads** for the coach (who can reply with a video), and a library (or a plain app, or a game)
- **multiple coaches**: the owner assigns members to coaches, and each coach sees only their own
- a public **landing page**, a **web app**, and **iOS and Android apps**
- an **owner's dashboard** that sees everything people do in the app
- a **Supabase backend** with access rules on the server, migrations on every deploy, and demo mode with no setup
- **integrations built in**, each off until its key is set in Vercel: **Stripe** (a Pro plan), **PostHog** (analytics), **Sentry** (error reports), **Resend** (email), a **Claude** AI assistant, **Continue with Google**, **push notifications**, and **Tapp** (invite and /go links that survive the install)
- **optional: a game**, with scores saved and shown on the dashboard
- privacy policy and terms pages, tests, CI, and smoke tests against production
- `AGENTS.md`, `PRODUCT.md` and `DESIGN.md`, so coding agents build it the right way

## Make an app

```bash
npx github:rhoneybul/fohm-scaffold new my-app
```

It asks a few questions (the idea, the business behind it, a name, coaching
app / plain app / game, the apps they like, words, where the business is and
whether it's registered, domain, colour) and creates the app with a product
brief, research and proposal templates, and the references section of
DESIGN.md started. No name yet? Check some ideas:

```bash
npx github:rhoneybul/fohm-scaffold names Tidepool Swellcoach Lineup
```

Then, from inside the app:

```bash
npx github:rhoneybul/fohm-scaffold status
```

shows every step, by phase (Discover, Design, Build, Launch, Grow, Hand
over), which are done, and what to do next. Run `check` after doing a step and it verifies it where it can
(dependencies, typecheck, git remote, the live site's health, the support
inbox, the app's API address); for steps only you can do (buying the domain,
registering the business, creating the Supabase project, the Vercel deploy,
App Store submission), `done <step>` marks them.

### What only you can do

Some steps need the person, not an agent: their accounts, payments, the
domain, registering the business, the App Store and Google Play accounts, and
keys. `fohm-scaffold manual` lists them, the ones that take days first (a
D-U-N-S number can take 30 days), and `status` and every command that changes
a step keep them written as a page at `.fohm/manual-work.html`. In Claude,
that page is published as an
**Artifact**: a private link to share with the business owner, republished to
the same link as steps get done (`manual --artifact <link>` remembers it).

### Without questions (scripts and agents)

Pass everything as flags. With `--json`, or whenever it isn't run in a
terminal, it never prompts and prints one JSON object:

```bash
npx github:rhoneybul/fohm-scaffold new tidepool --name "Tide Pool" --kind game \
  --domain tidepool.app --member-word player --owner-word host --accent "#3355AA" \
  --country UK --registration "company number 01234567, registered in England and Wales" --json
```

| Command | Does |
| -- | -- |
| `new [folder] [flags]` | create the app (`--name --kind app\|game --tagline --member-word --owner-word --operator --country --registration --support-email --domain --bundle-id --accent --no-git --yes`) |
| `names <idea>...` | which names are free: .com/.app/.co and the GitHub repository |
| `status` | every step, by phase, done or not, who does it, and the next one |
| `manual [--artifact <link>]` | what only you can do, slowest first; writes `.fohm/manual-work.html` (`--artifact` remembers where it was published) |
| `github [--owner org] [--public]` | create the GitHub repository (gh CLI, private by default) and push |
| `references --app A --screen S --url U --take T` | add a design reference to DESIGN.md |
| `next` | the next step in full |
| `check [step]` | run the automatic checks; a pass marks the step done |
| `done <step> [--value v]` | mark a manual step done (`domain --value tidepool.app`, `vercel --value https://your-site`) |
| `skip <step>` | skip an optional step (`business` for a free app run in your own name; `stripe`, `posthog`, `sentry`, `email`, `ai`, `google`, `push`) |
| `undo <step>` | reopen a step |
| `explain <step>` | why it matters and what to do |
| `questions` | what `new` asks, as data |
| `mcp` | serve all of this as MCP tools |

All take `--dir <app folder>` (default: the current folder) and `--json`.

### As an MCP server

```bash
claude mcp add fohm-scaffold -- npx -y github:rhoneybul/fohm-scaffold mcp
```

Tools: `scaffold_questions`, `scaffold_check_names`, `scaffold_new_app`,
`scaffold_status`, `scaffold_manual_work`, `scaffold_check`,
`scaffold_mark_done`, `scaffold_create_github_repo`,
`scaffold_add_references`, `scaffold_explain`.
Then ask Claude "make me a new app" and it follows the strategy: asks the
questions, proposes and checks names, creates the app and its GitHub
repository, publishes what only you can do as an Artifact (the domain, the
business, the store accounts first), researches the market (with web search),
pulls design references from Mobbin (with Mobbin's MCP server connected), and
takes you through each step, checking as it goes. In this repository,
`/new-app` (`.claude/commands/new-app.md`) does the same without the MCP
server.

## The steps

- **Discover:** create the app, research the market, write the product brief, own the domain, register the business (if it isn't already, and if it needs to be)
- **Design:** references from Mobbin, a direction contract that adopts them screen by screen, the owner's brand
- **Build:** install, the coach's method in the app (coaching apps), GitHub, tests, code and design review
- **Launch:** Supabase, Vercel, the live site healthy, an inbox for the support address, your owner account, smoke tests, privacy and terms
- **Grow:** Stripe, PostHog, Sentry, email, the AI assistant, Google sign-in (each optional), the App Store and Google Play developer accounts, push (optional), then the iOS and Android apps and the stores
- **Hand over:** the proposal, the pitch deck, the handover

`docs/GUIDE.md` explains each one in full, and how to grow the app after.

## This repository

```
bin/fohm-scaffold.mjs   the CLI
lib/                    options (the questions), generate (copies template/), steps (and their checks), manual (the page of
                        what only the person can do), dns (where a domain's mail goes), state, core
mcp/server.mjs          the MCP server (stdio, no dependencies)
template/               the app every `new` starts from; a working app in its own right
docs/                   GUIDE.md, WHAT-WE-LEARNED.md
tests/                  npm test: the wizard, the CLI and the MCP server
```

CI (`.github/workflows/ci.yml`) tests the wizard, then generates an app and a
game and runs their typecheck, tests (against a local Supabase) and web, iOS
and Android bundles.
