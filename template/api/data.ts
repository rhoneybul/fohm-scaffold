/**
 * The app's data API.
 *   GET    /api/data                          → every collection, as far as the caller may see it
 *   POST   /api/data { collection, records }  → upsert (by id)
 *   DELETE /api/data?collection=…&id=…        → delete one record
 * The owner sees and changes everything: the dashboard shows all of it
 * (AGENTS.md). Members see and write only their own rows (MEMBER_WRITES), and
 * never the owner's private notes or fields (OWNER_ONLY).
 */
import type postgres from 'postgres';

import { actorFrom, isOwner, type Actor } from './_lib/access.js';
import * as notify from './_lib/notify.js';
import { COLLECTIONS, HttpError, TABLES, handle, isCollection, sql, toRecord, toRow, type Collection } from './_lib/db.js';

type Row = Record<string, any>;

/**
 * What each collection shows the caller. Keyed by every Collection, so a new
 * table can't ship without saying what the owner and a member read of it.
 */
const READS: Record<Collection, (db: postgres.Sql, a: Actor) => Promise<Row[]>> = {
  users: (db, a) => (isOwner(a) ? db`select * from accounts order by created_at` : db`select * from accounts where id = ${a.id}`),
  entries: (db, a) =>
    isOwner(a) ? db`select * from entries order by created_at desc` : db`select * from entries where member_id = ${a.id} order by created_at desc`,
  scores: (db, a) =>
    isOwner(a) ? db`select * from scores order by created_at desc` : db`select * from scores where member_id = ${a.id} order by created_at desc`,
  ai: (db, a) => (isOwner(a) ? db`select * from ai_chats order by created_at desc` : db`select * from ai_chats where member_id = ${a.id} order by created_at desc`),
  devices: (db, a) =>
    isOwner(a) ? db`select * from push_tokens order by created_at desc` : db`select * from push_tokens where member_id = ${a.id} order by created_at desc`,
};

/** What a member may write in each collection (the owner may write anything). */
const MEMBER_WRITES: Record<Collection, 'profile' | 'own rows' | 'add only' | 'nothing'> = {
  users: 'profile',
  entries: 'own rows',
  // A score, once played, stands: a member adds new ones but never edits them.
  scores: 'add only',
  // Questions and answers are written by /api/ai only, so they're always the real exchange.
  ai: 'nothing',
  // A device the member signed in on, for push notifications.
  devices: 'own rows',
};
const PROFILE_FIELDS = ['name'];
/** Fields on a member's own rows that only the owner writes. */
const OWNER_ONLY: Partial<Record<Collection, string[]>> = { entries: ['reply'] };
/** Fields on an account only the member writes; the owner's copy, up to 20 s old, never overwrites them. */
const MEMBER_ONLY: Partial<Record<Collection, string[]>> = { users: ['name', 'email', 'role', 'created_at'], entries: ['member_id', 'title', 'body', 'created_at'] };

const setFrom = (columns: string[]) => columns.filter((k) => k !== 'id').map((k) => `"${k}" = excluded."${k}"`).join(', ');

export const GET = handle(async (req) => {
  const actor = await actorFrom(req);
  const db = sql();
  const entries = await Promise.all(COLLECTIONS.map(async (c) => [c, (await READS[c](db, actor)).map((r) => toRecord(c, r))] as const));
  const out = Object.fromEntries(entries) as Record<Collection, Row[]>;
  // The owner's private notes about a member stay the owner's.
  if (!isOwner(actor)) for (const u of out.users) delete u.ownerNotes;
  return Response.json(out);
});

async function ownerWrites(db: postgres.Sql, c: Collection, rows: Row[]) {
  const columns = Object.keys(rows[0]);
  const keep = MEMBER_ONLY[c] ?? [];
  const update = setFrom(columns.filter((k) => !keep.includes(k)));
  await db`insert into ${db(TABLES[c].table)} ${db(rows, columns)} on conflict (id) do update set ${db.unsafe(update)}`;
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
      if (!isOwner(actor) && !old.has(r.id)) await notify.newEntry(actor.id, r.title);
      if (isOwner(actor) && r.reply && r.reply !== old.get(r.id)?.reply) {
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
  const before = c === 'entries' ? await db`select id, reply from entries where id in ${db(rows.map((r) => r.id))}` : [];
  if (isOwner(actor)) await ownerWrites(db, c, rows);
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
  if (!isOwner(actor)) {
    if (MEMBER_WRITES[c] !== 'own rows') throw new HttpError(403, 'Only the owner can remove that');
    const mine = await db`select 1 from ${db(table)} where id = ${id} and ${db(owner)} = ${actor.id}`;
    if (!mine.length) throw new HttpError(404, 'Not found');
  }
  await db`delete from ${db(table)} where id = ${id}`;
  return Response.json({ deleted: id });
});
