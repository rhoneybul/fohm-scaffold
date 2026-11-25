# Porting work back to the template

Work an app does that every app could use goes back to this repository's `template/`, so the next app doesn't have to find it again.
Naz, Etapa, Aluzam and the games (Naz's surf game, Strawberry Fields) are built the same way, and every new app starts from the template.

## What counts

A change another app would want, not one about the app's subject: sign-in and accounts, payments, legal pages and consent, analytics and error reports, email and push, the owner's dashboard, CI and tests, migrations and deploys, store builds and releases, a security or platform fix (the keyboard, safe areas, a browser quirk), or an agent rule that keeps paying off.

## How

- **Not in the session that made the change**: a second PR per change burns the weekly limits.
- **Every PR in an app says which**, in a line of its body: `Template:` and what to port, in a sentence or two the daily task can act on (the files and the idea), or `Template: nothing to port`.
- A daily scheduled task, *Port to the template*, reads the `Template:` lines of the PRs merged into each app's `main` since its last run and opens one PR here for them.
- What comes here comes in its general form: no product's names or words (they come from `src/lib/brand.ts`), off until its keys are set when it's an integration, browser-only code guarded so the iOS and Android apps still build, with its test, and in `template/AGENTS.md` where it describes it.
- A lesson about setting an app up (an account, a registration, a store rule) goes into the skills instead: the service's file in the app-launch skill's `reference/`, or this skill's references.
- What both siblings have and the template lacks is listed, by value, at the end of [borrow.md](borrow.md).
