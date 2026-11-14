# Handover: building on this app

For the owner, and whoever builds with them. This app is a working skeleton:
web, iOS, Android, a dashboard, and the plumbing (accounts, payments,
analytics, error reports, email, AI). You build the rest by describing it.

## Building with Claude Code

Claude Code reads `CLAUDE.md` (which points at `AGENTS.md`), `PRODUCT.md` and
`DESIGN.md` before it changes anything, so it knows the rules. Ask in plain
English, one change at a time:

- Say the outcome and who it's for: "Members can attach a photo to a check-in, and I see it on their page."
- Name the screen if you know it: "On Home, under Next up, add..."
- Ask it to check its work: "Then run the typecheck and the tests, and show me in the browser at phone size."
- When unsure: "Before changing anything, explain how this works now and what you'd change."
- Review before it ships: `/code-review` for the code, and a design review for screens.

## Safe to change yourself

- Words: `src/lib/brand.ts` (name, tagline, landing page), `src/lib/legal.ts`
- The coaching content: `src/lib/progression.ts` (levels, skills, drills, the assessment, the library)
- Colours: `src/lib/theme.ts` (then record why in DESIGN.md)
- Screens in `src/app/` and components in `src/components/`, through Claude Code

## Ask before changing

- `api/` (the backend: who can read and write what) and `supabase/migrations/` (the database)
- Payments: `api/billing.ts`, `api/stripe-webhook.ts`
- Who can see what: coaches' access in `api/data.ts`, and the video storage rules in `supabase/migrations/`
- Anything that changes what's stored about people (the privacy policy changes with it)
- Renaming a level or skill id that people already have

## Running it

```bash
npm install
npm run web
```

Every push to `main` deploys the website (Vercel). The phone apps are built
with `npm run build:ios` / `npm run build:android` and submitted with
`npm run submit:ios` / `npm run submit:android`.

## The walkthrough

A short recorded tour (Loom or similar) of: the dashboard, the member app, how
to ask Claude Code for a change, and how a change goes live. Link it here:
