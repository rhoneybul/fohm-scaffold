/**
 * Draws every brand image from the mark's geometry in src/lib/logo.ts, so the
 * icons, Android's adaptive icon, the favicon and the launch screen are one
 * shape and nothing is edited by hand: it writes the SVGs in assets/brand/
 * (`sources()`), renders the PNGs from them (`OUTPUTS`), and brings the web
 * page's splash in public/index.html up to date (src/lib/splash.ts). Change
 * the mark in logo.ts and run it again.
 *
 *   npm run brand                                   every SVG, every PNG, the web splash
 *   npx tsx scripts/brand-assets.ts --sheet sheet.png a.svg b.svg
 *                                                   logo concepts compared: each at
 *                                                   1024, 180, 58 and 29 px and as a
 *                                                   32 px favicon, on light and dark
 *
 * A source that isn't there yet is skipped. tests/brand-assets.test.ts holds it.
 */
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';

import { iconSvg, markSvg } from '../src/lib/logo';
import { SPLASH, withSplash } from '../src/lib/splash';

const root = path.join(import.meta.dirname, '..');

/** The icons' ground: the brand's ink, as the splash's. */
const INK = SPLASH.background;
const WHITE = '#FFFFFF';
const S = 1024;

/** Android draws an adaptive icon's 108dp layers inside a 72dp mask: the mark at 60% of what shows is 40% of the layer. */
export const ANDROID_MARK = 0.6 * (72 / 108);

