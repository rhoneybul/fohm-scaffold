/**
 * Supabase Auth on the server: who does this bearer token belong to?
 *
 * Verified by asking Supabase Auth itself (GET /auth/v1/user), which works for
 * every key type and project age; results are cached for a minute per
 * function instance so a burst of requests costs one round trip.
 */
import { HttpError } from './db.js';

export interface AuthUser {
  id: string;
  email: string;
}

/** Project URL: SUPABASE_URL, or derived from the pooler user in SUPABASE_DB_URL (postgres.<ref>). */
export function supabaseUrl(): string | null {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL.replace(/\/$/, '');
  const ref = process.env.SUPABASE_DB_URL?.match(/postgres\.([a-z0-9]{20})[:@]/)?.[1];
  return ref ? `https://${ref}.supabase.co` : null;
}

export const publishableKey = () => process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || null;

/** Public auth settings the app needs to start Supabase Auth, or null when login isn't configured. */
export function authConfig() {
  const url = supabaseUrl();
  const key = publishableKey();
  return url && key ? { url, key } : null;
}

const cache = new Map<string, { user: AuthUser; until: number }>();

export async function userFromToken(token: string): Promise<AuthUser> {
  const hit = cache.get(token);
  if (hit && hit.until > Date.now()) return hit.user;
  const cfg = authConfig();
  if (!cfg) throw new HttpError(503, 'Login isn’t configured on the server');
  const res = await fetch(`${cfg.url}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: cfg.key } });
  if (res.status === 401 || res.status === 403) throw new HttpError(401, 'Your session has expired. Sign in again.');
  if (!res.ok) throw new HttpError(502, 'Couldn’t check your sign-in');
  const body = (await res.json()) as { id: string; email: string };
  const user = { id: body.id, email: (body.email ?? '').toLowerCase() };
  cache.set(token, { user, until: Date.now() + 60_000 });
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  return user;
}

export function bearer(req: Request): string {
  const h = req.headers.get('authorization') ?? '';
  const token = h.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new HttpError(401, 'Sign in first');
  return token;
}
