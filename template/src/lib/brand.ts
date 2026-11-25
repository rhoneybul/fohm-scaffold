import type { CreditedPhoto } from './photos';

/** A store the iOS or Android app is in: its listing's address. */
export interface StoreListing {
  store: 'app-store' | 'google-play';
  url: string;
}

/** A real screenshot of the app for the landing page: a file in public/landing/ (from `npm run screens`), and what it shows. */
export interface LandingScreen {
  file: string;
  title: string;
  line: string;
}

/**
 * The app's identity and switches, in one place. `fohm-scaffold new`
 * writes these values when it creates the app; change them here afterwards.
 */
export const APP = {
  name: 'Starter',
  tagline: 'A short line on what this app does for people.',
  /** What the app calls the people who use it, and the person who runs it. */
  memberWord: 'member',
  ownerWord: 'coach',
  /** Who runs it, for the privacy policy and terms: the person, or the business's legal name. */
  operator: 'Your name or company',
  /**
   * The business's registration, shown beside the operator on the privacy
   * policy and terms: its number and its registered office address, as
   * 'ABN 51 824 753 556, at 1 George Street, Sydney NSW 2000', or 'company
   * number 01234567, registered in England and Wales, at 1 High Street,
   * Bristol BS1 1AA' (a UK company's website must show all three). Blank until
   * it's registered.
   */
  registration: '',
  supportEmail: 'support@example.com',
  /**
   * The photo the landing page leads with: the goal members train for, or the
   * people, never a stock photo of something else. Its licence and credit as
   * `src/lib/photos.ts` asks (the owner's own with `permission`); shown under
   * it and on /credits. Until there is one, the slot shows a clean stand-in.
   */
  heroPhoto: undefined as CreditedPhoto | undefined,
  /**
   * One or two sentences under the tagline, and the page's description for
   * search and shared links (140 to 160 characters reads best): what the app
   * does, for whom, in plain words.
   */
  description: 'What this app does, for whom, and what changes for them once they use it, in a sentence or two of plain words.',
  /**
   * The stores the iOS and Android apps are in, once they are: the landing
   * page then leads with a pill to each, and the web app is a quiet link
   * under them. Empty until the first store approves the app.
   */
  stores: [] as StoreListing[],
  /** How it works, in three steps, on the landing page. */
  steps: [
    { title: 'Tell it where you are', body: 'A few questions about where you are now and what you want from it.' },
    { title: 'Follow your path', body: 'A step at a time, at your level, on your phone or laptop.' },
    { title: 'See what changed', body: 'Everything you do is kept, so you can see how far you have come.' },
  ],
  /**
   * Real screenshots for the landing page's Inside the app, once there are
   * some: `npm run screens`, then copy the ones to show into public/landing/
   * and list them here. Until then the page draws the app's own screens
   * live, from its real content.
   */
  screens: [] as LandingScreen[],
  /** The landing page's three reasons to sign up. */
  features: [
    { title: 'Start in a minute', body: 'Create an account and you are in. Nothing to install on the web.' },
    { title: 'On your phone and laptop', body: 'The same account on the web, iPhone and Android.' },
    { title: 'A real person behind it', body: 'Everything you do reaches the people who run it, and they reply.' },
  ],
  /**
   * What kind of product this is:
   *  - 'coaching': a structured progression (the default): a level assessment,
   *    a path of skills, check-ins, clips for the coach, a library
   *  - 'app': a plain members-and-owner app (write things, get replies)
   *  - 'game': the example game, with scores
   */
  kind: 'coaching' as 'coaching' | 'app' | 'game',
  /**
   * Whether a real person coaches members: answers their questions and
   * clips, leaves notes on their path. false for programs with nobody behind
   * them: no "Ask your coach", no coach role at sign-up, no coach shown or
   * offered, and the app speaks as itself (`ownerWord` is then 'team'). Never
   * invent a coach or a person the members would think is real.
   */
  coach: true,
};

export const isGame = () => APP.kind === 'game';
export const isCoaching = () => APP.kind === 'coaching';
/** A real person coaches members (`APP.coach`). */
export const hasCoach = () => APP.coach;

/** What writing to the people who run it is called here: asking the coach, feedback on a game, or plain writing. */
export const writeTitle = () => (isGame() ? 'Send feedback' : !hasCoach() ? `Write to the ${APP.ownerWord}` : isCoaching() ? `Ask your ${APP.ownerWord}` : 'Write something');
