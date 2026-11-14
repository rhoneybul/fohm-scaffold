# Aluzam: what was built, and what it taught

A summary of the `digital-kesh` repository, from the first commit on
7 November 2026 to 14 November 2026: 57 commits, 12 pull requests, in eight
days.

## What Aluzam is

A guitar practice web app for Pallé Guitar Teacher's students in Perth, live
at aluzam.app. It turns weekly lessons into a practice habit: a check-in finds
where a student is, they pick one of five fixed programs with a goal, and
practise weekly sessions of written-out exercises (timer, metronome,
reflection). The teacher keeps up with every student from a deliberately
simple dashboard. Premium ($50 a month) adds an AI practice coach, messaging
Pallé with voice and video notes, and a Song studio; Premium + coaching ($100
a month) adds Pallé's lesson notes and hand-picked materials.

Stack: Expo (React Native Web) on Vercel, Vercel functions in `api/` over
Supabase Postgres and Auth, Stripe for billing, Claude for the AI coach.

## How it was built, day by day

**7 Nov: the bootstrap.** "Pallé Practice" started as an Expo app for web and
mobile. The UI was redesigned the same day around patterns from Speak and
Ahead (found through Mobbin), and an admin dashboard modelled on Etapa's
replaced the first coach portal.

**8 Nov: a real backend.** The backend took ownership of the database, with
migrations running on every deploy. Two production fixes followed straight
away (ES module output and explicit `.js` imports in `api/`). Every emoji was
removed. Fixed programs and the "Do now" follow-along tab arrived, then
Supabase Auth login, course pages and account basics brought across from your
other products, Naz and Etapa. Three pull requests merged.

**10 Nov: Premium and the dashboard rule.** Premium at $50 a month: Message
Pallé, the Song studio, voice and video notes, and a practice and chat log.
The dashboard was cut down to its simple form, a materials library with
scheduled assignments arrived, and the rule that defines the project was
written: **the teacher sees everything students do**. A code review then
hardened it: progress can't be undone, private notes stay private, deletes
are guarded.

**11 Nov: lesson notes, and CI on real infrastructure.** Lesson notes from
Pallé and "This week from Pallé" on Today. CI moved onto the local Supabase
stack, and a test now refuses two migrations sharing a version.

**12 Nov: the brand.** The rebrand to Aluzam, with your colours, wordmark and
the skeleton guitarist traced from the artwork rather than redrawn. A desktop
layout for the student app, a design review acted on, and the design system
recorded in `DESIGN.md` (fixing three contrast slips along the way).

**13 Nov: coaching as a paid plan.** Premium + coaching at $100 a month.
Plans switch in place, every Stripe event is checked against Stripe, no silent
second subscriptions, and billing can't outlive an account.

**14 Nov: going live.** Continue with Google, a public landing page, smoke
tests against production after every deploy, the skull favicon. Then the app
went web-only (dropping the native build and every `EXPO_PUBLIC_` variable),
and terms and privacy were settled: first on Etapa's model, then under
Pallé Mazzulla as a sole trader under Australian law.

## What it taught (and what fohm-scaffold keeps)

1. **One product rule, enforced by the compiler.** "The teacher sees
   everything" stayed true because every stored field must appear in
   `ADMIN_SEES` or typecheck fails. Kept as-is.
2. **The backend owns the database.** The app never holds a database
   credential; RLS on with no policies locks out the public keys; `/api/data`
   decides every read and write. Kept.
3. **Migrations ship with the code.** Applied as the first build step; a
   failure stops the deploy. Re-runnable, never renamed, tested for clashing
   versions, run twice in CI. Kept.
4. **Each side's fields are its own.** A teacher's save never overwrote a
   student's words, and a student never wrote the teacher's reply. Kept as
   `OWNER_ONLY` and `MEMBER_ONLY`.
5. **Demo mode from day one** let every screen be built and reviewed before
   there was a database. Kept.
6. **Test against the real thing.** Backend tests sign up through local
   Supabase Auth; smoke tests check production after each deploy. Kept.
7. **Public settings at runtime, not build time.** Aluzam went web-only partly
   because build-time `EXPO_PUBLIC_` variables cost more than they gave.
   fohm-scaffold keeps iOS and Android but learns the lesson: the apps know
   one thing at build time (the API's address) and fetch everything else from
   `/api/health`, as the web does.
8. **Write decisions down where agents read them.** `AGENTS.md`, `PRODUCT.md`
   and `DESIGN.md` carried the owner's decisions (with dates) across many
   sessions. Kept as templates.
9. **Review, then turn the finding into a rule.** Code and design reviews after
   each big feature caught real bugs; the lasting fixes were tests and types.
10. **Paid features are enforced on the server**, and Stripe is the source of
    truth for subscriptions. Kept, as one Pro plan: switched on by
    Stripe's keys, enforced by `requirePro`.

## What was left out of fohm-scaffold

Anything specific to guitar or to Pallé: programs, exercises, the metronome,
fretboard diagrams, the Song studio, chord maths, voice and video notes and
their storage policies, materials and assignments, lesson notes, the second
paid plan and the Aluzam brand. Stripe billing, Google sign-in and the AI
coach came across in general form (Pro, Continue with Google, the AI
assistant). (fohm-scaffold has its
own, generic landing page.) All of
it is still in the `digital-kesh` repository to copy from when a new app needs
the same thing.
