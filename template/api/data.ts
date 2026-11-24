/**
 * The app's data API.
 *   GET    /api/data                          → every collection, as far as the caller may see it
 *   POST   /api/data { collection, records }  → upsert (by id)
 *   DELETE /api/data?collection=…&id=…        → delete one record
 * The owner sees and changes everything: the dashboard shows all of it
 * (AGENTS.md). A coach sees their own members (accounts.coach_id) and writes
 * only the staff's fields on them (STAFF_FIELDS: replies, notes). Members see
 * and write only their own rows (MEMBER_WRITES), never the staff's private
 * notes or fields (OWNER_ONLY).
 */
import type postgres from 'postgres';

import { actorFrom, isOwner, isStaff, type Actor } from './_lib/access.js';
import * as notify from './_lib/notify.js';
import { COLLECTIONS, HttpError, TABLES, handle, isCollection, sql, toRecord, toRow, type Collection } from './_lib/db.js';

type Row = Record<string, any>;

/**
 * The rows of a member-owned table the caller may see: everything for the
 * owner, their own members' for a coach, their own for a member.
 */
function scoped(db: postgres.Sql, a: Actor, table: string, order: string) {
  const sorted = db.unsafe(`order by ${order}`);
  if (isOwner(a)) return db`select * from ${db(table)} ${sorted}`;
  if (a.role === 'coach') return db`select * from ${db(table)} where member_id in (select id from accounts where coach_id = ${a.id}) ${sorted}`;
  return db`select * from ${db(table)} where member_id = ${a.id} ${sorted}`;
}

/**
 * What each collection shows the caller. Keyed by every Collection, so a new
 * table can't ship without saying what the owner, a coach and a member read of it.
 */
const READS: Record<Collection, (db: postgres.Sql, a: Actor) => Promise<Row[]>> = {
  // Staff see the staff (names on the dashboard) and their members; a member sees themselves and their coach.
  users: (db, a) =>
    isOwner(a)
      ? db`select * from accounts order by created_at`
      : a.role === 'coach'
        ? db`select * from accounts where id = ${a.id} or coach_id = ${a.id} or role in ('owner', 'coach') order by created_at`
        : db`select * from accounts where id = ${a.id} or id = (select coach_id from accounts where id = ${a.id}) order by created_at`,
  entries: (db, a) => scoped(db, a, 'entries', 'created_at desc'),
  scores: (db, a) => scoped(db, a, 'scores', 'created_at desc'),
  checkins: (db, a) => scoped(db, a, 'checkins', 'date desc, created_at desc'),
  progress: (db, a) => scoped(db, a, 'progress', 'done_at desc'),
  ai: (db, a) => scoped(db, a, 'ai_chats', 'created_at desc'),
  devices: (db, a) => scoped(db, a, 'push_tokens', 'created_at desc'),
};

/** What a member may write in each collection (the owner may write anything). */
const MEMBER_WRITES: Record<Collection, 'profile' | 'own rows' | 'add only' | 'nothing'> = {
  users: 'profile',
  entries: 'own rows',
  // A score, once played, stands: a member adds new ones but never edits them.
  scores: 'add only',
  // How practice went: the member's own log.
  checkins: 'own rows',
  // A skill the member has got; the coach's note on it is the coach's (OWNER_ONLY).
  progress: 'own rows',
  // Questions and answers are written by /api/ai only, so they're always the real exchange.
  ai: 'nothing',
  // A device the member signed in on, for push notifications.
  devices: 'own rows',
};
const PROFILE_FIELDS = ['name', 'level', 'assessment', 'goal', 'assessed_at', 'photo_path'];
/** Fields on a member's own rows that only the staff (the owner, their coach) write. */
const OWNER_ONLY: Partial<Record<Collection, string[]>> = { entries: ['reply', 'reply_media_path', 'reply_media_type'], progress: ['owner_note'] };
/** All a coach may write, and only on their own members' rows: the staff's side of things. */
const STAFF_FIELDS: Partial<Record<Collection, string[]>> = { users: ['owner_notes'], ...OWNER_ONLY };
/** Fields on an account only the member writes; the owner's copy, up to 20 s old, never overwrites them. */
const MEMBER_ONLY: Partial<Record<Collection, string[]>> = {
  users: ['name', 'email', 'role', 'level', 'assessment', 'goal', 'assessed_at', 'photo_path', 'created_at'],
  entries: ['member_id', 'title', 'body', 'link', 'media_path', 'media_type', 'created_at'],
  checkins: ['member_id', 'date', 'skill_id', 'minutes', 'feel', 'note', 'created_at'],
  progress: ['member_id', 'skill_id', 'done_at', 'created_at'],
};

