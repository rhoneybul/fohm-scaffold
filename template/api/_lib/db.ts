/**
 * Database access for the backend. Only /api functions touch Postgres; the
 * app never sees a database credential. Connects with SUPABASE_DB_URL, the
 * same variable the deploy-time migration step uses.
 */
import postgres from 'postgres';

import { captureException } from './sentry.js';

let client: postgres.Sql | null = null;

export const dbConfigured = () => !!process.env.SUPABASE_DB_URL;

export function sql(): postgres.Sql {
  if (!process.env.SUPABASE_DB_URL) throw new HttpError(503, 'Database not configured');
  if (!client) {
    client = postgres(process.env.SUPABASE_DB_URL, {
      max: 1, // one connection per serverless instance
      prepare: false, // works through both Supabase poolers
      idle_timeout: 20,
      ssl: /localhost|127\.0\.0\.1/.test(process.env.SUPABASE_DB_URL) ? false : 'require',
      // Keep `date` columns as 'yyyy-mm-dd' strings instead of shifting them through JS Dates.
      types: { date: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x } },
    });
  }
  return client;
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Wraps a handler so thrown HttpErrors become JSON responses. */
export function handle(fn: (req: Request) => Promise<Response>) {
  return async (req: Request) => {
    try {
      return await fn(req);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      // Bad input (an impossible date, a reference to nothing) is the caller's, not a crash.
      const code = (e as { code?: string })?.code ?? '';
      if (/^22/.test(code) || ['23502', '23503', '23514'].includes(code)) return Response.json({ error: 'Some of that didn’t look right. Check it and try again.' }, { status: 400 });
      console.error(e);
      await captureException(e, { url: req.url, method: req.method });
      return Response.json({ error: 'Server error' }, { status: 500 });
    }
  };
}

// ---------------------------------------------------------------------------
// Tables: app collection name → table + camelCase ⇄ snake_case.
// Every field listed here also needs a line in ADMIN_SEES (src/lib/activity.ts)
// saying where the owner sees it; `npm run typecheck` fails until it has one.
// ---------------------------------------------------------------------------
type Col = readonly [camel: string, snake: string, kind?: 'json' | 'date' | 'ts'];
/** Keeps each field name as a literal type, so ADMIN_SEES can require them all. */
const cols = <const T extends readonly Col[]>(list: T) => list;

export const TABLES = {
  users: {
    table: 'accounts',
    owner: 'id',
    cols: cols([
      ['id', 'id'],
      ['role', 'role'],
      ['name', 'name'],
      ['email', 'email'],
      ['ownerNotes', 'owner_notes'],
      ['coachId', 'coach_id'],
      ['level', 'level'],
      ['assessment', 'assessment', 'json'],
      ['goal', 'goal'],
      ['assessedAt', 'assessed_at', 'ts'],
      ['plan', 'plan'],
      ['planUntil', 'plan_until', 'ts'],
      ['planSource', 'plan_source'],
      ['stripeExtraSubscription', 'stripe_extra_subscription'],
      ['createdAt', 'created_at', 'ts'],
    ]),
  },
  entries: {
    table: 'entries',
    owner: 'member_id',
    cols: cols([
      ['id', 'id'],
      ['memberId', 'member_id'],
      ['title', 'title'],
      ['body', 'body'],
      ['link', 'link'],
      ['mediaPath', 'media_path'],
      ['mediaType', 'media_type'],
      ['reply', 'reply'],
      ['replyMediaPath', 'reply_media_path'],
      ['replyMediaType', 'reply_media_type'],
      ['createdAt', 'created_at', 'ts'],
      ['updatedAt', 'updated_at', 'ts'],
    ]),
  },
  scores: {
    table: 'scores',
    owner: 'member_id',
    cols: cols([
      ['id', 'id'],
      ['memberId', 'member_id'],
      ['game', 'game'],
      ['points', 'points'],
      ['seconds', 'seconds'],
      ['createdAt', 'created_at', 'ts'],
    ]),
  },
  checkins: {
    table: 'checkins',
    owner: 'member_id',
    cols: cols([
      ['id', 'id'],
      ['memberId', 'member_id'],
      ['date', 'date', 'date'],
      ['skillId', 'skill_id'],
      ['minutes', 'minutes'],
      ['feel', 'feel'],
      ['note', 'note'],
      ['createdAt', 'created_at', 'ts'],
    ]),
  },
  progress: {
    table: 'progress',
    owner: 'member_id',
    cols: cols([
      ['id', 'id'],
      ['memberId', 'member_id'],
      ['skillId', 'skill_id'],
      ['doneAt', 'done_at', 'ts'],
      ['ownerNote', 'owner_note'],
      ['createdAt', 'created_at', 'ts'],
    ]),
  },
  ai: {
    table: 'ai_chats',
    owner: 'member_id',
    cols: cols([
      ['id', 'id'],
      ['memberId', 'member_id'],
      ['question', 'question'],
      ['answer', 'answer'],
      ['model', 'model'],
      ['createdAt', 'created_at', 'ts'],
    ]),
  },
  devices: {
    table: 'push_tokens',
    owner: 'member_id',
    cols: cols([
      ['id', 'id'],
      ['memberId', 'member_id'],
      ['token', 'token'],
      ['platform', 'platform'],
      ['createdAt', 'created_at', 'ts'],
    ]),
  },
} as const;

export type Collection = keyof typeof TABLES;
export const COLLECTIONS = Object.keys(TABLES) as Collection[];
export const isCollection = (v: unknown): v is Collection => typeof v === 'string' && v in TABLES;
/** The app's field names in one collection, as literal types. */
export type FieldOf<C extends Collection> = (typeof TABLES)[C]['cols'][number][0];

/** Postgres row → app record (camelCase, nulls dropped). */
export function toRecord(c: Collection, row: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [camel, snake, kind] of TABLES[c].cols as readonly Col[]) {
    let v = row[snake];
    if (v === null || v === undefined) continue;
    if (kind === 'ts' && v instanceof Date) v = v.toISOString();
    out[camel] = v;
  }
  return out;
}

/** App record → Postgres row (snake_case; missing fields become null, timestamps default to now). */
export function toRow(c: Collection, rec: Record<string, any>) {
  const out: Record<string, any> = {};
  const now = new Date().toISOString();
  for (const [camel, snake, kind] of TABLES[c].cols as readonly Col[]) {
    let v = rec[camel];
    if (v === undefined && (snake === 'created_at' || snake === 'updated_at')) v = now;
    if (kind === 'json' && v !== undefined && v !== null) v = sql().json(v);
    out[snake] = v === undefined ? null : v;
  }
  // A plan is set only by Stripe and the owner's switch, and a coach only by the owner's assign: never by a record save.
  if (c === 'users') for (const k of ['plan', 'plan_until', 'plan_source', 'stripe_extra_subscription', 'coach_id']) delete out[k];
  return out;
}
