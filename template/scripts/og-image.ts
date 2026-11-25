/**
 * Renders the share card links show on WhatsApp, Slack, X and in search
 * (Etapa's 1200x630 Open Graph image, in the house style): the canvas, the
 * app's name and promise in Space Grotesk, its description in DM Sans, the
 * accent's disc, and the hero photo on the right once there is one. Written
 * to public/og.png, which the web export carries and scripts/seo.ts names.
 * Run again after changing the name, tagline, description, accent or photo:
 *
 *   npm run og
 *
 * Needs Playwright's Chromium (preinstalled in cloud sessions, or
 * `npm i -D playwright && npx playwright install chromium`).
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { APP } from '../src/lib/brand';

/** Run from the app's folder (npm run …). */
const ROOT = process.cwd();
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, 'public', 'og.png'));
const theme = fs.readFileSync(path.join(ROOT, 'src/lib/theme.ts'), 'utf8');
const token = (name: string, fallback: string) => new RegExp(`\\b${name}: '(#[0-9A-Fa-f]{6})'`).exec(theme)?.[1] ?? fallback;
/** A face as a data address: a page set from a string can't load files. */
const font = (pkg: string, file: string) => `data:font/ttf;base64,${fs.readFileSync(path.join(ROOT, 'node_modules/@expo-google-fonts', pkg, file)).toString('base64')}`;
const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

async function playwright(): Promise<any> {
  const tries = [process.env.PLAYWRIGHT_MODULE, 'playwright'];
  try {
    tries.push(pathToFileURL(path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'playwright', 'index.mjs')).href);
  } catch {
    // No global npm root.
  }
  tries.push(pathToFileURL('/opt/node-tools/node_modules/playwright/index.mjs').href);
  for (const t of tries.filter(Boolean) as string[]) {
    try {
      return await import(t);
    } catch {
      // The next place.
    }
  }
  throw new Error('Playwright isn’t installed: npm i -D playwright && npx playwright install chromium');
}

function cardHtml() {
  const bg = token('bg', '#F2F2F6');
  const ink = token('ink', '#111113');
  const inkMid = token('inkMid', '#4A4A52');
  const accent = token('accent', '#2F6B4F');
  const photo = APP.heroPhoto?.url;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: 'Space Grotesk'; font-weight: 600; src: url(${font('space-grotesk', '600SemiBold/SpaceGrotesk_600SemiBold.ttf')}); }
@font-face { font-family: 'DM Sans'; font-weight: 400; src: url(${font('dm-sans', '400Regular/DMSans_400Regular.ttf')}); }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; background: ${bg}; display: flex; overflow: hidden; }
.words { flex: 1; padding: 72px 64px; display: flex; flex-direction: column; }
.name { display: flex; align-items: center; gap: 16px; font: 600 34px/1 'Space Grotesk'; color: ${ink}; letter-spacing: -0.6px; }
.disc { width: 28px; height: 28px; border-radius: 50%; background: ${accent}; }
h1 { margin-top: auto; font: 600 ${photo ? 58 : 68}px/1.04 'Space Grotesk'; color: ${ink}; letter-spacing: -1.6px; }
p { margin-top: 24px; font: 400 26px/1.35 'DM Sans'; color: ${inkMid}; max-width: 30em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.photo { width: 470px; margin: 32px 32px 32px 0; border-radius: 22px; background: #E6E6EB center / cover no-repeat; }
</style></head><body>
<div class="words"><div class="name"><span class="disc"></span>${escape(APP.name)}</div><h1>${escape(APP.tagline)}</h1><p>${escape(APP.description)}</p></div>
${photo ? `<div class="photo" style="background-image:url('${escape(photo)}')"></div>` : ''}
</body></html>`;
}

async function main() {
  const { chromium } = await playwright();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
    await page.setContent(cardHtml(), { waitUntil: 'networkidle' });
    await page.evaluate(() => (document as any).fonts.ready);
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    await page.screenshot({ path: OUT });
    console.log(`Share card written to ${path.relative(ROOT, OUT)}`);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
