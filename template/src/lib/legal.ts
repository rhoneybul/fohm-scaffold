import type { Integrations } from './backend';
import { APP } from './brand';

/**
 * The privacy policy and terms of use, in plain words. A starting point, not
 * legal advice: have them checked for where you operate before real people use
 * the app. Update the privacy policy in the same change as anything that
 * changes what's stored (AGENTS.md).
 */
export const LEGAL_VERSION = '2026-11-24';

/** Who runs the app, with its registration once it has one. */
const operator = () => (APP.registration ? `${APP.operator} (${APP.registration})` : APP.operator);

/** The privacy policy, naming only the services this app has switched on. */
export const privacy = (i: Integrations): { heading: string; body: string }[] => [
  { heading: 'Who we are', body: `${APP.name} is run by ${operator()}. Questions about your data: ${APP.supportEmail}.` },
  {
    heading: 'What we keep',
    body: `Your name, email address and password (handled by our login provider, Supabase), and what you write or do in ${APP.name}${APP.kind === 'game' ? ', including your game scores' : ''}${APP.routes && i.maps ? ', the routes you plan (their points, line and name)' : ''}, when you last used it and on what (the web, iPhone or Android, and the app's version)${i.tapp ? ', and who invited you or which link you came through' : ''}.${APP.kind === 'coaching' ? ' Your answers when you first open it, kept on your device until you have an account and then with your account; anything you type there never reaches analytics.' : ''} Your profile photo, if you add one, and the videos, photos and voice notes you send are stored privately and shown only through short-lived links. The people who run ${APP.name}${APP.coach ? ', and your coach if you have one,' : ''} can see all of it, and may keep private notes about your account.`,
  },
  { heading: 'Why', body: `To run ${APP.name} for you, and so the ${APP.ownerWord} can keep up with how it's going. We don't sell your data or use it for advertising.` },
  {
    heading: 'Who else handles it',
    body: [
      'Supabase (database and login) and Vercel (hosting).',
      i.billing && 'Stripe, if you buy Pro: your payment details go to Stripe, never to us.',
      i.posthog && 'PostHog, for how the app is used (which screens and features), tied to your account id, never what you write. On the website, counting keeps nothing on your device unless you choose Allow all, which keeps an anonymous id there so your visits join up; change it under Cookie settings at the foot of the home page.',
      i.sentry && 'Sentry, for error reports when something breaks, tied to your account id.',
      i.email && 'Resend, to send you a welcome email and emails about replies.',
      i.ai && 'Anthropic, whose Claude models answer questions you ask the AI assistant.',
      i.google && 'Google, if you sign in with Google.',
      i.tapp && 'Tapp, if you install the app through a link someone shared: it tells the app which link that was, so we know who invited you or where you found us. On iPhone it does so only if you allow tracking.',
      i.push && 'Expo, Apple and Google, to deliver notifications to your phone if you allow them.',
      APP.routes && i.maps && 'Mapbox, to draw the maps and to find the roads and paths between the points you put on a route: it receives those points, and the map tiles around them, while you plan or look at a route.',
    ]
      .filter(Boolean)
      .join(' '),
  },
  { heading: 'Deleting it', body: 'Delete your account from Your account at any time. Your account, everything you wrote and your login go for good.' },
];

export const TERMS: { heading: string; body: string }[] = [
  { heading: 'Using the app', body: `By creating an account you agree to these terms. ${APP.name} is provided by ${operator()}.` },
  { heading: 'Your account', body: 'Keep your password to yourself. You are responsible for what you write.' },
  { heading: 'Changes', body: 'We may change these terms; if we do, we will tell you in the app.' },
  { heading: 'Contact', body: APP.supportEmail },
];
