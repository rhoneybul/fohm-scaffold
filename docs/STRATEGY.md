# The strategy

How fohm-scaffold apps are made, end to end. It's the pattern behind Etapa
(cycling) and Aluzam (guitar), written down so the wizard can follow it and
so can an agent.

## The thesis

Take a business that already sells coaching (lessons, retreats, programmes,
video feedback) and turn what it sells into a recurring product: **"your
coach in your pocket, between sessions."** A structured progression meets
people where they are and tells them what to work on next; the coach stays
real and one tap away.

The wedge is the relationship (the coach's method, brand, content and
community), not the software. Generic content and AI coaching are
commoditising; *this* coach, made continuous, is not.

## The order of work

### 1. Discover
- **The idea and the business**: in a sentence, what it does and for whom,
  and what the business already sells.
- **A name**: propose several, check the domains and the GitHub name
  (`fohm-scaffold names`), let the owner choose.
- **Market research** (`docs/RESEARCH.md`): the crowded categories next door
  (what this isn't), the incumbent to study, the strategic insight, and
  bottom-up sizing from the owner's own audience first. Cite sources; never
  invent numbers.
- **The product brief** (`PRODUCT.md`): users, purpose, positioning,
  operating context, scope, brand commitments, the evidence on hand, and
  principles. Agents decide from it.
- **Open questions for the owner**: audience size, revenue split, their time,
  ambition, budget, content rights.

### 2. Design
- **References, not templates.** Ask which apps the owner likes the feel of;
  pull their screens from Mobbin (onboarding, home, progress, paywall) into
  DESIGN.md with what to take from each. A generic first look is the one
  that gets rejected ("AI-generated").
- **The owner's own brand**: their logo and artwork in `assets/brand/`,
  traced, never redrawn by hand; colours picked from it; the system recorded
  in DESIGN.md (a north star, colours with fixed jobs, do's and don'ts).
- **House rules**: no emoji, no decorative gradients or glass, no eyebrow
  labels, 4.5:1 contrast, touch-first, phone and laptop from one layout.

### 3. Build: a lean skeleton
1. Onboarding and a **level assessment** (meet people where they are)
2. A **progression path**: the next one to three things to work on
3. **Videos and questions to the coach**, uploaded from the phone and
   answered from the dashboard, in writing or with a video back (the
   video-analysis hook: what they already sell, made recurring)
4. **Check-ins**: what they worked on and how it *felt* (feel over fake numbers)
5. A **library** reusing content the owner already has
6. The **owner's dashboard**: everyone, everything they do, what needs a
   reply; with more than one coach, each coach sees their own members

Deliberately out: rebuilding what other tools do well (forecasts, community
platforms, booking), inaccurate auto-tracking, AI that replaces the coach.

**Rules while building**: the owner sees everything members do (enforced by
the typechecker); the backend owns the database; migrations ship with the
code; demo mode works with no setup; review every feature (code and design)
and act on it.

### 4. Launch
Supabase, Vercel, the owner's account, smoke tests after every deploy, the
privacy policy and terms.

### 5. Grow
Monetise the people already there before chasing the whole market: Pro
(Stripe) for the path and coach feedback; analytics (PostHog) and error
reports (Sentry) from day one; email and push so replies land; the AI
assistant as a first line, with the human coach as the premium tier; then
the iOS and Android apps in the stores.

### 6. Hand over
- **The proposal** (`docs/PROPOSAL.md`) and a **pitch deck** in the owner's
  brand: thesis, market, skeleton, roadmap (skeleton → monetise the existing
  audience → deepen the coaching → scale with AI and more coaches), open
  questions, and how you work together (IP, time, handover, revenue
  definition).
- **The handover** (`docs/HANDOVER.md`): the owner builds on it with Claude
  Code. A thorough `CLAUDE.md`/`AGENTS.md`, a cheat-sheet for asking for
  changes, what's safe to change and what to ask about first, and a recorded
  walkthrough. The skeleton is a springboard, not the finished app; be honest
  about who brings the build capacity.
