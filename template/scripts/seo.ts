/**
 * Writes the landing page's tags for search and shared links into the web
 * export (Etapa's per-page checklist): the title, description, canonical,
 * Open Graph and Twitter tags, and structured data, from src/lib/brand.ts.
 * The site's address is `expo.extra.apiUrl` in app.json (the web app and its
 * API share one origin). The share image is the brand's card, public/og.png
 * (`npm run og`), else the hero photo. Runs after every web export:
 *
 *   npx expo export --platform web && npx tsx scripts/seo.ts
 */
import fs from 'node:fs';
import path from 'node:path';

import { APP } from '../src/lib/brand';
import { siteOrigin, withSeo } from '../src/lib/landing';

/** Run from the app's folder (npm run …). */
const ROOT = process.cwd();
const dist = path.resolve(process.argv[2] ?? path.join(ROOT, 'dist'));
const page = path.join(dist, 'index.html');
if (!fs.existsSync(page)) throw new Error('No web export: run npx expo export --platform web first.');

const app = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'));
const origin = siteOrigin(app.expo?.extra?.apiUrl ?? '');
const card = fs.existsSync(path.join(dist, 'og.png'));
const image = card ? `${origin}/og.png` : APP.heroPhoto?.url;

fs.writeFileSync(
  page,
  withSeo(fs.readFileSync(page, 'utf8'), {
    name: APP.name,
    tagline: APP.tagline,
    description: APP.description,
    origin,
    operator: APP.operator,
    image,
    imageSize: card ? { width: 1200, height: 630 } : undefined,
    stores: APP.stores,
  }),
);
console.log(`Search and share tags written for ${origin}/${image ? '' : ' (no share image yet: npm run og)'}`);
