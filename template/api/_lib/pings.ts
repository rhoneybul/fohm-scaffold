/**
 * The team's Slack lines (docs/SLACK.md), as Naz's and Etapa's read: one line
 * for each step of the funnel, from a phone app downloaded to a sign-up, a
 * program and a payment. Pure, so the tests read every line; api/_lib/slack.ts
 * sends them.
 *
 * Every line starts with the app's name, so one channel can hold every app
 * the business runs. Everything a member or a store sent is escaped and cut
 * short, so nothing can mention @channel, dress up a link or add a line; and
 * nothing a member typed goes in beyond their email.
 */
import { APP_NAME } from './app.js';

/** Which channel a ping goes to: each can have its own webhook, else they share SLACK_WEBHOOK_URL. */
export type Channel = 'signups' | 'programs' | 'payments';
/** A line for Slack; `key` names the event, so the same event twice in five minutes is sent once. */
export interface Ping {
  channel: Channel;
  text: string;
  key: string;
}

/** Slack reads &, < and > as markup (`<!channel>`, `<url|words>`); a value is one line, at most `chars` long. */
export const escapeForSlack = (value: unknown, chars = 200) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, chars)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

/** `*App* · What happened — detail — detail`, the details that exist. */
export const lineOf = (what: string, ...details: (string | null | undefined | false)[]) =>
  [`*${escapeForSlack(APP_NAME, 60)}* · ${what}`, ...details.filter(Boolean)].join(' — ');

/** A member by their email, else the start of their id. */
export const who = (email: string | null | undefined, id: string | null | undefined) => escapeForSlack(email || `member ${String(id ?? '').slice(0, 12)}`, 120);

const SIGN_UP_METHODS: Record<string, string> = { email: 'email', google: 'Google', apple: 'Apple' };

/** A new account, and how it was made. */
export function signUpPing(a: { id: string; email?: string | null; method?: string | null; role?: string | null }): Ping {
  const how = SIGN_UP_METHODS[a.method ?? ''] ?? 'another way';
  const role = a.role && a.role !== 'member' ? `, as ${escapeForSlack(a.role, 20)}` : '';
  return { channel: 'signups', text: lineOf('New sign-up', `${who(a.email, a.id)} (${how}${role})`), key: `signed_up|${a.id}` };
}

// ── Downloads ────────────────────────────────────────────────────────────────

const PLATFORMS: Record<string, string> = { ios: 'iPhone', android: 'Android' };
const RELEASE = /^[\w.+-]{1,32}$/;
const release = (part: unknown) => (typeof part === 'string' && RELEASE.test(part) ? part : null);

/** A phone app's first launch: which app, version and build, nothing about the person; null for anything else. */
export function downloadPing(body: { platform?: unknown; version?: unknown; build?: unknown } | null | undefined, key: string): Ping | null {
  const device = PLATFORMS[String(body?.platform ?? '')];
  if (!device) return null;
  const version = release(body?.version);
  const build = release(body?.build);
  const parts = [version, build && `build ${build}`].filter(Boolean).join(', ');
  return { channel: 'signups', text: lineOf('New download', `${device} app${parts ? ` (${escapeForSlack(parts)})` : ''}`), key: `download|${key}` };
}

const HOUR_MS = 60 * 60 * 1000;
/** No more downloads pinged than this an hour, from one server, so nobody can flood the channel. */
export const DOWNLOADS_AN_HOUR = 60;

/**
 * A download is anyone's to send: one an hour from an address, and at most
 * DOWNLOADS_AN_HOUR an hour in all. Kept in memory only, never stored.
 */
export function createDownloadGate({ now = Date.now }: { now?: () => number } = {}) {
  const lastFrom = new Map<string, number>();
  let hour = { started: -Infinity, count: 0 };
  return function allowed(address: string) {
    const at = now();
    if (at - hour.started >= HOUR_MS) hour = { started: at, count: 0 };
    if (at - (lastFrom.get(address) ?? -Infinity) < HOUR_MS || hour.count >= DOWNLOADS_AN_HOUR) return false;
    if (lastFrom.size >= 1000) lastFrom.delete(lastFrom.keys().next().value as string);
    lastFrom.set(address, at);
    hour.count += 1;
    return true;
  };
}

