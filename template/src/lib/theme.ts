/**
 * Design tokens for the member app (light) and the owner's dashboard (dark).
 * Change the brand here, once: every screen reads these. Record the system in
 * DESIGN.md as it grows. Text colours keep 4.5:1 on their backgrounds.
 *
 * The member app's starting world: a white ground, grey panels, heavy ink
 * type in real fonts (src/lib/fonts.ts), black pills for the one thing to
 * press, white cards lifted by a soft shadow rather than a border, photos
 * wherever they make it personal, and the accent only for what's live now
 * (today's session, a countdown). Make it the brand's from the references in
 * DESIGN.md: the faces, the accent, the photos.
 */
import { Platform, useWindowDimensions, type TextStyle, type ViewStyle } from 'react-native';

import { FACES } from './fonts';

export const C = {
  /** The ground: white. */
  bg: '#FFFFFF',
  /** Cards and anything raised off a panel. */
  surface: '#FFFFFF',
  /** Grey panels: notes, a filter's ground, a photo before it loads. */
  panel: '#F2F3F5',
  /** Tracks, rings and the odd hairline. */
  line: '#E3E5E8',
  /** Kept for screens that still draw a hairline. */
  border: '#E3E5E8',
  ink: '#111214',
  /** Secondary text: 6.3:1 on white, 5.7:1 on the panel. */
  inkMid: '#5B6068',
  /** Quiet text: 5.2:1 on white, 4.7:1 on the panel. */
  inkFaint: '#686D75',
  /** On ink, or over a scrim. */
  onInk: '#FFFFFF',
  onInkMid: '#C9CCD1',
  /** The brand's one colour: only for what's live now. The wizard writes it; keep 4.5:1 on white. */
  accent: '#2F6B4F',
  onAccent: '#FFFFFF',
  accentSoft: '#E3EFE8',
  danger: '#A63A2B',
  /** The ground under a photo that hasn't loaded, on a dark card. */
  photoGround: '#2A2D31',
};

/** The dashboard: dark, so it never gets mistaken for the member app. */
export const A = {
  bg: '#14211B',
  sidebar: '#101A15',
  surface: '#1B2B23',
  surfaceLight: '#22362C',
  border: '#2E4539',
  text: '#F1EEE6',
  textMid: '#C5CEC8',
  textFaint: '#9DAAA2',
  primary: '#F2D777',
  onPrimary: '#14211B',
  primarySoft: 'rgba(242,215,119,0.14)',
  highlight: '#F3A3B5',
  good: '#9FE0B8',
};

export const R = { sm: 8, md: 14, lg: 20, pill: 999 };
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };
export const MAX_W = 640;
/** The dashboard's face. The member app uses `F` and `T`. */
export const sans = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** A face by name, with the system's as the browser's fallback while it loads (or if it never does). */
const face = (name: string) => (Platform.OS === 'web' ? `${name}, ${sans}` : name);
export const F = {
  regular: face(FACES.regular),
  medium: face(FACES.medium),
  semibold: face(FACES.semibold),
  bold: face(FACES.bold),
  extrabold: face(FACES.extrabold),
  black: face(FACES.black),
  numeral: face(FACES.numeral),
};

/**
 * The type scale. Display sizes track about -0.02em: tight, but the word
 * spaces stay open (tighter ran words together). Body text keeps its own.
 */
export const T = {
  hero: { fontFamily: F.black, fontSize: 44, lineHeight: 47, letterSpacing: -0.9, color: C.ink },
  display: { fontFamily: F.black, fontSize: 40, lineHeight: 43, letterSpacing: -0.8, color: C.ink },
  /** A question, or an item's name on its own page. */
  headline: { fontFamily: F.black, fontSize: 34, lineHeight: 38, letterSpacing: -0.7, color: C.ink },
  title: { fontFamily: F.extrabold, fontSize: 30, lineHeight: 34, letterSpacing: -0.6, color: C.ink },
  /** White type over a photo or on a black card. */
  cardTitle: { fontFamily: F.extrabold, fontSize: 28, lineHeight: 32, letterSpacing: -0.5, color: C.onInk },
  heading: { fontFamily: F.extrabold, fontSize: 20, lineHeight: 24, letterSpacing: -0.3, color: C.ink },
  statValue: { fontFamily: F.extrabold, fontSize: 24, lineHeight: 29, letterSpacing: -0.4, color: C.ink },
  rowTitle: { fontFamily: F.bold, fontSize: 17, lineHeight: 21, letterSpacing: -0.2, color: C.ink },
  body: { fontFamily: F.regular, fontSize: 16, lineHeight: 23, color: C.inkMid },
  bodyStrong: { fontFamily: F.semibold, fontSize: 16, lineHeight: 23, color: C.ink },
  small: { fontFamily: F.regular, fontSize: 14, lineHeight: 19, color: C.inkMid },
  label: { fontFamily: F.semibold, fontSize: 13, lineHeight: 17, color: C.inkMid },
  button: { fontFamily: F.bold, fontSize: 17, letterSpacing: -0.2 },
  /** The giant number: days to go, a timer. */
  numeral: { fontFamily: F.numeral, fontSize: 88, lineHeight: 96, letterSpacing: -2.6, color: C.ink },
} satisfies Record<string, TextStyle>;

/** A card's soft shadow, in place of a border: native shadow props in the apps, boxShadow on the web. */
export const shadow: ViewStyle =
  Platform.OS === 'web'
    ? ({ boxShadow: '0 6px 24px rgba(17,18,20,0.07), 0 1px 3px rgba(17,18,20,0.06)' } as ViewStyle)
    : { shadowColor: '#111214', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3 };

/** The floating tab bar sits a little higher. */
export const shadowFloat: ViewStyle =
  Platform.OS === 'web'
    ? ({ boxShadow: '0 10px 30px rgba(17,18,20,0.14), 0 2px 6px rgba(17,18,20,0.08)' } as ViewStyle)
    : { shadowColor: '#111214', shadowOpacity: 0.14, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 8 };

/** Room the floating tab bar takes at the foot of a screen, above the safe area: its height, its lift and a margin. */
export const TAB_BAR_ROOM = 64 + 16 + 24;

/** Laptop width: the dashboard shows its sidebar, the member app a wider column. */
export function useWide() {
  return useWindowDimensions().width >= 1024;
}
