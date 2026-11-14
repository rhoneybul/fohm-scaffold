/**
 * Telling people something happened: email through Resend (RESEND_API_KEY and
 * EMAIL_FROM) and push notifications through Expo (to devices in
 * push_tokens; EXPO_ACCESS_TOKEN only if you turned on enhanced push
 * security). Each is off until configured, and a failure never fails the
 * request that caused it: it's logged, and the person still sees it in the app.
 */
import { APP_NAME, siteUrl } from './app.js';
import { sql } from './db.js';

export const emailConfigured = () => !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export async function sendEmail(to: string, subject: string, text: string) {
  if (!emailConfigured() || !to) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
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

const link = (path: string) => (siteUrl() ? `\n\n${siteUrl()}${path}` : '');

/** A member wrote something new: every owner hears about it. */
export async function newEntry(memberId: string, title: string) {
  const db = sql();
  const [member] = await db`select name from accounts where id = ${memberId}`;
  const owners = await db`select id, email from accounts where role = 'owner'`;
  const who = member?.name ?? 'Someone';
  await Promise.all([
    ...owners.map((o) => sendEmail(o.email, `${who} wrote “${title}”`, `${who} wrote something new in ${APP_NAME}. Reply from the dashboard.${link(`/admin/people/${memberId}`)}`)),
    sendPush(owners.map((o) => o.id), `${who} wrote something`, title, { path: `/admin/people/${memberId}` }),
  ]);
}

/** The owner replied: the member hears about it. */
export async function newReply(memberId: string, title: string) {
  const [member] = await sql()`select email from accounts where id = ${memberId}`;
  await Promise.all([
    sendEmail(member?.email, `A reply to “${title}”`, `You have a reply in ${APP_NAME}.${link('/home')}`),
    sendPush([memberId], 'You have a reply', title, { path: '/home' }),
  ]);
}