/** Every SVG source drawn from logo.ts, by its name in assets/brand/. A wordmark (the mark and the name as paths) is added by hand. */
export function sources(): Record<string, string> {
  const square = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><rect width="${S}" height="${S}" fill="${INK}"/></svg>`;
  return {
    // The mark alone, transparent, in ink: anywhere it stands on a light ground.
    'mark.svg': markSvg({ size: S, color: INK }),
    // iOS and the stores: the mark at 60% in white on ink, well inside the corner mask; full bleed, the stores round it.
    'icon.svg': iconSvg({ size: S, ground: INK, color: WHITE, markShare: 0.6 }),
    // Android's adaptive icon: the foreground, its ink background, and the themed (monochrome) icon.
    'adaptive-icon.svg': iconSvg({ size: S, color: WHITE, markShare: ANDROID_MARK }),
    'adaptive-icon-background.svg': square,
    'adaptive-icon-monochrome.svg': iconSvg({ size: S, color: WHITE, markShare: ANDROID_MARK }),
    // The browser tab: a rounded ink tile, so it holds on light and dark tab strips.
    'favicon.svg': iconSvg({ size: 64, ground: INK, color: WHITE, markShare: 0.72, radius: 14 }),
    // The launch screen: the mark in white, edge to edge, on app.json's ink (its imageWidth is the mark's size).
    'splash.svg': markSvg({ size: S, color: SPLASH.mark }),
  };
}

/** Each source in assets/brand/ and the PNGs drawn from it, by width. */
export const OUTPUTS: { source: string; out: string; width: number }[] = [
  { source: 'icon.svg', out: 'assets/icon/icon.png', width: 1024 }, // the app icon: full bleed, the mark inside iOS's safe zone
  { source: 'icon.svg', out: 'public/apple-touch-icon.png', width: 180 },
  { source: 'adaptive-icon.svg', out: 'assets/icon/adaptive-icon.png', width: 1024 },
  { source: 'adaptive-icon-background.svg', out: 'assets/icon/adaptive-icon-background.png', width: 1024 },
  { source: 'adaptive-icon-monochrome.svg', out: 'assets/icon/adaptive-icon-monochrome.png', width: 1024 },
  { source: 'splash.svg', out: 'assets/icon/splash.png', width: 1024 }, // expo-splash-screen's image
  { source: 'mark.svg', out: 'assets/icon/mark.png', width: 1024 }, // anywhere the mark stands alone
  { source: 'wordmark.svg', out: 'assets/icon/wordmark.png', width: 1200 },
  { source: 'favicon.svg', out: 'public/favicon.png', width: 48 },
];

/** Writes every source from logo.ts into `dir`/assets/brand. Returns their names. */
export function writeSources(dir = root): string[] {
  const brand = path.join(dir, 'assets', 'brand');
  fs.mkdirSync(brand, { recursive: true });
  return Object.entries(sources()).map(([name, svg]) => {
    fs.writeFileSync(path.join(brand, name), `${svg}\n`);
    return name;
  });
}

/** Brings the web page's splash (public/index.html) up to date with logo.ts and splash.ts. */
export function writeWebSplash(dir = root): void {
  const page = path.join(dir, 'public', 'index.html');
  if (fs.existsSync(page)) fs.writeFileSync(page, withSplash(fs.readFileSync(page, 'utf8')));
}

/** The sizes a concept is judged at, smallest last: legibility at 29 px decides first. */
export const SHEET_SIZES = [1024, 180, 58, 29];
export const FAVICON = 32;
const GROUNDS = ['#F7F5F0', '#1C1F1D'];
const GAP = 24;

/** One SVG as a PNG, `width` pixels wide. */
export function render(svg: string, width: number): Buffer {
  return Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng());
}

/** A PNG's width and height, read from its header. */
export const pngSize = (png: Buffer) => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });

/** An SVG placed as a square at (x, y), `size` wide: its root tag's own position and size replaced. */
function placed(svg: string, x: number, y: number, size: number): string {
  const body = svg.replace(/<\?xml[^>]*\?>/, '').trim();
  return body.replace(/<svg\b([^>]*)>/, (_, attrs: string) => `<svg${attrs.replace(/\s(x|y|width|height)="[^"]*"/g, '')} x="${x}" y="${y}" width="${size}" height="${size}">`);
}

/** Every concept in a row, each size side by side on the light ground and then the dark. */
export function sheet(concepts: string[]): string {
  const sizes = [...SHEET_SIZES, FAVICON];
  const half = sizes.reduce((sum, s) => sum + s + GAP, GAP);
  const row = SHEET_SIZES[0] + GAP * 2;
  const tiles = concepts.flatMap((svg, r) =>
    GROUNDS.flatMap((ground, g) => {
      let x = g * half + GAP;
      return [
        `<rect x="${g * half}" y="${r * row}" width="${half}" height="${row}" fill="${ground}"/>`,
        ...sizes.map((s) => {
          const tile = placed(svg, x, r * row + GAP, s);
          x += s + GAP;
          return tile;
        }),
      ];
    }),
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${half * 2}" height="${row * concepts.length}">${tiles.join('')}</svg>`;
}

/** Renders every output whose source is in `dir`/assets/brand. Returns what it wrote. */
export function buildAssets(dir = root): string[] {
  return OUTPUTS.flatMap(({ source, out, width }) => {
    const from = path.join(dir, 'assets', 'brand', source);
    if (!fs.existsSync(from)) return [];
    fs.mkdirSync(path.dirname(path.join(dir, out)), { recursive: true });
    fs.writeFileSync(path.join(dir, out), render(fs.readFileSync(from, 'utf8'), width));
    return [out];
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const [flag, out, ...concepts] = process.argv.slice(2);
  if (flag === '--sheet') {
    if (!out || !concepts.length) throw new Error('npx tsx scripts/brand-assets.ts --sheet <out.png> <concept.svg>...');
    const svg = sheet(concepts.map((f) => fs.readFileSync(f, 'utf8')));
    fs.writeFileSync(out, render(svg, Number(/width="(\d+)"/.exec(svg)![1])));
    console.log(`wrote ${out}`);
  } else {
    console.log(`assets/brand: ${writeSources().join(', ')}, from src/lib/logo.ts`);
    console.log(`wrote ${buildAssets().join(', ')}`);
    writeWebSplash();
    console.log('public/index.html: the splash, from src/lib/splash.ts');
  }
}
