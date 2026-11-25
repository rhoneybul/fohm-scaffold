/**
 * Renders the brand's PNGs from its SVG sources, so no PNG is ever edited by
 * hand: change an SVG in assets/brand/ and run it again.
 *
 *   npm run brand                                   every PNG in OUTPUTS
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

const root = path.join(import.meta.dirname, '..');

/** Each source in assets/brand/ and the PNGs drawn from it, by width. */
export const OUTPUTS: { source: string; out: string; width: number }[] = [
  { source: 'icon.svg', out: 'assets/icon/icon.png', width: 1024 }, // the app icon: full bleed, the mark inside iOS's safe zone
  { source: 'icon.svg', out: 'public/apple-touch-icon.png', width: 180 },
  { source: 'mark.svg', out: 'assets/icon/mark.png', width: 1024 }, // the splash and anywhere the mark stands alone
  { source: 'wordmark.svg', out: 'assets/icon/wordmark.png', width: 1200 },
  { source: 'favicon.svg', out: 'public/favicon.png', width: 32 },
];

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
    const wrote = buildAssets();
    console.log(wrote.length ? `wrote ${wrote.join(', ')}` : 'No SVG sources in assets/brand/ yet: mark.svg, icon.svg, wordmark.svg, favicon.svg.');
  }
}
