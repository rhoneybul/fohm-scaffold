/**
 * What the app's emails say, each as HTML in the app's colours with a
 * plain-text twin (mail apps that don't show HTML, and spam filters, read
 * the text). Plain logic, tested in Node (tests/emails.test.ts); sending is
 * notify.ts.
 */
import { ACCENT, APP_NAME, siteUrl } from './app.js';

export interface Email {
  subject: string;
  text: string;
  html: string;
}

interface Layout {
  subject: string;
  heading: string;
  paragraphs: string[];
  /** A button to a path on the site, when the site's address is known. */
  button?: { label: string; path: string };
}

const escapeHtml = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const INK = '#1C1F1D';
const MUTED = '#6B716D';
const PAGE = '#F7F5F0';

/** One email in the app's layout. */
export function layout({ subject, heading, paragraphs, button }: Layout): Email {
  const site = siteUrl();
  const href = button && site ? `${site}${button.path}` : null;
  const footer = `You get this email because you have an account with ${APP_NAME}.`;

  const text = [heading, ...paragraphs, ...(href ? [`${button!.label}: ${href}`] : []), '--', footer, ...(site ? [site] : [])].join('\n\n');

  const para = (p: string) => `<p style="margin:0 0 16px 0;font-size:16px;line-height:1.5;color:${INK};">${escapeHtml(p)}</p>`;
  const cta = href
    ? `<p style="margin:8px 0 24px 0;"><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 22px;background:${ACCENT};color:#FFFFFF;border-radius:10px;font-weight:600;font-size:16px;text-decoration:none;">${escapeHtml(button!.label)}</a></p>`
    : '';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0;padding:0;background:${PAGE};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAGE};"><tr><td align="center" style="padding:24px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:14px;">
<tr><td style="padding:28px 28px 8px 28px;font-size:14px;font-weight:700;letter-spacing:0.04em;color:${ACCENT};">${escapeHtml(APP_NAME)}</td></tr>
<tr><td style="padding:8px 28px 12px 28px;"><h1 style="margin:0 0 16px 0;font-size:22px;line-height:1.3;color:${INK};">${escapeHtml(heading)}</h1>${paragraphs.map(para).join('')}${cta}</td></tr>
</table>
<p style="max-width:560px;margin:16px auto 0 auto;font-size:13px;line-height:1.5;color:${MUTED};">${escapeHtml(footer)}${site ? `<br><a href="${escapeHtml(site)}" style="color:${MUTED};">${escapeHtml(site.replace(/^https?:\/\//, ''))}</a>` : ''}</p>
</td></tr></table>
</body></html>`;
  return { subject, text, html };
}

/** To a new member, once their account is made. */
export const welcomeEmail = (name: string) =>
  layout({
    subject: `Welcome to ${APP_NAME}`,
    heading: `Welcome, ${name}`,
    paragraphs: [`Your ${APP_NAME} account is ready. Everything you do in it reaches the people who run ${APP_NAME}, and they reply.`, 'Reply to this email if you need a hand.'],
    button: { label: `Open ${APP_NAME}`, path: '/home' },
  });

/** To the coach or owner: a member wrote something new. */
export const newEntryEmail = (who: string, title: string, memberId: string) =>
  layout({
    subject: `${who} wrote “${title}”`,
    heading: `${who} wrote something new`,
    paragraphs: [`“${title}”`, 'Reply from the dashboard.'],
    button: { label: 'Open the dashboard', path: `/admin/people/${memberId}` },
  });

/** To a member: their message has a reply. */
export const replyEmail = (title: string) =>
  layout({
    subject: `A reply to “${title}”`,
    heading: 'You have a reply',
    paragraphs: [`There’s a reply to “${title}” waiting for you in ${APP_NAME}.`],
    button: { label: 'Read it', path: '/home' },
  });
