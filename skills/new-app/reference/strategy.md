# The strategy

How fohm-scaffold apps are made, end to end: the pattern behind Etapa (cycling), Aluzam (guitar), Naz (surfing) and Strawberry Fields (backcountry skiing).

## The thesis

Take a business that already sells coaching (lessons, retreats, programmes, video feedback) and turn what it sells into a recurring product: **"your coach in your pocket, between sessions."**
A structured progression meets people where they are and tells them what to work on next; the coach stays real and one tap away.
The wedge is the relationship (the coach's method, brand, content and community), not the software.
Generic content and AI coaching are commoditising; *this* coach, made continuous, is not.
With no real coach, the app is programs: it speaks as itself and never invents a person (`--coach no`).

## The order of work

### 1. Discover

- **The idea and the business**: in a sentence, what it does and for whom, and what the business already sells.
- **A name**: propose several, check the domains and the GitHub name, let the owner choose.
- **The domain and the business**: buy the domain in the owner's name as soon as the name is chosen; if the business isn't registered (and it will take money or sell in the stores under its own name), register it now: it's the seller everywhere, and the store accounts that depend on it take weeks.
- **What only they can do, on one page**: the checklist Artifact (the app-launch skill), shared with the owner from the first day, slowest steps first.
- **Market research** ([research.md](research.md)).
- **The product brief** (`PRODUCT.md`): users, purpose, positioning, operating context, scope, brand commitments, the evidence on hand, and principles. Agents decide from it.
- **Open questions for the owner**: audience size, revenue split, their time, ambition, budget, content rights.

### 2. Design

- **The house style first, references within it** (the app-design skill): the app starts in the Naz and Etapa family look, and the apps the owner likes say what to adopt within it, screen by screen. A generic first look is the one that gets rejected ("AI-generated").
- **The owner's own brand**: their logo and artwork in `assets/brand/`, traced, never redrawn by hand; the accent picked from it; the system recorded in `DESIGN.md`.
- **Photos everywhere** (the app-design skill's `reference/photos.md`).

### 3. Build: a lean skeleton

1. Onboarding and a **level assessment** (meet people where they are).
2. A **progression path**: the next one to three things to work on.
3. **Videos and questions to the coach**, uploaded from the phone and answered from the dashboard, in writing or with a video back (the video-analysis hook: what they already sell, made recurring).
4. **Check-ins**: what they worked on and how it *felt* (feel over fake numbers).
5. A **library** reusing content the owner already has.
6. **The goals they train for** and the courses that prepare for them, with photos ([research.md](research.md)), and **programs dated to a goal** ([programs.md](programs.md)).
7. The **owner's dashboard**: everyone, everything they do, what needs a reply; with more than one coach, each coach sees their own members.

Deliberately out: rebuilding what other tools do well (forecasts, community platforms, booking), inaccurate auto-tracking, AI that replaces the coach.

**Rules while building**: Naz and Etapa first ([borrow.md](borrow.md)); the owner sees everything members do (enforced by the typechecker); the backend owns the database; migrations ship with the code; demo mode works with no setup; review every feature (code and design) and act on it; a preview to the owner after every feature.

### 4. Launch

Supabase, Vercel, an inbox for the support address, the owner's account, smoke tests after every deploy, the privacy policy and terms (the app-launch skill).

### 5. Grow

Monetise the people already there before chasing the whole market: Pro (Stripe) for the path and coach feedback; analytics (PostHog) and error reports (Sentry) from day one; email and push so replies land; the AI assistant as a first line, with the human coach as the premium tier; then the iOS and Android apps in the stores (their developer accounts started long before: verifying one takes days).

### 6. Hand over

[handover.md](handover.md): the proposal, a pitch deck, and the handover so the owner builds on it with Claude Code.
