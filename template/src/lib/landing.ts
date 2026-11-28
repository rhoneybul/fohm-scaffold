import type { LandingScreen, StoreListing } from './brand';
import { canShow, type CreditedPhoto } from './photos';

/**
 * The landing page as data (src/components/landing.tsx draws it): the ways
 * in, the store pills, the screens it shows, the goals, the price line and
 * the tags search and shared links read. Built from Naz's landing page (the
 * stores first, the web app a quiet link, real screens, the catalogue's
 * photos) and Etapa's website (a title, description, canonical and share
 * image on every page). Every word comes from src/lib/brand.ts or the app's
 * own data. Plain logic, tested in Node (tests/landing.test.ts).
 */

/** Each store's pill, worded as the stores' own badges are: a small line over the store's name. */
export const STORE_BADGES: Record<StoreListing['store'], { lead: string; name: string; icon: 'apple' | 'google-play' }> = {
  'app-store': { lead: 'Download on the', name: 'App Store', icon: 'apple' },
  'google-play': { lead: 'Get it on', name: 'Google Play', icon: 'google-play' },
};

export interface StoreButton {
  store: StoreListing['store'];
  url: string;
  lead: string;
  name: string;
  icon: 'apple' | 'google-play';
  /** Read aloud: "Download on the App Store". */
  label: string;
}

/** The stores the apps are in, App Store first, each with a real https listing. */
export function storeButtons(stores: StoreListing[]): StoreButton[] {
  const order: StoreListing['store'][] = ['app-store', 'google-play'];
  return order.flatMap((store) => {
    const listing = stores.find((s) => s.store === store && /^https:\/\/\S+$/.test(s.url));
    if (!listing) return [];
    const badge = STORE_BADGES[store];
    return [{ store, url: listing.url, ...badge, label: `${badge.lead} ${badge.name}` }];
  });
}

export interface LandingWays {
  stores: StoreButton[];
  /** The ink pill, when there's no store to lead with. */
  primary: { label: string; href: string } | null;
  /** The quiet link under it. */
  quiet: { label: string; href: string };
}

/**
 * The way in (Naz's): a pill to each store the apps are in, with the web app
 * a quiet link under them; until there is a store, the web app is the one
 * ink pill, with signing in the quiet link. A coaching app's web app starts
 * with onboarding (docs/ONBOARDING.md), before any account; the others with
 * the sign-up form.
 */
export function landingWays(stores: StoreListing[], onboarding = false): LandingWays {
  const buttons = storeButtons(stores);
  const start = onboarding ? '/onboarding' : '/sign-in?mode=up';
  if (buttons.length) return { stores: buttons, primary: null, quiet: { label: 'Or use it in your browser, with nothing to install', href: start } };
  return { stores: [], primary: { label: 'Get started', href: start }, quiet: { label: 'I already have an account', href: '/sign-in' } };
}

/** "£9.99", in the currency Stripe charges. */
export const money = (cents: number, currency: string) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: currency.toUpperCase() }).format(cents / 100);

/** The price, once payments are on (Stripe's price, from /api/health); nothing before. */
export function priceLine(billing: { priceCents: number; currency: string } | null | undefined): string | null {
  if (!billing || !(billing.priceCents > 0) || !billing.currency) return null;
  return `Free to start. Pro is ${money(billing.priceCents, billing.currency)} a month, and you can stop any time.`;
}

export type ProofScreen = { kind: 'shot'; file: string; title: string; line: string } | { kind: 'live'; screen: LiveScreen; title: string; line: string };
export type LiveScreen = 'assessment' | 'path' | 'library' | 'home';

/**
 * What Inside the app shows: the real screenshots once `APP.screens` lists
 * some, else the app's own screens drawn live from its real content (a
 * coaching app's assessment, path and library; anything else's Home).
 */
export function proofScreens(kind: 'coaching' | 'app' | 'game', screens: LandingScreen[], words: { owner: string }): ProofScreen[] {
  const shots = screens.filter((s) => /^[\w-]+\.(png|jpe?g|webp)$/.test(s.file));
  if (shots.length) return shots.map((s) => ({ kind: 'shot', ...s }));
  if (kind === 'coaching')
    return [
      { kind: 'live', screen: 'assessment', title: 'Start where you are', line: 'A few questions place you on the path at your level.' },
      { kind: 'live', screen: 'path', title: 'A path of skills', line: 'One skill at a time, each with what it is for and how to practise it.' },
      { kind: 'live', screen: 'library', title: 'A library to come back to', line: `Drills, videos and notes from the ${words.owner}, in order.` },
    ];
  return [{ kind: 'live', screen: 'home', title: 'Your week at a glance', line: 'What to do next, and what you have done this week.' }];
}

/** The accent's deep shade, the Why band's ground: taken 55% toward ink, so white words keep 4.5:1 on it whatever the accent. */
export function deepShade(accent: string): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(accent)) return accent;
  const mixed = [1, 3, 5].map((i) => Math.round(parseInt(accent.slice(i, i + 2), 16) * 0.45 + 11 * 0.55));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/**
 * The app in a phone beside the promise, on a laptop: the first real
 * screenshot once there is one, else Home drawn live (what a member sees
 * every day, and none of Inside the app's coaching screens).
 */
