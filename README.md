# fohm-scaffold

Make a new app, then get walked through every step until it's live on the
web and in the app stores. Distilled from building Aluzam
(`docs/WHAT-WE-LEARNED.md`).

**What you get, from one Expo codebase:**

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

It asks a few questions (name, app or game, words, domain, colour) and
creates the app. Then, from inside it:

```bash
npx github:rhoneybul/fohm-scaffold status
```

shows the 22 steps from here to the app stores (7 of them optional integrations), which are done, and what to
do next. Run `check` after doing a step and it verifies it where it can
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
| `status` | every step, done or not, and the next one |
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

Tools: `scaffold_questions`, `scaffold_new_app`, `scaffold_status`,
`scaffold_check`, `scaffold_mark_done`, `scaffold_explain`. Then ask Claude
"make me a new app" and it will ask the questions, create it, and take you
through each step, checking as it goes. In this repository,
`/new-app` (`.claude/commands/new-app.md`) does the same without the MCP
server.

## The steps

1. Create the app
2. Install and run it in demo mode
3. Write down the product (`PRODUCT.md`)
4. Words and brand
5. Put it on GitHub
6. Typecheck and tests pass
7. Create the Supabase project
8. Deploy on Vercel
9. The live site is healthy
10. Make your own owner account
11. Check production after every deploy
12. Payments for Pro (Stripe), optional
13. Product analytics (PostHog), optional
14. Error reports (Sentry), optional
15. Email (Resend), optional
16. AI assistant (Claude), optional
17. Continue with Google, optional
18. Push notifications, optional
19. Point the iOS and Android apps at the live API
20. Build the iOS and Android apps (EAS)
21. Submit to the App Store and Google Play
22. Privacy policy and terms checked

The integration steps are checked against the live site: `check stripe`
passes once production reports Stripe on.

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
