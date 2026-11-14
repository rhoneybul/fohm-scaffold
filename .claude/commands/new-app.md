---
description: Create a new app with fohm-scaffold, following the strategy end to end
---

Help me create a new app with fohm-scaffold, following docs/STRATEGY.md. $ARGUMENTS

1. **Discover.** Run `node bin/fohm-scaffold.mjs questions --json` and ask me
   the questions in one message (the idea and the business behind it first).
   If I have no name, propose 5 to 10 short, sayable names from the idea and
   check them: `node bin/fohm-scaffold.mjs names <names...> --json`. Show me
   which are free and let me choose.
2. **Create** it outside this repository unless I say otherwise:
   `node bin/fohm-scaffold.mjs new <folder> --json` with my answers as flags
   (`--idea --business --name --kind --inspiration --member-word --owner-word
   --operator --support-email --domain --bundle-id --accent`).
3. **GitHub:** `node bin/fohm-scaffold.mjs github --dir <folder> --json`
   (private; ask whether it goes under an organisation). If gh isn't
   available, create the repository with your GitHub tools and push.
4. **Research:** with web search, fill in `docs/RESEARCH.md` (competitors,
   the incumbent, the insight, bottom-up sizing; cite sources; invent
   nothing), then the product brief in `PRODUCT.md` with me.
5. **Design references:** for each app I like, use Mobbin's tools
   (search_screens / search_flows: onboarding, home, progress, paywall),
   look at the screens, and add the best with
   `node bin/fohm-scaffold.mjs references --dir <folder> --app .. --screen ..
   --url <mobbin_url> --take ".."`. Then help me with the brand from my
   artwork in `assets/brand/`.
6. Then loop through the rest, one step at a time:
   `node bin/fohm-scaffold.mjs status --dir <folder> --json`; do what you
   can yourself; for steps only I can do (Supabase, Vercel, Stripe, Apple,
   Google), give me the exact clicks from the step's `do` list and wait;
   then `check <step>` or `done <step>` (`skip <step>` for integrations I
   don't want).
7. Never ask me to paste secrets into the chat: keys go straight into
   Vercel's environment variables.
