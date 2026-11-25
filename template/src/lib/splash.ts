/**
 * The launch screen, drawn the same three times so each hands over to the
 * next without a jump: the phone's own splash (expo-splash-screen in
 * app.json, from assets/icon/splash.png), the web page before its script
 * runs (public/index.html) and LoadingSplash in the app
 * (src/components/logo-loader.tsx), which adds Naz's throb. All three read
 * these numbers; tests/splash.test.ts holds app.json and public/index.html to
 * them, and `npm run brand` rewrites both. Plain logic, tested in Node.
 */
import { BOX, markSvg } from './logo';

/**
 * The splash: the brand's ink (`C.ink`) with the mark in white, in light and
 * dark alike. `size` is the mark's width on screen in points: app.json's
 * `imageWidth`, since splash.png is the mark edge to edge.
 */
export const SPLASH = { background: '#111113', mark: '#FFFFFF', size: 120 } as const;

/**
 * Naz's throb (app/src/components/logoLoader.js): the mark settles to 92%
 * and 55% bright over 700 ms, then swells back over 700 ms, on a loop. It
 * starts at the top, whole and bright, which is how the splash shows it.
 */
export const THROB = { settleMs: 700, swellMs: 700, smallest: 0.92, faintest: 0.55 } as const;

/** One full throb, in milliseconds. */
export const THROB_MS = THROB.settleMs + THROB.swellMs;

/** The mark's scale and opacity at a level of the throb: 1 is the top (the splash), 0 the rest. */
export function throbAt(level: number) {
  const l = Math.min(1, Math.max(0, level));
  return { scale: THROB.smallest + (1 - THROB.smallest) * l, opacity: THROB.faintest + (1 - THROB.faintest) * l };
}

/** The easings of the two halves, as Animated runs them and as CSS's cubic-béziers draw the same curves. */
const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeOutQuad = (t: number) => 1 - (1 - t) * (1 - t);
export const CSS_EASING = { settle: 'cubic-bezier(0.455,0.03,0.515,0.955)', swell: 'cubic-bezier(0.25,0.46,0.45,0.94)' } as const;

/**
 * Where the throb is `ms` after it started: its level, which way it's going,
 * and how long is left of this half. The web page's splash starts throbbing
 * in CSS as the page loads; the app's picks up from the same point, so the
 * handover doesn't jump.
 */
export function phaseAt(ms: number): { level: number; toward: 0 | 1; left: number } {
  const t = ((ms % THROB_MS) + THROB_MS) % THROB_MS;
  if (t < THROB.settleMs) return { level: 1 - easeInOutQuad(t / THROB.settleMs), toward: 0, left: THROB.settleMs - t };
  return { level: easeOutQuad((t - THROB.settleMs) / THROB.swellMs), toward: 1, left: THROB_MS - t };
}

/** Whether the mark moves: never when the person has asked for less motion; it stands still at the top. */
export const throbs = (reduceMotion: boolean) => !reduceMotion;

/** Longest the launch screen waits for the fonts and the session before the app draws anyway. */
export const BOOT_WAIT_MS = 4000;

/** How long the launch screen takes to fade once the app is ready. */
export const FADE_MS = 220;

/** The marker pair around the splash in public/index.html. */
const START = '<!-- splash -->';
const END = '<!-- /splash -->';

/**
 * The splash as HTML for the web page, before any script runs: the ink
 * ground over the whole window, the mark centred at its size, throbbing in
 * CSS on the same keyframes and easings, still under reduced motion. It
 * sits beside #root, over it, until LoadingSplash has drawn under it and
 * takes it away (`hideNativeSplash`), so the page is never blank.
 */
export function splashHtml(): string {
  const { scale, opacity } = throbAt(0);
  const settle = Math.round((THROB.settleMs / THROB_MS) * 100);
  return [
    START,
    `<div id="splash" style="position:fixed;inset:0;z-index:2147483647;display:flex;align-items:center;justify-content:center;background:${SPLASH.background}">`,
    `<style>@keyframes splash-throb{0%,100%{transform:scale(1);opacity:1;animation-timing-function:${CSS_EASING.settle}}${settle}%{transform:scale(${scale});opacity:${opacity};animation-timing-function:${CSS_EASING.swell}}}#splash svg{animation:splash-throb ${THROB_MS}ms infinite}@media (prefers-reduced-motion:reduce){#splash svg{animation:none}}</style>`,
    markSvg({ size: SPLASH.size, color: SPLASH.mark, label: 'Loading' }),
    '</div>',
    END,
  ].join('');
}

/** The page with its splash brought up to date: straight after #root, replacing an older one. */
export function withSplash(html: string): string {
  const clean = html.replace(/<!-- splash -->[\s\S]*?<!-- \/splash -->/, '');
  return clean.replace(/<div id="root"><\/div>/, `<div id="root"></div>${splashHtml()}`);
}

/** The mark's box, for drawing it: the viewBox every copy shares. */
export const VIEWBOX = `${BOX.x} ${BOX.y} ${BOX.size} ${BOX.size}`;
