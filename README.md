# fohm-scaffold

Make a new app, then get walked through every step until it's live on the
web and in the app stores, following one strategy (`docs/STRATEGY.md`):
productise what a coaching business already sells, research first, design
from the apps the owner likes (Mobbin) and their own brand, build a lean
skeleton, launch, grow, and hand it over to build on with Claude Code.
Distilled from building Etapa and Aluzam (`docs/WHAT-WE-LEARNED.md`).

**What you get, from one Expo codebase:**

- by default, a **coaching progression**: a level assessment, a path of skills, check-ins, clips and questions for the coach, and a library (or a plain app, or a game)
- a public **landing page**, a **web app**, and **iOS and Android apps**
- an **owner's dashboard** that sees everything people do in the app
- a **Supabase backend** with access rules on the server, migrations on every deploy, and demo mode with no setup
- **integrations built in**, each off until its key is set in Vercel: **Stripe** (a Pro plan), **PostHog** (analytics), **Sentry** (error reports), **Resend** (email), a **Claude** AI assistant, **Continue with Google**, and **push notifications**
- **optional: a game**, with scores saved and shown on the dashboard
- privacy policy and terms pages, tests, CI, and smoke tests against production
- `AGENTS.md`, `PRODUCT.md` and `DESIGN.md`, so coding agents build it the right way

## Make an app

```bash
npx github:rhoneybul/fohm-scaffold new my-app
```

It asks a few questions (the idea, the business behind it, a name, coaching
app / plain app / game, the apps they like, words, domain, colour) and creates
the app with a product brief, research and proposal templates, and the
references section of DESIGN.md started. No name yet? Check some ideas:

```bash
npx github:rhoneybul/fohm-scaffold names Tidepool Swellcoach Lineup
```

Then, from inside the app:

```bash
npx github:rhoneybul/fohm-scaffold status
```

shows every step, by phase (Discover, Design, Build, Launch, Grow, Hand
over), which are done, and what to do next. Run `check` after doing a step and it verifies it where it can
(dependencies, typecheck, git remote, the live site's health, the app's API
address); for steps only you can do (creating the Supabase project, the
Vercel deploy, App Store submission), `done <step>` marks them.

### Without questions (scripts and agents)

Pass everything as flags. With `--json`, or whenever it isn't run in a
terminal, it never prompts and prints one JSON object:

```bash
npx github:rhoneybul/fohm-scaffold new tidepool --name "Tide Pool" --kind game \
  --domain tidepool.app --member-word player --owner-word host --accent "#3355AA" --json
```

| Command | Does |
| -- | -- |
| `new [folder] [flags]` | create the app (`--name --kind app\|game --tagline --member-word --owner-word --operator --support-email --domain --bundle-id --accent --no-git --yes`) |
| `names <idea>...` | which names are free: .com/.app/.co and the GitHub repository |
| `status` | every step, by phase, done or not, and the next one |
| `github [--owner org] [--public]` | create the GitHub repository (gh CLI, private by default) and push |
| `references --app A --screen S --url U --take T` | add a design reference to DESIGN.md |
| `next` | the next step in full |
| `check [step]` | run the automatic checks; a pass marks the step done |
| `done <step> [--value v]` | mark a manual step done (`vercel --value https://your-site`) |
| `skip <step>` | skip an optional integration (`stripe`, `posthog`, `sentry`, `email`, `ai`, `google`, `push`) |
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
`scaffold_status`, `scaffold_check`, `scaffold_mark_done`,
`scaffold_create_github_repo`, `scaffold_add_references`, `scaffold_explain`.
Then ask Claude "make me a new app" and it follows the strategy: asks the
questions, proposes and checks names, creates the app and its GitHub
repository, researches the market (with web search), pulls design references
from Mobbin (with Mobbin's MCP server connected), and takes you through each
step, checking as it goes. In this repository,
`/new-app` (`.claude/commands/new-app.md`) does the same without the MCP
server.

## The steps

- **Discover:** create the app, research the market, write the product brief
- **Design:** references from Mobbin, the owner's brand
- **Build:** install, the coach's method in the app (coaching apps), GitHub, tests, code and design review
- **Launch:** Supabase, Vercel, the live site healthy, your owner account, smoke tests, privacy and terms
- **Grow:** Stripe, PostHog, Sentry, email, the AI assistant, Google sign-in, push (each optional), then the iOS and Android apps and the stores
- **Hand over:** the proposal, the pitch deck, the handover

`docs/GUIDE.md` explains each one in full, and how to grow the app after.

## This repository

```
bin/fohm-scaffold.mjs   the CLI
lib/                    options (the questions), generate (copies template/), steps (and their checks), state, core
mcp/server.mjs          the MCP server (stdio, no dependencies)
template/               the app every `new` starts from; a working app in its own right
docs/                   GUIDE.md, WHAT-WE-LEARNED.md
tests/                  npm test: the wizard, the CLI and the MCP server
```

CI (`.github/workflows/ci.yml`) tests the wizard, then generates an app and a
game and runs their typecheck, tests (against a local Supabase) and web, iOS
and Android bundles.