const setFrom = (columns: string[]) => columns.filter((k) => k !== 'id').map((k) => `"${k}" = excluded."${k}"`).join(', ');

export const GET = handle(async (req) => {
  const actor = await actorFrom(req);
  const db = sql();
  const entries = await Promise.all(COLLECTIONS.map(async (c) => [c, (await READS[c](db, actor)).map((r) => toRecord(c, r))] as const));
  const out = Object.fromEntries(entries) as Record<Collection, Row[]>;
  // The staff's private notes about a member stay the staff's; a member sees only their coach's name.
  if (!isStaff(actor))
    out.users = out.users.map((u) => {
      delete u.ownerNotes;
      return u.id === actor.id ? u : { id: u.id, role: u.role, name: u.name, createdAt: u.createdAt };
    });
  return Response.json(out);
});

async function ownerWrites(db: postgres.Sql, c: Collection, rows: Row[]) {
  const columns = Object.keys(rows[0]);
  const keep = MEMBER_ONLY[c] ?? [];
  const update = setFrom(columns.filter((k) => !keep.includes(k)));
  await db`insert into ${db(TABLES[c].table)} ${db(rows, columns)} on conflict (id) do update set ${db.unsafe(update)}`;
}

/** A coach writes only the staff's fields, only on rows of their own members, and never adds rows. */
async function coachWrites(db: postgres.Sql, actor: Actor, c: Collection, rows: Row[]) {
  const fields = STAFF_FIELDS[c];
  if (!fields) throw new HttpError(403, 'Only the owner can change that');
  const memberCol = c === 'users' ? 'id' : 'member_id';
  await db.begin(async (tx) => {
    for (const row of rows) {
      const set = Object.fromEntries(fields.filter((k) => k in row).map((k) => [k, row[k]]));
      if (!Object.keys(set).length) continue;
      const hit = await tx`update ${tx(TABLES[c].table)} set ${tx(set)} where id = ${row.id}
        and ${tx(memberCol)} in (select id from accounts where coach_id = ${actor.id}) returning id`;
      if (!hit.length) throw new HttpError(403, 'That isn’t one of your members.');
    }
  });
}

/** A file attached to a message, or a profile photo, must be in the sender's own folder: the storage rules trust the path. */
function checkMedia(actor: Actor, c: Collection, records: Row[]) {
  const mine = (p: unknown) => p === undefined || p === null || (typeof p === 'string' && p.startsWith(`${actor.authId}/`) && !p.includes('..'));
  if (c === 'users') {
    for (const r of records) if (r.id === actor.id && !mine(r.photoPath)) throw new HttpError(403, 'You can only use your own uploads');
    return;
  }
  if (c !== 'entries') return;
  for (const r of records) {
    if (!isStaff(actor) && !mine(r.mediaPath)) throw new HttpError(403, 'You can only attach your own uploads');
    if (isStaff(actor) && !mine(r.replyMediaPath)) throw new HttpError(403, 'You can only attach your own uploads');
  }
}

