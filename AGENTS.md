# Notes for coding agents

This repository is **fohm-scaffold**: a CLI and MCP server that creates new
apps from `template/` and guides people through going live. See `README.md`.

- **The wizard** is plain Node ESM with no dependencies (`bin/`, `lib/`,
  `mcp/`). Keep it that way: it runs through `npx github:...` and must start
  fast. Everything the CLI and MCP server do goes through `lib/core.mjs` and
  returns JSON-able data; both are thin.
- **Agent-friendly output**: every command supports `--json`, and never
  prompts unless stdin and stdout are a terminal and `--yes` isn't given.
  Errors in JSON mode are `{ ok: false, error }` with a non-zero exit.
- **Steps** live in `lib/steps.mjs`. A step a machine can verify has a
  `check`; one that can only be marked by hand is `manual`. Every step says
  `why` and gives `do` lines a person can follow without other docs; `do` can
  depend on the answers (the country), and `<domain>`, `<project ref>`,
  `<support email>` and `<App>` are filled in once known.
- **Who does a step** is separate from how it's checked: `you: true` when
  only the person can (their accounts, payments, the domain, the business's
  registration, keys), `you: [lines]` for their part of a shared step, nothing
  when an agent can do it alone. `early` steps take days or can't wait, and
  `takes` says how long. Those make the manual-work page
  (`lib/manual.mjs`, `.fohm/manual-work.html`), which `status` and every
  command that changes a step rewrite, and Claude publishes as an Artifact.
  `after` holds a step until another is done (the live checks wait for the
  deploy), so `nextForAgent` never stops on one the person hasn't unblocked. The page follows claude.ai's Artifact
  contract (no document skeleton, a named `<title>`, colour tokens with a dark
  theme, the safe-area gutter); `tests/manual.test.mjs` holds it to that,
  and to 4.5:1 contrast for any accent. A new step that needs the person gets
  `you`, and its place on the page comes with it.
- **The template** is a complete app and is tested as one. Its own rules are
  in `template/AGENTS.md`. Values the wizard writes (name, slug, ids, words,
  colour, kind) are replaced in `lib/generate.mjs`; if you change one of those
  places in the template, update the generator and `tests/scaffold.test.mjs`.
- **Before you push**: `npm test` here, and in `template/`:
  `npm run typecheck`, `npm test` (with the local Supabase stack for the
  backend tests: see `template/AGENTS.md`), and
  `npx expo export --platform web|ios|android`.
- **The template takes cross-functional work from the apps built like it**
  (Naz, Etapa, Aluzam, and the games: Naz's surf game and Strawberry Fields;
  each one's agent rules say so). When a change there would serve every app
  (sign-in and accounts, payments, legal pages and consent, analytics and
  error reports, email and push, the owner's dashboard, CI, migrations and
  deploys, the store builds, a security or platform fix, an agent rule that
  keeps paying off), it comes here in its general form: no product's names
  or words (they come from `src/lib/brand.ts`), off until its keys are set
  when it's an integration, with its test, and in `template/AGENTS.md` and
  `docs/GUIDE.md` where they describe it. A lesson about setting an app up
  (an account, a registration, a store rule) goes into the steps
  (`lib/steps.mjs`) instead.
- Copy: plain English, no emoji.
