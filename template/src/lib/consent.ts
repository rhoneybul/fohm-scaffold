/**
 * Counting visits on the web, as Naz's landing page asks it: counting only,
 * or allow all. Counting only keeps nothing on the device: each visit counts
 * with an id that lives in memory and goes with the tab. Allow all keeps an
 * anonymous id on the device, so a visitor's visits join up. The iOS and
 * Android apps keep their id as an app does (src/lib/analytics.ts). Plain
 * logic, tested in Node (tests/landing.test.ts).
 */
export const CONSENT_KEY = 'analytics:consent';

export type Consent = 'counting' | 'all';

/** What a visitor chose, from what the device kept: 'pending' until they answer. */
export const consentFrom = (stored: string | null | undefined): Consent | 'pending' => (stored === 'counting' || stored === 'all' ? stored : 'pending');

/** Whether analytics may keep its id on the device: always in the apps, on the web only once allowed. */
export const keepsId = (consent: Consent | 'pending', web: boolean) => !web || consent === 'all';

export const CONSENT_TITLE = 'How we count visits';

export const consentText = (name: string) =>
  `${name} counts which pages are opened, never what you write, and keeps nothing on your device for it. Allow all also keeps an anonymous id here, so your visits join up.`;

export const CONSENT_ANSWERS: { choice: Consent; title: string }[] = [
  { choice: 'counting', title: 'Counting only' },
  { choice: 'all', title: 'Allow all' },
];

/** The line over the answers when the banner is opened again from the footer. */
export const CONSENT_NOW: Record<Consent, string> = {
  counting: 'You chose counting only.',
  all: 'You chose allow all.',
};
