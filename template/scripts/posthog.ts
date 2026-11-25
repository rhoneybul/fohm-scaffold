/**
 * Makes the app's dashboards in PostHog (scripts/posthogDashboards.ts,
 * docs/ANALYTICS.md): `npm run posthog -- --dry-run` says what it would make,
 * `npm run posthog` makes or updates them, and `npm run posthog -- --json`
 * prints them for the PostHog connector when there's no personal API key (the
 * app-launch skill's reference/posthog.md). Needs a personal API key with
 * write access to dashboards and insights, and the project's id, from
 * PostHog → Settings (never in the repository or a chat):
 *   POSTHOG_PERSONAL_API_KEY=phx_… POSTHOG_PROJECT_ID=12345 npm run posthog
 * POSTHOG_APP_HOST is https://eu.posthog.com for a project in the EU.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { EVENTS } from '../src/lib/events';
import { createPostHogSetup, dashboardsFor, documented } from './posthogDashboards';

const dashboards = dashboardsFor(EVENTS, documented(readFileSync(path.join(import.meta.dirname, '..', 'docs', 'ANALYTICS.md'), 'utf8')));

if (process.argv.includes('--json')) {
  console.log(JSON.stringify(dashboards.map(({ name, description, insights }) => ({ name, description, insights: insights.map(({ name, description, query }) => ({ name, description, query })) })), null, 2));
  process.exit(0);
}

const { POSTHOG_PERSONAL_API_KEY: apiKey, POSTHOG_PROJECT_ID: projectId, POSTHOG_APP_HOST: host } = process.env;
if (!apiKey || !projectId) {
  console.error('Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID, or print the dashboards for the PostHog connector with --json (docs/ANALYTICS.md).');
  process.exit(1);
}
createPostHogSetup({ apiKey, projectId, host, dryRun: process.argv.includes('--dry-run') })
  .run(dashboards)
  .catch((e: Error) => {
    console.error(e.message);
    process.exit(1);
  });
