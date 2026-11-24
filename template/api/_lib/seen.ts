/**
 * When each account was last in the app, and on what: the dashboard's People
 * and each member's page show it. The app names its platform and version in
 * two headers on every request (x-app-platform, x-app-version); the server
 * notes them when the app asks who's signed in (GET /api/accounts), at most
 * every five minutes an account.
 */
import { sql } from './db.js';

const PLATFORMS = new Set(['web', 'ios', 'android']);
const VERSION = /^[0-9A-Za-z.+_-]{1,32}$/;

/** The platform and version a request says it came from; anything malformed is left out. */
export function clientOf(headers: Headers): { platform: string | null; version: string | null } {
  const platform = (headers.get('x-app-platform') ?? '').toLowerCase();
  const version = headers.get('x-app-version') ?? '';
  return { platform: PLATFORMS.has(platform) ? platform : null, version: VERSION.test(version) ? version : null };
}

/** Notes the account as seen now. Never fails the request: it's only the dashboard's to know. */
export async function noteSeen(accountId: string, headers: Headers) {
  const { platform, version } = clientOf(headers);
  try {
    await sql()`update accounts set last_seen_at = now(),
        last_platform = coalesce(${platform}, last_platform), last_app_version = coalesce(${version}, last_app_version)
      where id = ${accountId} and (last_seen_at is null or last_seen_at < now() - interval '5 minutes'
        or last_platform is distinct from coalesce(${platform}, last_platform) or last_app_version is distinct from coalesce(${version}, last_app_version))`;
  } catch (e) {
    console.warn('seen: not noted', (e as Error).message);
  }
}