// ── Programs ─────────────────────────────────────────────────────────────────

/** Words a builder wrote, as code in a line: cut short, escaped, and with no backtick to end it early. */
const inCode = (text: unknown, chars: number) => `\`${escapeForSlack(String(text ?? '').replace(/`/g, "'"), chars)}\``;

/** A program started: `program` is the app's own name for it (from its catalogue), `detail` its shape (`8 weeks, 3 a week`). */
export function programStartedPing(p: { memberId: string; email?: string | null; programId: string; program: string; detail?: string | null }): Ping {
  return {
    channel: 'programs',
    text: lineOf('Program started', who(p.email, p.memberId), escapeForSlack(p.program, 120), p.detail && escapeForSlack(p.detail, 120)),
    key: `program_started|${p.programId}`,
  };
}

/** A program built in the background, ready or not: what it is and how long it took; or why it didn't build. */
export function programBuiltPing(
  p: { memberId: string; email?: string | null; programId: string; seconds: number } & (
    | { ok: true; title: string; weeks: number; sessions: number; model: string }
    | { ok: false; reason: string }
  ),
): Ping {
  const member = who(p.email, p.memberId);
  const took = `${Math.round(p.seconds)}s`;
  if (!p.ok) return { channel: 'programs', text: lineOf('Program FAILED', member, inCode(p.reason, 200), `after ${took}`), key: `program_built|${p.programId}` };
  const model = String(p.model).replace(/^claude-/, '');
  return {
    channel: 'programs',
    text: lineOf('Program ready', member, escapeForSlack(p.title, 120), `${p.sessions} sessions / ${p.weeks} wks`, `${took} · ${inCode(model, 40)}`),
    key: `program_built|${p.programId}`,
  };
}

// ── Payments ─────────────────────────────────────────────────────────────────

export type PaymentKind = 'started' | 'renewed' | 'cancelled' | 'ended';
const day = (d: Date | null | undefined) => (d instanceof Date && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : null);

const DAY_MS = 86_400_000;
type Cancellable = { cancel_at_period_end?: unknown; cancel_at?: unknown } | null | undefined;
const setToEnd = (s: Cancellable) => !!s && (s.cancel_at_period_end === true || (typeof s.cancel_at === 'number' && s.cancel_at > 0));

/**
 * What the team hears of an update to the live subscription an account
 * already follows: `cancelled` the moment it's set to end (Stripe's
 * previous_attributes say it wasn't before), `renewed` when its period moves
 * on by a day or more, else nothing (a card changed, a resent event).
 */
export function subscriptionChange(a: { wasPro: boolean; wasUntil: Date | null; until: Date; sub: Cancellable; previous?: Record<string, unknown> | null }): PaymentKind | null {
  const prev = a.previous ?? {};
  const cancelChanged = 'cancel_at_period_end' in prev || 'cancel_at' in prev;
  if (cancelChanged && setToEnd(a.sub) && !setToEnd({ ...a.sub, ...prev } as Cancellable)) return 'cancelled';
  if (a.wasPro && a.wasUntil && a.until.getTime() - a.wasUntil.getTime() >= DAY_MS && !setToEnd(a.sub)) return 'renewed';
  return null;
}

/** Pro from the Stripe webhook: started, renewed (until when), cancelled (ends when) or ended. */
export function paymentPing(p: { kind: PaymentKind; accountId: string; email?: string | null; subscriptionId: string; until?: Date | null }): Ping {
  const member = who(p.email, p.accountId);
  const until = day(p.until);
  const text = {
    started: () => lineOf('Pro started', member),
    renewed: () => lineOf('Pro renewed', member, until && `until ${until}`),
    cancelled: () => lineOf('Pro cancelled', member, until && `ends ${until}`),
    ended: () => lineOf('Pro ended', member),
  }[p.kind]();
  return { channel: 'payments', text, key: `pro_${p.kind}|${p.subscriptionId}|${until ?? ''}` };
}
