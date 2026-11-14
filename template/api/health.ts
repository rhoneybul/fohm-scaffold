/** GET /api/health: what the backend is connected to, and the public login settings (never secrets). */
import { authConfig } from './_lib/auth.js';
import { dbConfigured, handle, sql } from './_lib/db.js';

export const GET = handle(async () => {
  let db: 'off' | 'ok' | 'error' = 'off';
  let migration: string | null = null;
  if (dbConfigured()) {
    try {
      const rows = await sql()`select max(version) as v from supabase_migrations.schema_migrations`;
      migration = rows[0]?.v ?? null;
      db = 'ok';
    } catch (e) {
      console.error('health: db check failed', e);
      db = 'error';
    }
  }
  return Response.json({
    db,
    migration,
    auth: authConfig(), // { url, key }, both public by design, or null
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
});
