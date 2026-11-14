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
  `check`; one only a person can do is `manual`. Every step says `why` and
  gives `do` lines a person can follow without other docs.
- **The template** is a complete app and is tested as one. Its own rules are
  in `template/AGENTS.md`. Values the wizard writes (name, slug, ids, words,
  colour, kind) are replaced in `lib/generate.mjs`; if you change one of those
  places in the template, update the generator and `tests/scaffold.test.mjs`.
- **Before you push**: `npm test` here, and in `template/`:
  `npm run typecheck`, `npm test` (with the local Supabase stack for the
  backend tests: see `template/AGENTS.md`), and
  `npx expo export --platform web|ios|android`.
- Copy: plain English, no emoji.
