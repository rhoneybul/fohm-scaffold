---
description: Create a new app with fohm-scaffold and walk through every step to live
---

Help me create a new app with fohm-scaffold, then guide me through going live.

1. Run `node bin/fohm-scaffold.mjs questions --json` and ask me the questions in
   one message, with the examples, saying only the name is required. $ARGUMENTS
2. Create it: `node bin/fohm-scaffold.mjs new <folder> --json` with my answers
   as flags (`--name`, `--kind`, `--tagline`, `--member-word`, `--owner-word`,
   `--operator`, `--support-email`, `--domain`, `--bundle-id`, `--accent`).
   Put it outside this repository unless I say otherwise.
3. Then loop, one step at a time:
   - `node bin/fohm-scaffold.mjs status --dir <folder> --json`
   - Tell me the next step in plain words. Do what you can yourself (installing,
     running checks, editing PRODUCT.md and brand.ts with me). For steps only I
     can do (Supabase, Vercel, Apple, Google), give me the exact clicks from the
     step's `do` list and wait.
   - When it's done: `check <step>` for checked steps, `done <step>` for manual
     ones (vercel: `--value https://...`).
4. Never ask me to paste secrets (database URLs, keys) into the chat: they go
   straight into Vercel's environment variables.
