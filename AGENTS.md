# Notes for coding agents

This repository is **fohm-scaffold**: the template every new app starts from, one command that copies it, and three Claude skills that take an app from an idea to live.
See `README.md`.

```
template/               the app: the house style (the Naz and Etapa family), tested as a complete app
bin/fohm-scaffold.mjs   new <folder> [flags]; secrets (the shared keys onto repositories, on the person's machine)
lib/                    options, generate, repo (the in-repo workflows), secrets
skills/                 new-app (the playbook), app-design, app-launch, each with reference/
tests/                  the generator's tests, and the skills' lint
```

## The fundamentals

Every skill, the template and every app made from it hold to these:

1. **One house style**: the template's `DESIGN.md`, shared with Naz and Etapa.
2. **The kit only**: screens are built from the kit's components and tokens, never one-off styles.
3. **Every member action reaches the dashboard**: stored through `/api/data`, listed in `ADMIN_SEES` (the typecheck fails until it is), shown in Activity.
4. **Integrations off until their keys are set**, and secrets never through the chat.
5. **Photos everywhere**: the member's own, their goal, real places, credited (`skills/app-design/reference/photos.md`).
6. **Review before preview**: a fresh reviewer before the owner sees anything.
7. **Port back**: work every app can use comes to the template, through the `Template:` line.
8. **Naz and Etapa first**: borrow before building (`skills/new-app/reference/borrow.md`).

## Working here

- **Simple first.** The command is plain Node ESM with no dependencies and starts fast (it runs through `npx github:...`). It never prompts unless stdin and stdout are a terminal and `--yes` isn't given; `--json` prints one object, and errors are `{ ok: false, ... }` with a non-zero exit. Knowledge goes in the skills as markdown, never into code.
- **The skills** are plain markdown, uploaded to claude.ai as account skills or linked into a repository's `.claude/skills/` (this one links them). A `SKILL.md` stays under about 200 lines with its frontmatter (`name`, a `description` that says when to use it); detail goes in `reference/`, and relative links stay inside the skill (an uploaded skill can't reach the rest of the repository). Docs here are one sentence to a line.
- **A service** the launch touches has one file, `skills/app-launch/reference/<service>.md`, in one shape: **Why**, **What the agent does** (naming the Claude connector), **What is the person's** (the clicks; never secrets in chat), **How to check it** (a command or URL the agent runs). A lesson about setting an app up (an account, a registration, a store rule) goes into that file. `tests/skills.test.mjs` lists the services.
- **The template** is a complete app with its own rules in `template/AGENTS.md`. Values `new` writes (name, slug, ids, words, colour, kind, coach, operator, registration, support email, domain, bundle id) are replaced in `lib/generate.mjs`; change one of those places in the template and update the generator and `tests/scaffold.test.mjs` with it.
- **Before you push**: `npm test` here, and in `template/` `npm run typecheck` and the tests for what you changed. CI runs the rest on the pull request (it generates a coaching app, a plain app and a game, typechecks them, tests them against a local Supabase, and bundles them for web, iOS and Android). Run the template's whole `npm test` with the local Supabase stack (`template/AGENTS.md`) only when a change touches its backend, a migration or who may read and write what, and `npx expo export --platform ios|android` only when it touches native code or the app's config.
- **What the template takes in** comes from the apps built like it (Naz, Etapa, Aluzam, and the games: Naz's surf game and Strawberry Fields). A daily scheduled task, *Port to the template*, reads the `Template:` lines of the PRs merged into each app's `main` and opens one PR here. It comes in its general form: no product's names or words (they come from `src/lib/brand.ts`), off until its keys are set when it's an integration, browser-only code guarded, with its test, and in `template/AGENTS.md` where it describes it. What's still to port is at the end of `skills/new-app/reference/borrow.md`.
- Copy: plain English, no emoji.
