/**
 * App Store screenshots, from the web export in demo mode: Playwright's
 * Chromium signs up a new member, answers onboarding, runs the app's own
 * PREPARE steps, then captures each of SHOTS at Apple's sizes:
 *
 *   APP_IPHONE_67   the 6.9-inch iPhone, 1320×2868 (a 440×956 screen at 3x)
 *   APP_IPAD_PRO_3GEN_129   the 13-inch iPad, 2064×2752 (1032×1376 at 2x),
 *                   only while app.json says the app runs on iPad
 *
 * into store/apple/screenshot/<locale>/<type>/, and writes those paths into
 * store.config.json for `eas metadata:push`. It fails on any page error, and
 * on a screen that scrolls sideways. Check the pictures by eye before
 * committing them: no placeholder photo, nothing cut off, nobody's real data.
 *
 *   npx expo export --platform web
 *   npm run store:screens
 *
 * Playwright: the copy a cloud session has preinstalled (found through
 * `npm root -g`, or PLAYWRIGHT_MODULE), or `npm i -D playwright`.
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.join(import.meta.dirname, '..');
const PORT = Number(process.env.PORT ?? 4392);
const BASE = `http://localhost:${PORT}`;
const CONFIG = path.join(ROOT, 'store.config.json');

/** Apple's display types, and the screen each is captured on. */
const DEVICES = [
  { type: 'APP_IPHONE_67', viewport: { width: 440, height: 956 }, scale: 3, isMobile: true },
  { type: 'APP_IPAD_PRO_3GEN_129', viewport: { width: 1032, height: 1376 }, scale: 2, isMobile: false, tablet: true },
];

/** After onboarding, what the member does first so the screens have something in them. Add your app's steps here. */
const PREPARE = [];

/** The screenshots, in the order the App Store shows them (up to 10): a file name and the page. Change these for your app. */
const SHOTS = [
  ['01-home', '/home'],
  ['02-path', '/path'],
  ['03-library', '/library'],
  ['04-checkin', '/checkin'],
  ['05-account', '/account'],
];

async function playwright() {
  const tries = [process.env.PLAYWRIGHT_MODULE, 'playwright'];
  try {
    tries.push(pathToFileURL(path.join(execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(), 'playwright', 'index.mjs')).href);
  } catch {
    // No global npm root: the local install or PLAYWRIGHT_MODULE, or nothing.
  }
  tries.push(pathToFileURL('/opt/node-tools/node_modules/playwright/index.mjs').href);
  for (const t of tries.filter(Boolean)) {
    try {
      return await import(t);
    } catch {
      // The next place.
    }
  }
  throw new Error('Playwright isn’t installed: npm i -D playwright && npx playwright install chromium');
}

/** The local server in demo mode: no database variables, so the app keeps everything in the browser. */
function serve() {
  if (!fs.existsSync(path.join(ROOT, 'dist', 'index.html'))) throw new Error('No web export: run npx expo export --platform web first.');
  const env = { ...process.env, PORT: String(PORT) };
  for (const k of ['SUPABASE_DB_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY']) delete env[k];
  const server = spawn(process.execPath, ['--import', 'tsx', 'scripts/serve-local.ts'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'inherit'] });
  return new Promise((resolve, reject) => {
    server.stdout.on('data', (d) => String(d).includes('Serving') && resolve(server));
    server.on('exit', (code) => reject(new Error(`The local server stopped (${code}).`)));
  });
}

/** A new member, through onboarding: each unanswered question gets its first answer, until Start. */
async function signUp(page) {
  await page.goto(`${BASE}/sign-in?mode=up`);
  await page.getByLabel('Email').fill(`store${Date.now()}@example.com`);
  await page.getByLabel('Password').fill('a-password-123');
  await page.getByLabel('Your name').fill('Sam');
  await page.getByRole('button', { name: 'Create account' }).click();
  await page.waitForURL(/onboarding|home/);
  for (let i = 0; i < 30 && /onboarding/.test(page.url()); i++) {
    let answered = 0;
    for (const group of await page.getByRole('radiogroup').all()) {
      if (await group.locator('[aria-checked="true"]').count()) continue;
      await group.getByRole('radio').first().click();
      answered++;
      await page.waitForTimeout(150);
    }
    if (!answered && (await page.getByRole('button', { name: 'Start' }).count())) {
      await page.getByRole('button', { name: 'Start' }).last().click();
      await page.waitForURL(/home/);
    }
  }
}

const config = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));
const tablet = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8')).expo.ios?.supportsTablet === true;
const locales = Object.keys(config.apple.info);
const server = await serve();
const { chromium } = await playwright();
const browser = await chromium.launch();
const problems = [];
const written = {};
try {
  for (const device of DEVICES.filter((d) => tablet || !d.tablet)) {
    const page = await browser.newPage({ viewport: device.viewport, deviceScaleFactor: device.scale, isMobile: device.isMobile, hasTouch: true });
    page.on('pageerror', (e) => problems.push(`${device.type}: page error: ${e.message}`));
    await signUp(page);
    for (const step of PREPARE) await step(page);
    for (const [name, route] of SHOTS) {
      await page.goto(`${BASE}${route}`);
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await page.waitForTimeout(1500);
      const wide = await page.evaluate(() => document.documentElement.scrollWidth);
      if (wide > device.viewport.width) problems.push(`${device.type} ${name} scrolls sideways (${wide}px wide)`);
      for (const locale of locales) {
        const file = `store/apple/screenshot/${locale}/${device.type}/${name}.png`;
        fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
        await page.screenshot({ path: path.join(ROOT, file) });
        ((written[locale] ??= {})[device.type] ??= []).push(file);
        console.log(file);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
  server.kill();
}
if (problems.length) {
  console.error(`\n${problems.join('\n')}`);
  process.exit(1);
}
for (const locale of locales) config.apple.info[locale].screenshots = written[locale];
fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2) + '\n');
console.log('\nstore.config.json lists them. Look at each before committing.');
