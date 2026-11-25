# Programs built for you, dated to a goal

The pattern for a program a member gets written for them, counting down to
something real (a trip, an event, a season), as Naz's plan builder and
Strawberry Fields' ski programs do it. This is the shape, not the code: write
the app's own catalogue, rules and builder in it, and run `/grilling` on the
plan first (it has real design choices in it), putting the numbered decisions
at the top of this file so the owner can veto any by its number.

## What a member gets

They answer a few questions, one to a screen (the goal, its date, where
they are now, days a week, minutes a session, their kit, injuries or anything
else), and get a program of weeks, each with its sessions on days, every
session one the app can play. It counts down to the goal and ends with a
retest of where they started.

## The rules

1. **The AI picks from a written catalogue, and never invents.** The
   catalogue is code: every session (or exercise) the app can play, each with
   its kit, length, kind and what it trains, written from the research
   (`research/*.json`, generated with `scripts/research.ts`). The AI's draft
   names catalogue ids and writes each week's dose line and why; a session,
   move or claim that isn't in the catalogue is a problem, never shown.
2. **The goal shapes it.** Its date sets the length (the weeks to it, within
   a minimum and maximum; no date, a standard length). What the goal asks of
   the body (from the catalogue's research) goes into the request: the long
   session builds towards it by the peak week.
3. **Rules every program keeps**, written down with their sources (the
   training principles in `research/`), and checked in code: week one easy
   with a benchmark; a lighter week every three or four; hard days never back
   to back; a taper before the goal; only the member's kit; every session
   inside their minutes; the last week a retest. The check returns a list of
   problems in plain words.
4. **The server checks the draft and retries once.** A draft with problems
   goes back to the AI once, with the problems listed; a second draft with
   problems is dropped.
5. **A rule-based builder always works.** The same shape from the same
   answers, written in code from the same rules: it runs whenever the AI is
   off (no `ANTHROPIC_API_KEY`) or its draft fails twice, so a member always
   gets a program. It's also the tests' oracle: it passes its own check for
   every combination of answers.
6. **Built in the background.** `POST /api/programs` checks the answers,
   saves a `building` row and answers at once (202, with its id); the program
   is written after the response with `waitUntil` from `@vercel/functions`
   (set `maxDuration` for two model calls), and the row becomes `ready` with
   the draft, the model that wrote it and the Monday it starts, or `failed`.
   The app watches the row (a building card on Home), and an email and a push
   say when it's ready, once they're on. A second tap while one builds gets
   the same build; a build still `building` after ten minutes has died.
7. **Haiku builds; Opus stays for chat.** The builder is a well-specified
   task over a catalogue: a Haiku model (the current one: check the
   `claude-api` skill) is fast and cheap enough to run for every member. The
   assistant and any chat about a program stay on Opus.
8. **Stored and seen.** `programs` (the request, the draft, status, model,
   the goal and its date) and the sessions done (program, week, session, when,
   how it felt, a note) are member-owned tables, scoped in `api/data.ts` like
   the others, in `ADMIN_SEES` and Activity: the owner sees every program and
   how it's going.
9. **Safety.** Anything with risk (a heart condition, pregnancy, under 16, an
   injury) gets gentler sessions and a line to see a doctor or physio first;
   the notes stay on the server, never in analytics, and the privacy policy
   names them. A program never says it makes the goal itself safe.
10. **Paid where payments are on.** Building the first is free, so they see
    it; whatever is Pro (the rest of the program, a second one) is enforced on
    the server with `requirePro`, never only by hiding a button.
11. **Analytics**: the walkthrough's steps answered, build started, finished
    (with the model and whether the rules wrote it) and failed, program
    started, session started and finished, benchmark saved. Never anything
    typed.

## Where it lives

| Path | What |
| -- | -- |
| `src/lib/<catalogue>.ts` | The sessions (from the research): plain data, shared by the app and the API (`.js` imports, no aliases: AGENTS.md) |
| `src/lib/builder/` | The request and its checks, the rules, the check, the rule-based builder, and the prompt; one `index.ts` for the API |
| `api/programs.ts` | POST builds in the background; GET reads one or the caller's |
| `api/_lib/programBuild.ts` | The AI's call (Haiku), the check, the one retry, the fallback |
| `src/app/program/` | The walkthrough, the building card, the program's weeks |

## Tests

- The catalogue: every session's moves exist, its kit is consistent, it
  fits its length.
- The check and the rule-based builder: for every combination of answers, the
  rules' program passes the check (taper, lighter weeks, hard days, kit,
  length, counts).
- The API with Anthropic mocked: a good draft is kept; a bad one is retried
  with its problems; two bad ones fall back to the rules; no key goes
  straight to the rules. The route compiles and loads as Vercel runs it
  (`tests/api-build.test.ts`).
- In a browser at 393 and 412 wide (`npm run screens`): the walkthrough, the
  build, the program and a session.

## Telling the team

The builder pings the team's Slack (`docs/SLACK.md`): `programStartedPing` from `api/_lib/pings.ts` when a member asks for a program, and `programBuiltPing` when it's ready (its title, sessions, weeks, seconds and model) or failed (the reason and seconds), each through `ping()` from `api/_lib/slack.ts`, after the answer and never failing the build.
Its events (`program_build_started`, `program_build_finished`, `program_started`, `session_finished`) are what the PostHog dashboards' program funnel reads (`npm run posthog`, `docs/ANALYTICS.md`).
