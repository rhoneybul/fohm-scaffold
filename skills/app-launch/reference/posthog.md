# Product analytics (PostHog)

Optional; off until its key is set.

**Why.** See which screens and features people use, from the web and the apps, without sending what they write.

## What the agent does

With Claude's **PostHog** connector:

- Makes an organisation of the app's own (one per app keeps billing and data apart) and its project.
- Puts the project's API key (public by design) into Vercel as `POSTHOG_KEY`, and `POSTHOG_HOST` from the project's region (`https://eu.i.posthog.com` for the EU).
- Builds the funnels and insights for each feature as it ships.

Without the connector, the person does it: posthog.com → new project → copy the Project API key into Vercel.

Events sent from the start: `$pageview`, `signed_up`, `entry_created`, `game_finished`, `ai_question`, `checkout_started`, `pro_started`, `pro_ended`.
Add more with `track()` from `src/lib/analytics.ts`, named `noun_verbed`: what people did, never what they wrote.

## What is the person's

- Nothing when the agent has the connector; without it, make the project and copy its key (above).

## How to check it

- `curl -s https://<domain>/api/health | jq .integrations.posthog` is `true` after a redeploy; events arrive in the project (the connector's event queries).
