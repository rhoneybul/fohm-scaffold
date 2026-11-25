# Error reports (Sentry)

Optional; off until its DSN is set.

**Why.** Know when something breaks for someone, on the web, in the apps or on the server, before they tell you.
Uncaught errors and crashed screens in the web and the apps, and every 500 on the server.

## What the agent does

With Claude's **Sentry** connector:

- Makes a team of the app's own, a project on it (platform React Native), and puts its DSN (public by design) into Vercel as `SENTRY_DSN` (`create_team`, `create_project`, `find_dsns`).
- Reads issues when something breaks (`search_issues`).
- Later, for native crash symbolication and source maps, adds `@sentry/react-native` (see its Expo guide).

Without the connector: sentry.io → new project (platform: React Native) → copy the DSN into Vercel.

## What is the person's

- Only if the agent's create is refused ("disabled this feature for members"): Sentry → Settings → the organisation → General Settings → Let Members Create Projects on, or create the project themselves.

## How to check it

- `curl -s https://<domain>/api/health | jq .integrations.sentry` is `true` after a redeploy.
