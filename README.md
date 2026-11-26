# fohm-scaffold

Make a new app in the house style of Naz and Etapa, then take it from an idea to live on the web and in the app stores with three Claude skills.

- **`template/`**: the app. One Expo codebase for a landing page, the web app, iOS and Android apps and an owner's dashboard, with a Supabase backend whose access rules live on the server, migrations on every deploy, demo mode with no setup, and integrations each off until its key is set (Stripe, PostHog, Sentry, Resend, a Claude assistant, Continue with Google, push, Tapp, and Mapbox for route planning when `--routes yes`). By default a coaching progression (an assessment, a path, check-ins, video feedback, a library, several coaches), or a plain app, or a game.
- **`fohm-scaffold new`**: copies the template and fills in its name, words, ids, colour and the business behind it.
- **`skills/`**: the know-how, as plain markdown.
  - **new-app**: the playbook and front door: discover (a live chat shaped by the answers, around the workflow and the apps they like, that leads into the prototype), research, an end-to-end prototype in Claude Design that the owner approves before any code, create, catalogues with photos, design, build, launch, preview after every feature, and port back. Its references hold the strategy, what Etapa, Aluzam and Strawberry Fields taught, the program builder's pattern, and a map of what to borrow from Naz and Etapa.
  - **app-design**: the house style, the owner's references from Mobbin adopted within it, photos in every slot, and a fresh review before the owner sees anything.
  - **app-launch**: every service, one file each (why, what the agent does through Claude's connectors, what is the person's, how to check it), and the person's checklist as an Artifact.

## Install the skills

- **On claude.ai**: Settings → Capabilities → Skills → upload each `skills/<name>` folder (zip it) as an account skill. Every session on the account, desktop and cloud, then has them.
- **In a repository**: link or copy them into `.claude/skills/`:

  ```bash
  mkdir -p .claude/skills
  for n in new-app app-design app-launch; do ln -s /path/to/fohm-scaffold/skills/$n .claude/skills/$n; done
  ```

  This repository links its own, so Claude Code here has them already.

Then ask Claude for a new app ("start an app for my surf school"), and the new-app skill takes it from there.

## Make an app by hand

```bash
npx github:rhoneybul/fohm-scaffold new my-app --name "Tide Pool" --kind coaching --coach yes \
  --domain tidepool.app --member-word surfer --owner-word coach --scheme ocean \
  --country UK --registration "company number 01234567, registered in England and Wales" --json
```

| Flag | What |
| -- | -- |
| `--name` | the app's name (the only one required; the folder's name otherwise) |
| `--idea`, `--business`, `--inspiration` | the thesis, the business behind it, the apps the owner likes |
| `--kind coaching\|app\|game`, `--coach yes\|no` | a coaching progression (default), a plain app or a game; a real coach, or programs with nobody behind them |
| `--routes yes\|no` | members plan routes on a map, snapped to real roads and paths with Mapbox (`APP.routes`; off until `MAPBOX_TOKEN` is set: `template/docs/ROUTES.md`); no by default |
| `--tagline`, `--member-word`, `--owner-word` | the landing headline and the two roles' words |
| `--operator`, `--country`, `--registration`, `--address` | who runs it, where, and its registration and office, for the terms |
| `--support-email`, `--domain`, `--bundle-id` | contact, domain, the iOS and Android id |
| `--scheme`, `--accent` | the colour scheme, a whole palette (the accent and the neutrals with it), named from `fohm-scaffold schemes`; or `--accent "#hex"` to build one around the owner's own colour. Neither: the one that suits the idea and the liked apps best |
| `--from <link\|file>` | an app builder brief (a submission's `brief.json`, or the file): its answers are the flags, any flag given beside it wins, and the brief is kept as `docs/BRIEF.md` for the new-app skill; the folder defaults to the slug |
| `--in-repo [no]` | inside a git repository the app is a folder of it, its workflows at the root scoped to the folder; `no` for a repository of its own |
| `--no-git`, `--no-install`, `--yes`, `--json` | skip `git init` or `npm install`; never prompt; print JSON |

From the app builder (fohm's site, `/app-builder`), a submission's page gives the one command that makes it:

```bash
npx github:rhoneybul/fohm-scaffold new --from https://<site>/app-builder/submissions/<id>/brief.json
```

In a terminal it asks for anything missing, and offers the colour schemes that suit the app, best first, to pick the one you like most; otherwise it never prompts.
`fohm-scaffold schemes --idea .. --inspiration .. [--json]` lists them on their own.
It ends: "Open this folder in Claude Code and run the new-app skill."

## This repository

```
template/               the app every `new` starts from; a working app in its own right
bin/fohm-scaffold.mjs   the one command
lib/                    options, generate, repo
skills/                 new-app, app-design, app-launch
tests/                  npm test: the generator and the skills
```

`AGENTS.md` has the fundamentals and how to work here.
CI (`.github/workflows/ci.yml`) runs `npm test`, then generates a coaching app, a plain app and a game and typechecks, tests (against a local Supabase) and bundles each for web, iOS and Android.
