# Smoke tests against production

**Why.** The Smoke workflow tests the live site each time main deploys, so a broken release is caught in minutes.
It checks `/api/health` is up with its database, the web app and its pages load, and member data still needs a sign-in (`tests/smoke/`); it only reads.

## What the agent does

- After the first deploy: `gh variable set SMOKE_URL --body https://<domain>` (or GitHub → the repository → Settings → Secrets and variables → Actions → Variables → New: `SMOKE_URL`).
  Without it the workflow stays off.
- In-repo: the variable is `APP_SMOKE_URL`, and App smoke (`.github/workflows/app-smoke.yml`) runs by hand: Actions → App smoke → Run workflow, after each deploy (another project in the repository deploys too).
- After a merge, waits for the production deployment and the Smoke run, and reads its result.

## What is the person's

- Nothing, unless the agent can't set repository variables: then the one click above.

## How to check it

- `gh run list --workflow smoke.yml --limit 1` shows a green run after the latest deploy; locally, `SMOKE_URL=https://<domain> npm run test:smoke`.
