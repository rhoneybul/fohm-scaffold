# Product analytics (PostHog)

Optional; off until its key is set.

**Why.** See which screens and features people use, from the web and the apps, without sending what they write.

## What the agent does

With Claude's **PostHog** connector:

- Makes an organisation of the app's own (one per app keeps billing and data apart) and its project.
- Puts the project's API key (public by design) into Vercel as `POSTHOG_KEY`, and `POSTHOG_HOST` from the project's region (`https://eu.i.posthog.com` for the EU).
- Makes the app's dashboards (Overview, Onboarding and, with programs, Programs), read from the event catalogue (the template's `docs/ANALYTICS.md`, *Dashboards*), as below.
- Builds the funnels and insights for each feature as it ships, adding them to `DASHBOARDS` in `scripts/posthogDashboards.ts`.

### The dashboards, with or without a personal API key

With a personal API key in the shell (PostHog → Settings → Personal API keys, scoped to dashboards and insights, write; typed by the person, never in chat): `POSTHOG_PERSONAL_API_KEY=… POSTHOG_PROJECT_ID=… npm run posthog`. It prints each dashboard's link.

Without one, the agent makes the same dashboards through the PostHog connector's `exec` tool:

1. `npm run posthog -- --json` in the app prints each dashboard (`name`, `description`) and its insights (`name`, `description`, `query`: a `TrendsQuery` or `FunnelsQuery`).
2. `exec` → `learn posthog:building-a-dashboard` once, then `call projects-get {}` (and `organizations-get`, `switch-organization`, `switch-project` if needed) to find the project whose `api_token` (from `call project-get {}`) is the app's `POSTHOG_KEY`, as `/api/health` reports it.
3. For each dashboard: `call dashboards-get-all {"search": "<name>"}`; if it isn't there, `call dashboard-create {"name": …, "description": …}`.
4. For each insight: look for it by name (`call insights-list {"search": "<name>"}`); if it's there, `call insight-update` with its id, else `call insight-create {"name": …, "description": …, "query": {"kind": "InsightVizNode", "source": <query>}, "dashboards": [<dashboard id>]}`. Run `info` once on each tool before its first `call`.
5. Lay out each dashboard with `dashboard-update` (funnels 6×4, trends over time 6×4, pies and bars 4×4, `show_description: false`), check with `dashboard-insights-run`, and give the person each dashboard's `_posthogUrl`.

Without the connector, the person does it: posthog.com → new project → copy the Project API key into Vercel.

Events sent from the start: `$pageview`, `signed_up`, `entry_created`, `game_finished`, `ai_question`, `checkout_started`, `pro_started`, `pro_ended`.
Add more with `track()` from `src/lib/analytics.ts`, named `noun_verbed`: what people did, never what they wrote.

## What is the person's

- Nothing when the agent has the connector; without it, make the project and copy its key (above).

## How to check it

- `curl -s https://<domain>/api/health | jq .integrations.posthog` is `true` after a redeploy; events arrive in the project (the connector's event queries).
- `npm run posthog -- --dry-run` (with the key) says each dashboard and insight would be updated, not made: they're all there.
