/**
 * The app's identity and switches, in one place. The fohm-scaffold wizard
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
   * policy and terms: 'ABN 51 824 753 556', or 'company number 01234567,
   * registered in England and Wales, at 1 High Street, Bristol'. Blank until
   * it's registered.
   */
  registration: '',
  supportEmail: 'support@example.com',
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
