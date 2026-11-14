/**
 * The app's identity and switches, in one place. The fohm-scaffold wizard
 * writes these values when it creates the app; change them here afterwards.
 */
export const APP = {
  name: 'Starter',
  tagline: 'A short line on what this app does for people.',
  /** What the app calls the people who use it, and the person who runs it. */
  memberWord: 'member',
  ownerWord: 'owner',
  /** Who runs it, for the privacy policy and terms. */
  operator: 'Your name or company',
  supportEmail: 'support@example.com',
  /** The landing page's three reasons to sign up. */
  features: [
    { title: 'Start in a minute', body: 'Create an account and you are in. Nothing to install on the web.' },
    { title: 'On your phone and laptop', body: 'The same account on the web, iPhone and Android.' },
    { title: 'A real person behind it', body: 'Everything you do reaches the people who run it, and they reply.' },
  ],
  /** 'app' or 'game': a game gets the Play screen and scores on Home. */
  kind: 'app' as 'app' | 'game',
};

export const isGame = () => APP.kind === 'game';
