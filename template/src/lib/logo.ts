/**
 * The mark, as numbers: the one place the logo's shape lives. The app icons,
 * Android's adaptive icon, the favicon, the launch screen and the throbbing
 * loader are all drawn from it (scripts/brand-assets.ts, `npm run brand`;
 * src/components/logo-loader.tsx), so they are one shape at every size and no
 * image is edited by hand. Naz's logo (app/src/logo.js) and Strawberry
 * Fields' (app/src/lib/logo.ts) are built the same way.
 *
 * What ships is a neutral placeholder, a ring around a dot. A new app replaces
 * `MARK_PATH` (and `BOX`, if its grid differs) with its own mark: traced from
 * the owner's artwork, or the concept they picked in the logo round
 * (fohm-scaffold's app-design skill, reference/logo.md). One colour, filled,
 * drawn with the even-odd rule, so a hole is a second outline inside the
 * first. Plain logic, tested in Node (tests/logo.test.ts).
 */

/** The grid the geometry is drawn on. */
export const GRID = 1024;

/** The placeholder: a ring (its outer and inner edge) and a dot in the middle. */
const RING = { cx: 512, cy: 512, outer: 320, inner: 250, dot: 110 };

/** The mark's square: what a size means. The mark's edge touches all four sides. */
export const BOX = { x: RING.cx - RING.outer, y: RING.cy - RING.outer, size: 2 * RING.outer };

/** A whole circle as path data: two half arcs. */
const circle = (cx: number, cy: number, r: number) => `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;

/** The whole mark as one path's data on the grid, filled with the even-odd rule. Replace it with your own. */
export const MARK_PATH = [circle(RING.cx, RING.cy, RING.outer), circle(RING.cx, RING.cy, RING.inner), circle(RING.cx, RING.cy, RING.dot)].join(' ');

/** How the path is filled: even-odd, so an outline inside another cuts a hole. */
export const FILL_RULE = 'evenodd';

const round = (n: number) => Math.round(n * 10) / 10;
const parts = (color: string) => `<path d="${MARK_PATH}" fill="${color}" fill-rule="${FILL_RULE}"/>`;
const scaleFor = (size: number) => Number((size / BOX.size).toFixed(5));

/** The mark as an SVG <g>, `size` across with its top left at x,y, in one colour. */
export function markGroup({ size, x = 0, y = 0, color }: { size: number; x?: number; y?: number; color: string }) {
  return `<g transform="translate(${round(x)} ${round(y)}) scale(${scaleFor(size)}) translate(${-BOX.x} ${-BOX.y})">${parts(color)}</g>`;
}

/** The mark alone as an SVG, `size` across, in one colour; named when it stands alone, hidden when words beside it say the name. */
export function markSvg({ size, color = 'currentColor', label }: { size: number; color?: string; label?: string }) {
  const named = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${BOX.x} ${BOX.y} ${BOX.size} ${BOX.size}" ${named}>${parts(color)}</svg>`;
}

/**
 * An icon: the mark centred on a square ground, `markShare` of its width
 * (0.6 for the app icon, inside iOS's corner mask and Android's safe circle),
 * `size` px. Without a ground, it's transparent (Android's foreground).
 */
export function iconSvg({ size, ground, color, markShare = 0.6, radius = 0 }: { size: number; ground?: string; color: string; markShare?: number; radius?: number }) {
  const mark = size * markShare;
  const at = (size - mark) / 2;
  const back = ground ? `<rect width="${size}" height="${size}" rx="${radius}" fill="${ground}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${back}${markGroup({ size: mark, x: at, y: at, color })}</svg>`;
}