export function heroScreen(proof: ProofScreen[]): ProofScreen {
  return proof.find((p) => p.kind === 'shot') ?? { kind: 'live', screen: 'home', title: 'Home', line: 'What to do next, and your week.' };
}

/** Inside the app's screens, less the one the hero already shows. */
export function railScreens(proof: ProofScreen[], hero?: ProofScreen): ProofScreen[] {
  if (!hero) return proof;
  return proof.filter((p) => p !== hero && !(p.kind === 'live' && hero.kind === 'live' && p.screen === hero.screen));
}

/** A goal, place or event the app trains for, with its photo, for the landing page's photo-led section. */
export interface LandingGoal {
  id: string;
  title: string;
  line?: string;
  photo?: CreditedPhoto;
}

/**
 * The catalogue's goals for the landing page: the app fills it from its own
 * research (`research/<name>.json`), as `SAVED_PHOTOS` is filled. Empty in
 * an app without a catalogue, and the section isn't drawn.
 */
export const LANDING_GOALS: LandingGoal[] = [];

/** Up to six goals, each with a photo the licence lets the app show. */
export const landingGoals = (goals: LandingGoal[] = LANDING_GOALS) => goals.filter((g) => g.photo && canShow(g.photo)).slice(0, 6);

// ---------------------------------------------------------------------------
// Search and shared links (Etapa's per-page checklist, docs/website-seo.md there)
// ---------------------------------------------------------------------------

export interface SeoInput {
  name: string;
  tagline: string;
  description: string;
  /** The site's address, https://… with no trailing slash. */
  origin: string;
  operator: string;
  /** The share image, absolute: the brand's card (public/og.png), else the hero photo. */
  image?: string;
  /** The share image's size, when it's the brand's card. */
  imageSize?: { width: number; height: number };
  stores: StoreListing[];
}

const escape = (text: string) => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The page's title: the name and the tagline when that fits in 60 characters (Google cuts there), else the name. */
export function seoTitle(name: string, tagline: string) {
  const full = `${name}: ${tagline.replace(/[.\s]+$/, '')}`;
  return full.length <= 60 ? full : name;
}

/** The description, cut at a word to 160 characters. */
export function seoDescription(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= 160) return clean;
  return `${clean.slice(0, 157).replace(/\s+\S*$/, '')}…`;
}

/** The site's address, https and no trailing slash. */
export const siteOrigin = (url: string) => url.trim().replace(/\/+$/, '').replace(/^http:\/\//, 'https://');

/** Structured data: the site, who runs it, and the app in the stores once it's in one. */
export function structuredData(s: SeoInput) {
  const url = `${s.origin}/`;
  const graph: Record<string, unknown>[] = [
    { '@type': 'Organization', '@id': `${url}#organization`, name: s.operator, url },
    { '@type': 'WebSite', '@id': `${url}#website`, name: s.name, url, description: seoDescription(s.description), publisher: { '@id': `${url}#organization` } },
  ];
  const stores = storeButtons(s.stores);
  if (stores.length)
    graph.push({
      '@type': 'SoftwareApplication',
      name: s.name,
      operatingSystem: stores.map((b) => (b.store === 'app-store' ? 'iOS' : 'Android')).join(', '),
      applicationCategory: 'HealthApplication',
      url,
      sameAs: stores.map((b) => b.url),
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'GBP' },
    });
  return { '@context': 'https://schema.org', '@graph': graph };
}

/** The tags in the page's head: title, description, canonical, Open Graph, Twitter and JSON-LD. */
export function seoTags(s: SeoInput): string {
  const title = seoTitle(s.name, s.tagline);
  const description = seoDescription(s.description);
  const url = `${s.origin}/`;
  const tags = [
    `<title>${escape(title)}</title>`,
    `<meta name="description" content="${escape(description)}" />`,
    `<link rel="canonical" href="${escape(url)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${escape(s.name)}" />`,
    `<meta property="og:title" content="${escape(title)}" />`,
    `<meta property="og:description" content="${escape(description)}" />`,
    `<meta property="og:url" content="${escape(url)}" />`,
    ...(s.image ? [`<meta property="og:image" content="${escape(s.image)}" />`] : []),
    ...(s.image && s.imageSize ? [`<meta property="og:image:width" content="${s.imageSize.width}" />`, `<meta property="og:image:height" content="${s.imageSize.height}" />`] : []),
    `<meta name="twitter:card" content="${s.image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escape(title)}" />`,
    `<meta name="twitter:description" content="${escape(description)}" />`,
    ...(s.image ? [`<meta name="twitter:image" content="${escape(s.image)}" />`] : []),
    `<script type="application/ld+json">${JSON.stringify(structuredData(s)).replace(/</g, '\\u003c')}</script>`,
  ];
  return tags.join('\n    ');
}

/** The exported page with its head's tags: the title Expo wrote is replaced, the rest go in front of </head>. Idempotent. */
export function withSeo(html: string, s: SeoInput): string {
  const clean = html
    .replace(/<!-- seo -->[\s\S]*?<!-- \/seo -->/, '')
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/\s*<\/head>/, '</head>');
  return clean.replace('</head>', `\n    <!-- seo -->\n    ${seoTags(s)}\n    <!-- /seo -->\n  </head>`);
}

/** The canonical address of a route on the web: the path, never the query or a trailing slash. */
export const canonicalFor = (origin: string, pathname: string) => `${siteOrigin(origin)}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '').split(/[?#]/)[0]}`;