async function memberWrites(db: postgres.Sql, actor: Actor, c: Collection, records: Row[], rows: Row[]) {
  const rule = MEMBER_WRITES[c];
  if (rule === 'nothing') throw new HttpError(403, 'Only the owner can change that');
  const ownerField = c === 'users' ? 'id' : 'memberId';
  if (records.some((r) => r[ownerField] !== actor.id)) throw new HttpError(403, 'You can only change your own data');

  // All or nothing: a batch that fails part-way saves none of it.
  await db.begin(async (tx) => {
    if (rule === 'profile') {
      for (const row of rows) await tx`update accounts set ${tx(row, PROFILE_FIELDS)}, updated_at = now() where id = ${row.id}`;
      return;
    }
    const { table, owner } = TABLES[c];
    if (rule === 'add only') {
      const columns = Object.keys(rows[0]);
      const added = await tx`insert into ${tx(table)} ${tx(rows, columns)} on conflict (id) do nothing returning id`;
      if (added.length < rows.length) throw new HttpError(409, 'That’s already saved');
      return;
    }
    const ownerOnly = OWNER_ONLY[c] ?? [];
    for (const row of rows) for (const k of ownerOnly) delete row[k];
    const columns = Object.keys(rows[0]);
    const ids = rows.map((x) => x.id);
    // An id that's already someone else's is never taken over.
    const taken = await tx`select 1 from ${tx(table)} where id in ${tx(ids)} and ${tx(owner)} <> ${actor.id} limit 1`;
    if (taken.length) throw new HttpError(403, 'You can only change your own data');
    await tx`insert into ${tx(table)} ${tx(rows, columns)} on conflict (id) do update set ${tx.unsafe(setFrom(columns.filter((k) => k !== 'created_at')))}`;
  });
}

/** Email and push for what's new: a member's new entry to the owners, an owner's reply to the member. Never fails the save. */
async function tellPeople(actor: Actor, rows: Row[], before: Row[]) {
  const old = new Map(before.map((r) => [r.id, r]));
  try {
    for (const r of rows) {
      if (!isStaff(actor) && !old.has(r.id)) await notify.newEntry(actor.id, r.title);
      const replied = (r.reply && r.reply !== old.get(r.id)?.reply) || (r.reply_media_path && r.reply_media_path !== old.get(r.id)?.reply_media_path);
      if (isStaff(actor) && replied) {
        const [e] = await sql()`select member_id, title from entries where id = ${r.id}`;
        if (e) await notify.newReply(e.member_id, e.title);
      }
    }
  } catch (e) {
    console.warn('notify:', (e as Error).message);
  }
}

export const POST = handle(async (req) => {
  const actor = await actorFrom(req);
  const body = (await req.json().catch(() => null)) as { collection?: unknown; records?: unknown } | null;
  if (!body || !isCollection(body.collection) || !Array.isArray(body.records)) throw new HttpError(400, 'Expected { collection, records[] }');
  const c = body.collection;
  const records = body.records.filter((r): r is Row => !!r && typeof r === 'object' && typeof (r as Row).id === 'string');
  if (!records.length) return Response.json({ saved: 0 });
  const rows = records.map((r) => toRow(c, r));
  const db = sql();
  // A device moves to whoever signs in on it now.
  if (c === 'devices') await db`delete from push_tokens where token in ${db(rows.map((r) => r.token))} and member_id <> ${actor.id}`;
  const before = c === 'entries' ? await db`select id, reply, reply_media_path from entries where id in ${db(rows.map((r) => r.id))}` : [];
  checkMedia(actor, c, records);
  if (isOwner(actor)) await ownerWrites(db, c, rows);
  else if (actor.role === 'coach') await coachWrites(db, actor, c, rows);
  else await memberWrites(db, actor, c, records, rows);
  if (c === 'entries') await tellPeople(actor, rows, before);
  return Response.json({ saved: rows.length });
});

export const DELETE = handle(async (req) => {
  const actor = await actorFrom(req);
  const url = new URL(req.url);
  const c = url.searchParams.get('collection');
  const id = url.searchParams.get('id');
  if (!isCollection(c) || !id) throw new HttpError(400, 'Expected ?collection=&id=');
  const { table, owner } = TABLES[c];
  const db = sql();
  if (actor.role === 'coach') throw new HttpError(403, 'Only the owner can remove that');
  if (!isOwner(actor)) {
    if (MEMBER_WRITES[c] !== 'own rows') throw new HttpError(403, 'Only the owner can remove that');
    const mine = await db`select 1 from ${db(table)} where id = ${id} and ${db(owner)} = ${actor.id}`;
    if (!mine.length) throw new HttpError(404, 'Not found');
  }
  await db`delete from ${db(table)} where id = ${id}`;
  return Response.json({ deleted: id });
});
