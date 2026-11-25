---
name: app-launch
description: Take an app made with fohm-scaffold live, on the web and in the app stores. Use when launching, deploying or going live, setting up Supabase, Vercel, the domain, email, payments, analytics, error reports, push or the App Store and Google Play, or when the person asks what is left for them to do.
---

# Launch an app

The agent does everything it can through Claude's connectors (Supabase, Vercel, PostHog, Sentry, GitHub, Expo), and puts what only the person can do on one checklist page.
Each service has one reference file in the same shape: **Why**, **What the agent does**, **What is the person's**, **How to check it**.
There is no state engine: the checks are commands the agent runs itself, and the checklist page is the record.

## Rules

- **Secrets never go through the chat.** Keys, passwords and codes go straight into Vercel's environment variables (Sensitive) or the service's own settings, typed by the person. Ask where they put it, never what it is. Public parts (a publishable key, a DSN, a PostHog key) the agent may set itself.
- **Integrations are off until their keys are set.** The code works with any of them off; `/api/health` reports which are on.
- **Check, don't ask.** After each step, run its check and say what it showed.
- **The owner's accounts, not yours.** The domain, Stripe, Apple and Google are in the business's name, with the agent's person added as a team member.

## 0. The accounts every app shares

Before asking for any key, read [reference/accounts.md](reference/accounts.md): the Apple team, Expo account, Play account, Vercel team and GitHub organisation are set up once and shared by every app, so the person is asked only for what is new to this app.

## 1. Publish the person's checklist on the first day

1. Copy [reference/checklist.html](reference/checklist.html) into the app as `.launch/checklist.html` (commit it; it holds no secrets).
2. Fill it from the **What is the person's** lines of each service below, in this app's words (`<domain>`, `<support email>`, `<App>`, `<project ref>` filled in once known; the business lines for its country only).
3. Order it slowest first: under *Start these now*, [the domain](reference/domain.md), [the business](reference/business.md) and [the store accounts](reference/store-accounts.md) (a D-U-N-S number can take 30 days); then Launch, then Grow.
4. Swap the accent tokens for the app's accent, keeping 4.5:1.
5. Publish it as an Artifact (icon "checklist", description "What only you can do to get <App> live: the domain, the business, accounts, payments and keys.") and give the person the link.
6. Keep the link in the app's `AGENTS.md`, and republish the same file to the same link whenever a step is done or changes. Done steps move to *Done and skipped* at the foot.

## 2. Launch: in this order

| Service | Reference | The agent's connector |
| -- | -- | -- |
| The shared accounts | [accounts.md](reference/accounts.md) | Expo, Vercel, GitHub |
| GitHub | [github.md](reference/github.md) | GitHub tools, or `gh` |
| Supabase | [supabase.md](reference/supabase.md) | Supabase |
| Vercel and the live site | [vercel.md](reference/vercel.md) | Vercel |
| The domain on Vercel | [domain.md](reference/domain.md) | Vercel domains |
| The support inbox | [inbox.md](reference/inbox.md) | `dig` |
| The owner's account | [owner.md](reference/owner.md) | |
| Smoke tests | [smoke.md](reference/smoke.md) | `gh` |
| Privacy policy and terms | [legal.md](reference/legal.md) | |

The launch is done when `curl -s https://<domain>/api/health` says `"db": "ok"` with its migration and `auth`, the Smoke workflow is green, and the owner has opened `/admin`.

## 3. Grow: each optional, each off until its keys are set

| Service | Reference | The agent's connector |
| -- | -- | -- |
| PostHog | [posthog.md](reference/posthog.md) | PostHog |
| Sentry | [sentry.md](reference/sentry.md) | Sentry |
| Email (Resend), DMARC and Supabase's SMTP | [resend.md](reference/resend.md) | Vercel domains, `dig` |
| Stripe | [stripe.md](reference/stripe.md) | |
| The AI assistant (Claude) | [claude.md](reference/claude.md) | |
| Continue with Google | [google.md](reference/google.md) | |
| Push | [push.md](reference/push.md) | Expo |
| The iOS and Android builds | [eas.md](reference/eas.md) | Expo |
| TestFlight, from the session | [testflight.md](reference/testflight.md) | GitHub tools, Expo |
| The stores | [stores.md](reference/stores.md) | Expo |
| Tapp | [tapp.md](reference/tapp.md) | |

PostHog and Sentry go on from day one; the rest when the owner wants them.
Each integration's check reads `curl -s https://<domain>/api/health | jq .integrations`.

## 4. Release machinery: borrow it

For CI with an `All tests` gate, publishing the store apps with a version bumped from tags, over-the-air updates and their runbook, and migrations before each deploy, port Naz's and Etapa's rather than writing new ones: the new-app skill's `reference/borrow.md`, *Workflows*.

## Checks the agent runs

- The live site: `curl -s https://<domain>/api/health`.
- Mail: `dig +short MX <domain>`, `dig +short TXT _dmarc.<domain>`, `dig +short TXT resend._domainkey.<domain>`.
- A name or domain: `curl -s -o /dev/null -w '%{http_code}' https://rdap.org/domain/<domain>` (404 is free), else Vercel's `get_bulk_availability`.
- Where `dig` is blocked, DNS over HTTPS: `curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=<name>&type=<A|MX|TXT>'`.
- GitHub: `git remote get-url origin`, `gh run list --limit 3`.
- The apps: `app.json`'s `extra.apiUrl` is the live https URL and the bundle id isn't `com.example...`.
