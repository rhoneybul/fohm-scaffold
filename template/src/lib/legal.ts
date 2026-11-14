import type { Integrations } from './backend';
import { APP } from './brand';

/**
 * The privacy policy and terms of use, in plain words. A starting point, not
 * legal advice: have them checked for where you operate before real people use
 * the app. Update the privacy policy in the same change as anything that
 * changes what's stored (AGENTS.md).
 */
export const LEGAL_VERSION = '2026-01-01';

/** The privacy policy, naming only the services this app has switched on. */
export const privacy = (i: Integrations): { heading: string; body: string }[] => [
  { heading: 'Who we are', body: `${APP.name} is run by ${APP.operator}. Questions about your data: ${APP.supportEmail}.` },
  {
    heading: 'What we keep',
    body: `Your name, email address and password (handled by our login provider, Supabase), and what you write or do in ${APP.name}${APP.kind === 'game' ? ', including your game scores' : ''}. The ${APP.ownerWord} who runs ${APP.name} can see all of it, and may keep private notes about your account.`,
  },
  { heading: 'Why', body: `To run ${APP.name} for you, and so the ${APP.ownerWord} can keep up with how it's going. We don't sell your data or use it for advertising.` },
  {
    heading: 'Who else handles it',
    body: [
      'Supabase (database and login) and Vercel (hosting).',
      i.billing && 'Stripe, if you buy Pro: your payment details go to Stripe, never to us.',
      i.posthog && 'PostHog, for how the app is used (which screens and features), tied to your account id, never what you write.',
      i.sentry && 'Sentry, for error reports when something breaks, tied to your account id.',
      i.email && 'Resend, to send you emails about replies.',
      i.ai && 'Anthropic, whose Claude models answer questions you ask the AI assistant.',
      i.google && 'Google, if you sign in with Google.',
      i.push && 'Expo, Apple and Google, to deliver notifications to your phone if you allow them.',
    ]
      .filter(Boolean)
      .join(' '),
  },
  { heading: 'Deleting it', body: 'Delete your account from Your account at any time. Your account, everything you wrote and your login go for good.' },
];

export const TERMS: { heading: string; body: string }[] = [
  { heading: 'Using the app', body: `By creating an account you agree to these terms. ${APP.name} is provided by ${APP.operator}.` },
  { heading: 'Your account', body: 'Keep your password to yourself. You are responsible for what you write.' },
  { heading: 'Changes', body: 'We may change these terms; if we do, we will tell you in the app.' },
  { heading: 'Contact', body: APP.supportEmail },
];
