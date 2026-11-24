/**
 * Telling people something happened: email through Resend (RESEND_API_KEY and
 * EMAIL_FROM) and push notifications through Expo (to devices in
 * push_tokens; EXPO_ACCESS_TOKEN only if you turned on enhanced push
 * security). Each is off until configured, and a failure never fails the
 * request that caused it: it's logged, and the person still sees it in the app.
 */
import { sql } from './db.js';
import { newEntryEmail, replyEmail, welcomeEmail, type Email } from './emails.js';

export const emailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

/**
 * One email, as HTML with its plain-text twin (emails.ts). A `key` makes it
 * once-only: Resend sends an idempotency key it has seen in the last day only
 * once, so a retried request can't send the same email twice.
 */
export async function sendEmail(to: string | null | undefined, email: Email, key?: string) {
  if (!emailConfigured() || !to) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json', ...(key ? { 'idempotency-key': key } : {}) },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject: email.subject, text: email.text, html: email.html }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.warn('email: Resend said', res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.warn('email: could not send', (e as Error).message);
    return false;
  }
}

export async function sendPush(accountIds: string[], title: string, body: string, data: Record<string, string> = {}) {
  if (!accountIds.length || !process.env.SUPABASE_DB_URL) return 0;
  const rows = await sql()`select token from push_tokens where member_id in ${sql()(accountIds)}`;
  if (!rows.length) return 0;
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(process.env.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}) },
      body: JSON.stringify(rows.map((r) => ({ to: r.token, title, body, data, sound: 'default' }))),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) console.warn('push: Expo said', res.status);
    return rows.length;
  } catch (e) {
    console.warn('push: could not send', (e as Error).message);
    return 0;
  }
}

/** A member wrote something new: their coach hears about it, or every owner when they have no coach. */
export async function newEntry(memberId: string, title: string) {
  const db = sql();
  const [member] = await db`select name, coach_id from accounts where id = ${memberId}`;
  const owners = member?.coach_id
    ? await db`select id, email from accounts where id = ${member.coach_id}`
    : await db`select id, email from accounts where role = 'owner'`;
  const who = member?.name ?? 'Someone';
  await Promise.all([
    ...owners.map((o) => sendEmail(o.email, newEntryEmail(who, title, memberId))),
    sendPush(owners.map((o) => o.id), `${who} wrote something`, title, { path: `/admin/people/${memberId}` }),
  ]);
}

/** The owner replied: the member hears about it. */
export async function newReply(memberId: string, title: string) {
  const [member] = await sql()`select email from accounts where id = ${memberId}`;
  await Promise.all([
    sendEmail(member?.email, replyEmail(title)),
    sendPush([memberId], 'You have a reply', title, { path: '/home' }),
  ]);
}

/** A new member's welcome, once: keyed on the account, so a retried sign-up never sends two. */
export async function welcome(account: { id: string; name: string; email?: string | null }) {
  await sendEmail(account.email, welcomeEmail(account.name), `welcome-${account.id}`);
}
