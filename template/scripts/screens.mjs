/**
 * Screenshots of the member's main flow, for the owner and for reviewing a
 * change: serves the web export (dist/) with scripts/serve-local.ts in demo
 * mode (no database: everything stays in the browser), then walks it with
 * Playwright's Chromium at 393×852 at scale 2, as on a phone: the landing
 * page, creating an account, onboarding (a coaching app), Home, each main tab,
 * then the screens off them. It fails on any page error, and on any screen
 * that scrolls sideways.
 *
 *   npx expo export --platform web
 *   node scripts/screens.mjs [folder]      (screens/ by default)
 *
 * Send the owner the screenshots with the preview link after each feature.
 * Playwright: `npm i -D playwright && npx playwright install chromium`, or the
 * copy a cloud session has preinstalled (found through `npm root -g`, or
 * PLAYWRIGHT_MODULE pointing at its index.mjs). Add your screens to WALK.
 */
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.join(import.meta.dirname, '..');
const OUT = path.resolve(process.argv[2] ?? path.join(ROOT, 'screens'));
const PORT = Number(process.env.PORT ?? 4390);
const BASE = `http://localhost:${PORT}`;
const SIZE = { width: 393, height: 852 };
const KIND = /kind: '(\w+)' as/.exec(fs.readFileSync(path.join(ROOT, 'src/lib/brand.ts'), 'utf8'))?.[1] ?? 'coaching';

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

/** The walk: each step a name for its screenshot and what to do first. Add your app's screens here. */
const WALK = [
  ['landing', async (page) => page.goto(BASE)],
  ['sign-up', async (page) => page.goto(`${BASE}/sign-in?mode=up`)],
  [
    KIND === 'coaching' ? 'onboarding' : 'home',
    async (page) => {
      await page.getByLabel('Email').fill(`screens${Date.now()}@example.com`);
      await page.getByLabel('Password').fill('a-password-123');
      await page.getByLabel('Your name').fill('Sam Lee');
      await page.getByRole('button', { name: 'Create account' }).click();
      await page.waitForURL(KIND === 'coaching' ? /onboarding/ : /home/);
    },
  ],
  ...(KIND === 'coaching'
    ? [
        [
          'home',
          async (page) => {
            for (const group of await page.getByRole('radiogroup').all()) await group.getByRole('radio').first().click();
            await page.getByRole('button', { name: 'Start' }).last().click();
            await page.waitForURL(/home/);
          },
        ],
        ['path', async (page) => page.getByRole('tab', { name: 'Path' }).click()],
        ['library', async (page) => page.getByRole('tab', { name: 'Library' }).click()],
        ['checkin', async (page) => page.goto(`${BASE}/checkin`)],
      ]
    : KIND === 'game'
      ? [['game', async (page) => page.goto(`${BASE}/game`)]]
      : []),
  ['write', async (page) => page.goto(`${BASE}/write`)],
  ['account', async (page) => page.goto(`${BASE}/account`)],
  ['credits', async (page) => page.goto(`${BASE}/credits`)],
];

const server = await serve();
const { chromium } = await playwright();
const browser = await chromium.launch();
const problems = [];
try {
  fs.mkdirSync(OUT, { recursive: true });
  const page = await browser.newPage({ viewport: SIZE, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  for (const [name, go] of WALK) {
    try {
      await go(page);
    } catch (e) {
      problems.push(`${name}: couldn’t get there (${e.message.split('\n')[0]})`);
      continue;
    }
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await page.waitForTimeout(600);
    const wide = await page.evaluate(() => document.documentElement.scrollWidth);
    if (wide > SIZE.width) problems.push(`${name} scrolls sideways (${wide}px wide)`);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log(`${name}.png`);
  }
} finally {
  await browser.close();
  server.kill();
}
if (problems.length) {
  console.error(`\n${problems.join('\n')}`);
  process.exit(1);
}
console.log(`\nEvery screen at ${SIZE.width}×${SIZE.height}, scale 2, in ${OUT}`);
