# What the apps taught

What building Aluzam and Strawberry Fields taught, and where the template keeps each lesson.
Naz's and Etapa's lessons are in their own `CLAUDE.md` files ([borrow.md](borrow.md)).

## Aluzam (Nov 2026)

A guitar practice web app for a teacher's students, built in eight days (57 commits, 12 pull requests): a check-in finds where a student is, they pick a program, practise weekly sessions, and the teacher keeps up from a deliberately simple dashboard.
Stack: Expo (React Native Web) on Vercel, Vercel functions in `api/` over Supabase Postgres and Auth, Stripe, Claude.

How it went: the bootstrap on day one, redesigned the same day around patterns from Speak and Ahead (found through Mobbin), with an admin dashboard modelled on Etapa's; then a real backend owning the database with migrations on every deploy; Premium and the rule that defines the project; lesson notes and CI on the real Supabase stack; the brand traced from the owner's artwork; coaching as a paid plan; then Google sign-in, a landing page, smoke tests against production, and the legal pages.

1. **One product rule, enforced by the compiler.** "The teacher sees everything" stayed true because every stored field must appear in `ADMIN_SEES` or the typecheck fails. Kept.
2. **The backend owns the database.** The app never holds a database credential; RLS on with no policies locks out the public keys; `/api/data` decides every read and write. Kept.
3. **Migrations ship with the code.** Applied as the first build step; a failure stops the deploy. Re-runnable, never renamed, tested for clashing versions, run twice in CI. Kept.
4. **Each side's fields are its own.** A teacher's save never overwrote a student's words, and a student never wrote the teacher's reply. Kept as `OWNER_ONLY` and `MEMBER_ONLY`.
5. **Demo mode from day one** let every screen be built and reviewed before there was a database. Kept.
6. **Test against the real thing.** Backend tests sign up through local Supabase Auth; smoke tests check production after each deploy. Kept.
7. **Public settings at runtime, not build time.** Aluzam went web-only partly because build-time `EXPO_PUBLIC_` variables cost more than they gave. The template keeps iOS and Android but learns the lesson: the apps know one thing at build time (the API's address) and fetch everything else from `/api/health`.
8. **Write decisions down where agents read them.** `AGENTS.md`, `PRODUCT.md` and `DESIGN.md` carry the owner's decisions, with dates, across sessions. Kept as templates.
9. **Review, then turn the finding into a rule.** Code and design reviews after each big feature caught real bugs; the lasting fixes were tests and types.
10. **Paid features are enforced on the server**, and Stripe is the source of truth for subscriptions. Kept as one Pro plan, switched on by Stripe's keys, enforced by `requirePro`.
11. **No emoji**, ever; every one was removed on day two.

Left out of the template, still in Aluzam's repository (`digital-kesh`) to copy from: anything about guitar or the teacher (programs, exercises, the metronome, fretboard diagrams, the Song studio), voice and video notes' storage policies, materials and assignments, lesson notes, a second paid plan.

## Strawberry Fields (Nov 2026)

A training app for backcountry skiers, made from the template inside the repository of a ski game.

1. **The template's look was rejected on sight** ("none of the UI/UX of the Mobbin references", "the typography looks terrible"). The template now starts in the house style, and the design step writes a direction contract that follows the references screen by screen. A heavier, soft-shadowed look of its own was later called "super vibe coded" beside Naz and Etapa, so the house style is Naz's and Etapa's.
2. **An app in a folder of another repository** needs its workflows at the root, scoped to the folder: `new` does it.
3. **Code the API shares with the app** must be written as Vercel runs it: `.js` imports, no aliases, no JSON imports. A test compiles the API and loads every route.
4. **Name checks behind a proxy** silently failed: check through the proxy (`curl` honours it), and say so when a check couldn't be made; Vercel's `get_bulk_availability` checks what RDAP can't.
5. **Programs, not coaching**: with no real coach, no coach is shown or offered (`coach: false`).
6. **Photos make it personal**: the member's own, and the goal's, each with its licence and credit.
7. **Catalogues of goals and courses**, saves and a to-do list; programs dated to a goal, AI from a catalogue with a rule-based fallback ([programs.md](programs.md)).
8. **Previews the owner can open**: share links past Vercel Authentication, and screenshots after each feature.
9. **Setting Supabase up**: the agent makes the project with the connector, but the database password and the auth URLs stay the person's (the management API refuses the proxy's credential in a cloud session).
