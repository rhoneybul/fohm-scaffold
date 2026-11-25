/**
 * Design tokens for the member app (light) and the owner's dashboard (dark).
 * Change the brand here, once: every screen reads these. DESIGN.md records
 * the system. Text colours keep 4.5:1 on the canvas and on a card.
 *
 * The member app starts in the house style shared with Naz and Etapa: Space
 * Grotesk 600 for what's read first, DM Sans for everything else, a closed
 * type scale picked by name, a cool grouped-list grey canvas with white
 * borderless cards (the step in tone is the edge), hairline rows, an ink pill
 * with an accent disc for the one thing to press, and no shadow but the
 * floating tab bar's. The accent (the brand's one colour) marks action and
 * what's live now, nothing else.
 */
import { Platform, useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';

import { FACES } from './fonts';

/** Etapa's light palette's structure, with the brand's accent. */
export const C = {
  /** The canvas: a cool grouped-list grey, never pure white. */
  bg: '#F2F2F6',
  /** Cards, rows, fields, the tab bar: white on the canvas. */
  surface: '#FFFFFF',
  /** A raised step on a card: an icon well, an undone day, a pressed row. */
  raised: '#F4F4F7',
  /** The raised step's older name, kept for screens that still say panel. */
  panel: '#F4F4F7',
  /** A segmented control's track, a progress bar's, a photo's ground before it loads. */
  track: '#E6E6EB',
  /** The hairline: row dividers, a field's edge, a day tile's edge. */
  line: '#E3E3E9',
  border: '#E3E3E9',
  /** Primary text, and the ink pill's fill: 18.9:1 on white, 16.9:1 on the canvas. */
  ink: '#111113',
  /** Secondary text: 8.8:1 on white, 7.9:1 on the canvas. */
  inkMid: '#4A4A52',
  /** Labels, captions, chevrons, placeholders: 5.8:1 on white, 5.2:1 on the canvas. */
  inkFaint: '#5F6672',
  /** On ink, or over a photo's shade. */
  onInk: '#FFFFFF',
  onInkMid: '#C9CCD1',
  /** The brand's one colour: the primary pill's disc and what's live now. The wizard writes it; keep 4.5:1 on white. */
  accent: '#2F6B4F',
  onAccent: '#FFFFFF',
  /** The accent's pale ground. */
  accentSoft: '#E3EFE8',
  danger: '#A63A2B',
  /** Behind a busy spinner, and the light shade at a photo hero's top. */
  scrim: 'rgba(17,17,19,0.45)',
};

/** A token at an alpha, as Etapa's `colors.alpha`: `alpha(C.ink, 0.28)`. */
export function alpha(hex: string, opacity: number): string {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/** WCAG's relative luminance of a `#RRGGBB` colour. */
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG's contrast ratio between two `#RRGGBB` colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** `hex` mixed toward white by `share` (0 to 1). */
function towardWhite(hex: string, share: number): string {
  const mixed = [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - share) + 255 * share));
  return `#${mixed.map((c) => c.toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

/** The accent lifted toward white, as little as it takes, until it keeps `ratio` against a dark `ground`. */
function liftedTo(hex: string, ground: string, ratio: number): string {
  for (let share = 0; share <= 1; share += 0.02) {
    const c = towardWhite(hex, share);
    if (contrast(c, ground) >= ratio) return c;
  }
  return '#FFFFFF';
}

/** A colour's hue, 0 to 360 degrees. */
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

/** How far apart two colours' hues are, 0 to 180 degrees. */
function hueGap(a: string, b: string): number {
  const gap = Math.abs(hue(a) - hue(b));
  return Math.min(gap, 360 - gap);
}

/** "Needs you": a clear blue, or amber for a brand whose accent is a blue. */
const NEEDS_YOU_BLUE = '#6CB6FF';
const NEEDS_YOU_AMBER = '#F5C451';

/** The dashboard's graphite, built from the member app's ink and stepping up in tone (Etapa's dark theme). */
const GRAPHITE = {
  sidebar: '#0B0B0D',
  bg: C.ink,
  surface: '#1C1C20',
  surfaceLight: '#26262B',
  border: '#34343B',
};
/** The accent as a fill on the dashboard: bars, the primary pill, the chosen page. 3:1 on every surface. */
const accentFill = liftedTo(C.accent, GRAPHITE.surfaceLight, 3);

/**
 * The dashboard: dark graphite (Nov 2026), so it never gets mistaken for the
 * member app, and in the brand: the app's ink as its canvas, the app's
 * canvas as its text, and the brand's accent (`C.accent`, which `new`
 * writes) as its one colour for action and the page you're on, so every
 * app's dashboard wears its own colour. "Needs you" has a colour of its own, used for nothing
 * else. Text keeps 4.5:1 on every surface; bars and fills 3:1.
 */
export const A = {
  ...GRAPHITE,
  /** 13.5:1 on the lightest surface. */
  text: C.bg,
  /** 9.4:1 on the lightest surface. */
  textMid: C.onInkMid,
  /** Labels, captions, placeholders: 5.5:1 on the lightest surface. */
  textFaint: '#9C9CA6',
  /** Action and the page you're on: the accent, lifted to 3:1 on every surface. */
  primary: accentFill,
  /** A label on the action colour: white where it keeps 4.5:1, else ink. */
  onPrimary: contrast(accentFill, '#FFFFFF') >= 4.5 ? '#FFFFFF' : C.ink,
  /** The accent as text (a link): 4.5:1 on every surface. */
  primaryText: liftedTo(C.accent, GRAPHITE.surfaceLight, 4.5),
  /** What needs the owner, and only that: a clear blue, or amber when the brand's accent is itself a blue. 7:1 or better on every surface. */
  needsYou: hueGap(C.accent, NEEDS_YOU_BLUE) < 45 ? NEEDS_YOU_AMBER : NEEDS_YOU_BLUE,
  onNeedsYou: C.ink,
  /** Deleting: a light red, 6.5:1 on every surface. */
  danger: '#FF8A7A',
};

/** Etapa's radius scale. Cards and photo cards take `xxl`, stat tiles `xl`, fields and thumbnails `md`; buttons, chips and the tab bar `pill`. */
export const R = { xs: 4, sm: 8, md: 12, lg: 14, xl: 18, xxl: 22, pill: 999 };
/** Etapa's spacing scale. The gutter is `xl` (20). */
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
/** The one gutter every screen keeps. */
export const GUTTER = S.xl;

/**
 * The route map's Mapbox style (src/components/route-map.tsx): Outdoors,
 * with its contours, paths and peaks, for apps about places people go on
 * foot, by bike or on skis. Change it here, once (streets-v12 for a city app);
 * the route's line is always the accent.
 */
export const MAP_STYLE = 'mapbox://styles/mapbox/outdoors-v12';
export const MAX_W = 640;
/** The dashboard's face. The member app uses the faces in `F`. */
export const sans = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** A face by name, with the system's as the browser's fallback while it loads (or if it never does). */
const face = (name: string) => (Platform.OS === 'web' ? `${name}, ${sans}` : name);
export const F = {
  /** DM Sans, 300 to 700: everything read at length or tapped. */
  light: face(FACES.light),
  regular: face(FACES.regular),
  medium: face(FACES.medium),
  semibold: face(FACES.semibold),
  bold: face(FACES.bold),
  /** Space Grotesk 600: what's read first (titles, headings, numbers, buttons). Never heavier. */
  display: face(FACES.display),
  displayMedium: face(FACES.displayMedium),
};

/** Tabular figures: every number read as a number, so digits line up and don't jump as they change. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

/**
 * The closed type scale (Etapa's `typeScale`, Naz's hierarchy): pick a role
 * by name, never a number. Space Grotesk 600 from `title` (16) up and for
 * every number, with tabular figures; DM Sans below it. Sentence case
 * everywhere, nothing above 600.
 */
export const T = {
  /** A timer or a count read from across a room. Nothing else. */
  clock: { fontFamily: F.display, fontSize: 96, lineHeight: 104, letterSpacing: -2, color: C.ink, ...tabular },
  /** The number a screen is about: days to go, minutes done. */
  statLarge: { fontFamily: F.display, fontSize: 64, lineHeight: 68, letterSpacing: -1.5, color: C.ink, ...tabular },
  /** The landing page's tagline on a laptop. */
  heroWide: { fontFamily: F.display, fontSize: 48, lineHeight: 52, letterSpacing: -1.2, color: C.ink },
  /** A screen's title (`Display`). */
  hero: { fontFamily: F.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.8, color: C.ink },
  /** A question, an item's name on its own page. */
  display: { fontFamily: F.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.6, color: C.ink },
  /** A greeting, a name (`Title`). */
  h1: { fontFamily: F.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.5, color: C.ink },
  /** A section's heading (`Heading`, `Section`). */
  h2: { fontFamily: F.display, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: C.ink },
  /** A photo card's title. */
  cardTitle: { fontFamily: F.display, fontSize: 22, lineHeight: 26, letterSpacing: -0.4, color: C.ink },
  h3: { fontFamily: F.display, fontSize: 20, lineHeight: 24, letterSpacing: -0.3, color: C.ink },
  /** A heading inside a section or a card: a block's name, an empty state's title. */
  heading: { fontFamily: F.display, fontSize: 18, lineHeight: 22, letterSpacing: -0.2, color: C.ink },
  /** One value size in every stat tile. */
  statValue: { fontFamily: F.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.5, color: C.ink, ...tabular },
  /** A thing's name in a row or a card. */
  title: { fontFamily: F.display, fontSize: 16, lineHeight: 20, letterSpacing: -0.1, color: C.ink },
  /** A plain row's title (Etapa's Row), an input. */
  lead: { fontFamily: F.medium, fontSize: 15, lineHeight: 20, color: C.ink },
  /** The longer reading: an item's blurb. */
  bodyLarge: { fontFamily: F.regular, fontSize: 16, lineHeight: 24, color: C.ink },
  body: { fontFamily: F.regular, fontSize: 15, lineHeight: 22, color: C.inkMid },
  bodyStrong: { fontFamily: F.semibold, fontSize: 15, lineHeight: 22, color: C.ink },
  /** A row's second line, notes, captions. */
  small: { fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: C.inkFaint },
  /** A field's name, a stat's label, a unit. Sentence case, never an eyebrow. */
  label: { fontFamily: F.medium, fontSize: 13, lineHeight: 18, color: C.inkMid },
  /** Hints, counters, a badge, a tab's label. */
  caption: { fontFamily: F.medium, fontSize: 11, lineHeight: 14, color: C.inkFaint },
  button: { fontFamily: F.display, fontSize: 16, letterSpacing: -0.1 },
} satisfies Record<string, TextStyle>;

/** The one shadow: the floating tab bar's (Naz's and Etapa's). Nothing in the flow casts one. */
export const shadowFloat: ViewStyle =
  Platform.OS === 'web'
    ? ({ boxShadow: '0 8px 18px rgba(17,17,19,0.12), 0 1px 3px rgba(17,17,19,0.06)' } as ViewStyle)
    : { shadowColor: '#7A7A85', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 };

/** Room the floating tab bar takes at the foot of a screen, above the safe area: its height, its lift and a margin. */
export const TAB_BAR_ROOM = 64 + 16 + 24;

/** Laptop width: the dashboard shows its sidebar, the member app a wider column. */
export function useWide() {
  return useWindowDimensions().width >= 1024;
}
