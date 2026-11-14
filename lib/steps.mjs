/**
 * Every step from a new folder to an app live on the web and in the app
 * stores. Each says why it matters and what to do; `check` proves it where a
 * machine can (and marks it done), otherwise the person marks it done.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const read = (dir, f) => (fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8') : '');
const ok = (detail) => ({ ok: true, detail });

/** Reads the live site's /api/health, for the checks that need production. */
async function liveHealth(state) {
  const url = state.values.vercel;
  if (!url) return { error: 'Do the vercel step first (fohm-scaffold done vercel --value https://...).' };
  try {
    return { url, health: await (await fetch(`${url.replace(/\/$/, '')}/api/health`, { signal: AbortSignal.timeout(15_000) })).json() };
  } catch (e) {
    return { error: `Couldn't reach ${url}/api/health: ${e.message}` };
  }
}

/** A check that passes once the live site reports an integration on. */
const integrationOn = (key, name, vars) => async (_dir, state) => {
  const { health, error } = await liveHealth(state);
  if (error) return no(error);
  const on = health.integrations?.[key];
  return on ? ok(`${name} is on in production.`) : no(`${name} is off in production. Set ${vars} in Vercel (Production), then redeploy.`);
};
const no = (detail) => ({ ok: false, detail });

export const STEPS = [
  {
    id: 'create',
    title: 'Create the app',
    why: 'One codebase for the web app, the iOS and Android apps, the landing page and the dashboard.',
    do: ['npx github:rhoneybul/fohm-scaffold new <folder>'],
    check: (dir) => (fs.existsSync(path.join(dir, 'package.json')) ? ok('The app is here.') : no('No package.json.')),
  },
  {
    id: 'install',
    title: 'Install and run it in demo mode',
    why: 'Demo mode keeps everything on the device, so you can see the app before setting anything up.',
    do: ['npm install', 'npm run web   (the browser; on the landing page, Get started)', 'Create an account; then another, ticking "I run ..." with the code change-me, to see the dashboard', 'npm start   (then scan the QR code with Expo Go to try it on your phone)'],
    check: (dir) => (fs.existsSync(path.join(dir, 'node_modules', 'expo')) ? ok('Dependencies are installed.') : no('Run npm install in the app folder.')),
  },
  {
    id: 'product',
    title: 'Write down the product',
    why: 'Coding agents make dozens of small product decisions per feature; PRODUCT.md is what they decide from.',
    do: ['Fill in PRODUCT.md: who uses it, the one job they come to do, how you will know it works', 'Ask your agent: "Read PRODUCT.md and AGENTS.md, then tell me what is unclear."'],
    check: (dir) => (/Fill this in before writing features/.test(read(dir, 'PRODUCT.md')) ? no('PRODUCT.md still has the template text at the top. Fill it in, then delete that paragraph.') : ok('PRODUCT.md is filled in.')),
  },
  {
    id: 'brand',
    title: 'Words and brand',
    why: 'The landing page, sign-in, legal pages and app name all read from one file.',
    do: ['Edit src/lib/brand.ts: tagline and the three landing page features', 'Colours in src/lib/theme.ts; record them in DESIGN.md', 'App icon and splash: add icon.png (1024x1024) and set "icon" in app.json'],
    check: (dir) => {
      const b = read(dir, 'src/lib/brand.ts');
      if (b.includes('Start in a minute')) return no('The landing page features in src/lib/brand.ts are still the template ones.');
      if (b.includes('support@example.com')) return no('Set supportEmail in src/lib/brand.ts.');
      return ok('Brand words are your own.');
    },
  },
  {
    id: 'github',
    title: 'Put it on GitHub',
    why: 'GitHub runs the tests on every change, and Vercel deploys from it.',
    do: ['Create an empty repository on github.com (no README)', 'git remote add origin https://github.com/<you>/<repo>.git', 'git push -u origin main'],
    check: (dir) => {
      try {
        const url = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
        return ok(`origin is ${url}`);
      } catch {
        return no('No git remote called origin yet.');
      }
    },
  },
  {
    id: 'tests',
    title: 'Typecheck and tests pass',
    why: 'The typecheck enforces the rule that the dashboard sees everything; the tests hold the access rules.',
    do: ['npm run typecheck', 'npm test   (unit tests; backend tests need the local Supabase stack: see AGENTS.md)'],
    check: (dir) => {
      const r = spawnSync('npx', ['tsc', '--noEmit'], { cwd: dir, encoding: 'utf8', timeout: 240_000 });
      return r.status === 0 ? ok('Typecheck passes.') : no(`Typecheck fails:\n${(r.stdout + r.stderr).split('\n').slice(0, 10).join('\n')}`);
    },
  },
  {
    id: 'supabase',
    title: 'Create the Supabase project (database and login)',
    why: 'Real accounts and data, shared between the web and the apps.',
    manual: true,
    do: [
      'supabase.com → New project. Pick a region near your users and save the database password.',
      'Connect → copy the Session pooler string (port 5432). Not the direct connection (IPv6-only), not port 6543.',
      'Project Settings → API Keys → copy the publishable key.',
      'Authentication → URL Configuration: Site URL = https://<your domain>; add https://<your domain>/** to Redirect URLs.',
      'Before many people sign up: Authentication → Emails → set up custom SMTP.',
      'Then: fohm-scaffold done supabase --value <project ref>',
    ],
  },
  {
    id: 'vercel',
    title: 'Deploy on Vercel (web app, landing page, dashboard and API)',
    why: 'Every push to main deploys: migrations first, then the site and /api.',
    manual: true,
    do: [
      'vercel.com → Add New → Project → import the GitHub repository (vercel.json already says how to build)',
      'Settings → Environment Variables (Production): SUPABASE_DB_URL (Sensitive, the pooler string), SUPABASE_PUBLISHABLE_KEY, OWNER_CODE (Sensitive, a code only you know)',
      'Deploy, then Settings → Domains → add your domain',
      'Then: fohm-scaffold done vercel --value https://<your domain>',
    ],
  },
  {
    id: 'live',
    title: 'The live site is healthy',
    why: 'Proves the database, migrations and login are wired up in production.',
    do: ['fohm-scaffold check live'],
    check: async (dir, state) => {
      const url = state.values.vercel;
      if (!url) return no('Do the vercel step first (fohm-scaffold done vercel --value https://...).');
      try {
        const h = await (await fetch(`${url.replace(/\/$/, '')}/api/health`, { signal: AbortSignal.timeout(15_000) })).json();
        if (h.db !== 'ok') return no(`${url}/api/health says db is "${h.db}". Check SUPABASE_DB_URL in Vercel and redeploy.`);
        if (!h.auth) return no('No login settings: add SUPABASE_PUBLISHABLE_KEY in Vercel and redeploy.');
        return ok(`Live: database ok, migration ${h.migration}, commit ${h.commit ?? 'unknown'}.`);
      } catch (e) {
        return no(`Couldn't reach ${url}/api/health: ${e.message}`);
      }
    },
  },
  {
    id: 'owner',
    title: 'Make your own owner account',
    why: 'The dashboard is how you see everything people do.',
    manual: true,
    do: ['On the live site: Get started, tick "I run ...", enter your OWNER_CODE', 'Open /admin', 'Then: fohm-scaffold done owner'],
  },
  {
    id: 'smoke',
    title: 'Check production after every deploy',
    why: 'The Smoke workflow tests the live site each time main deploys, so a broken release is caught in minutes.',
    manual: true,
    do: ['GitHub → the repository → Settings → Secrets and variables → Actions → Variables → New: SMOKE_URL = https://<your domain>', 'Then: fohm-scaffold done smoke'],
  },
  {
    id: 'stripe',
    title: 'Payments for Pro (Stripe)',
    why: 'Members buy Pro on the web; the plan switches on and off from Stripe’s own record, and you can also give it from the dashboard.',
    optional: true,
    do: [
      'stripe.com → Developers → API keys: copy the secret key into Vercel as STRIPE_SECRET_KEY (Sensitive)',
      'Price: set PRO_PRICE_CENTS (default 1000) and STRIPE_CURRENCY (default usd), or STRIPE_PRICE_ID for a price you made in Stripe',
      'Developers → Webhooks → Add endpoint: https://<domain>/api/stripe-webhook with checkout.session.completed, customer.subscription.created, .updated, .deleted; put its signing secret in STRIPE_WEBHOOK_SECRET',
      'Settings → Billing → Customer portal: switch it on, so members can cancel',
      'Redeploy, then: fohm-scaffold check stripe   (test with Stripe’s test keys first, then swap in live ones)',
      'In the iOS and Android apps the Pro page points to the website: the app stores require their own in-app purchase for digital subscriptions sold inside an app',
    ],
    check: integrationOn('billing', 'Stripe', 'STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET'),
  },
  {
    id: 'posthog',
    title: 'Product analytics (PostHog)',
    why: 'See which screens and features people use, from the web and the apps, without sending what they write.',
    optional: true,
    do: ['posthog.com → new project → copy the Project API key', 'In Vercel: POSTHOG_KEY, and POSTHOG_HOST=https://eu.i.posthog.com if your project is in the EU', 'Redeploy, then: fohm-scaffold check posthog', 'Events sent: $pageview, signed_up, entry_created, game_finished, ai_question, checkout_started, pro_started, pro_ended. Add your own with track() from src/lib/analytics.ts'],
    check: integrationOn('posthog', 'PostHog', 'POSTHOG_KEY'),
  },
  {
    id: 'sentry',
    title: 'Error reports (Sentry)',
    why: 'Know when something breaks for someone, on the web, in the apps or on the server, before they tell you.',
    optional: true,
    do: ['sentry.io → new project (platform: React Native) → copy the DSN', 'In Vercel: SENTRY_DSN', 'Redeploy, then: fohm-scaffold check sentry', 'Later, for native crash symbolication and source maps, add @sentry/react-native (see its Expo guide)'],
    check: integrationOn('sentry', 'Sentry', 'SENTRY_DSN'),
  },
  {
    id: 'email',
    title: 'Email (Resend)',
    why: 'Owners hear when someone writes; members hear when they get a reply.',
    optional: true,
    do: ['resend.com → Domains → add and verify your domain (DNS records)', 'API Keys → create one; in Vercel: RESEND_API_KEY (Sensitive) and EMAIL_FROM="<App> <hello@your.domain>"', 'Optional: Supabase → Authentication → Emails → SMTP, with Resend’s SMTP settings, so sign-up emails come from your domain too', 'Redeploy, then: fohm-scaffold check email'],
    check: integrationOn('email', 'Email', 'RESEND_API_KEY and EMAIL_FROM'),
  },
  {
    id: 'ai',
    title: 'AI assistant (Claude)',
    why: 'Pro members ask questions any time; you see every question and answer on the dashboard.',
    optional: true,
    do: ['platform.claude.com → API keys → create one; in Vercel: ANTHROPIC_API_KEY (Sensitive)', 'Optional: AI_DAILY_LIMIT (default 30 a member a day), AI_SYSTEM_PROMPT to give it your product’s voice and knowledge', 'Redeploy, then: fohm-scaffold check ai'],
    check: integrationOn('ai', 'The AI assistant', 'ANTHROPIC_API_KEY'),
  },
  {
    id: 'google',
    title: 'Continue with Google',
    why: 'One tap to sign up on the web.',
    optional: true,
    do: [
      'Google Cloud Console → Google Auth Platform: Branding (name, support email, home page, privacy https://<domain>/privacy, terms https://<domain>/terms, authorised domains <domain> and supabase.co); Audience: External; Data access: openid, email, profile only',
      'Clients → Create client → Web application: JavaScript origin https://<domain>; redirect URI https://<project ref>.supabase.co/auth/v1/callback',
      'Audience → Publish app',
      'Supabase → Authentication → Sign In / Providers → Google: on, paste the client ID and secret',
      'Then: fohm-scaffold check google   (the button shows on the web sign-in page; the apps use email for now)',
    ],
    check: integrationOn('google', 'Google sign-in', 'the Google provider in Supabase'),
  },
  {
    id: 'push',
    title: 'Push notifications (iOS and Android)',
    why: 'Replies and new messages reach people’s phones.',
    optional: true,
    manual: true,
    do: [
      'npx eas-cli init (writes the project id the app needs into app.json)',
      'Android: create a Firebase project, add the Android app with your package id, download google-services.json into the app folder, set "android.googleServicesFile" in app.json, and upload the FCM V1 service account key in expo.dev → project → Credentials',
      'iOS: EAS sets up the push key when you build (answer yes to push notifications)',
      'Build, sign in on a real phone, allow notifications; reply from the dashboard and the phone should buzz',
      'Then: fohm-scaffold done push',
    ],
  },
  {
    id: 'mobile-config',
    title: 'Point the iOS and Android apps at the live API',
    why: 'The apps have no website of their own; they call the API at expo.extra.apiUrl.',
    do: ['In app.json: extra.apiUrl = your live https URL; ios.bundleIdentifier and android.package = your own id (not com.example...)'],
    check: (dir, state) => {
      const e = JSON.parse(read(dir, 'app.json') || '{}').expo ?? {};
      if (/^com\.example\./.test(e.ios?.bundleIdentifier ?? '')) return no('ios.bundleIdentifier is still com.example...; the stores need your own.');
      const api = e.extra?.apiUrl ?? '';
      if (!/^https:\/\//.test(api)) return no('extra.apiUrl must be an https URL.');
      if (state.values.vercel && api.replace(/\/$/, '') !== state.values.vercel.replace(/\/$/, '')) return no(`extra.apiUrl is ${api}, but the live site is ${state.values.vercel}.`);
      return ok(`The apps call ${api}.`);
    },
  },
  {
    id: 'mobile-build',
    title: 'Build the iOS and Android apps',
    why: 'EAS builds them in the cloud: no Xcode or Android Studio needed.',
    manual: true,
    do: [
      'Create an Expo account at expo.dev',
      'npx eas-cli login',
      'npx eas-cli init   (links the project; writes its id into app.json)',
      'npm run build:android   (an .apk you can install from the link: the "preview" profile)',
      'npm run build:ios   (needs an Apple Developer account, $99 a year; EAS creates the certificates)',
      'Then: fohm-scaffold done mobile-build',
    ],
  },
  {
    id: 'stores',
    title: 'Submit to the App Store and Google Play',
    why: 'People can then install it like any other app.',
    manual: true,
    do: [
      'App Store Connect: create the app with your bundle id; add screenshots, the privacy policy URL (https://<domain>/privacy) and a review account (a member login)',
      'Google Play Console ($25 once): create the app; fill in Data safety from src/lib/legal.ts',
      'npm run submit:ios  and  npm run submit:android',
      'Then: fohm-scaffold done stores',
    ],
  },
  {
    id: 'legal',
    title: 'Privacy policy and terms checked',
    why: 'The stores require a privacy policy, and people deserve to know what is kept.',
    manual: true,
    do: ['Read src/lib/legal.ts and have it checked for where you operate (it is a starting point, not legal advice)', 'Then: fohm-scaffold done legal'],
  },
];

export const stepById = (id) => STEPS.find((s) => s.id === id);

/** Every step with whether it's done. */
export function status(state) {
  return STEPS.map((s, i) => ({
    n: i + 1,
    id: s.id,
    title: s.title,
    done: !!state.steps[s.id]?.done,
    skipped: !!state.steps[s.id]?.skipped,
    optional: !!s.optional,
    how: s.manual ? 'manual' : 'checked',
    value: state.values[s.id],
  }));
}

/** The next step: the first one neither done nor skipped. */
export const nextStep = (state) => STEPS.find((s) => !state.steps[s.id]?.done && !state.steps[s.id]?.skipped);

/** Runs a step's check; a pass marks it done. Manual steps report how to mark them. */
export async function runCheck(dir, state, id) {
  const s = stepById(id);
  if (!s) throw new Error(`No step "${id}". Steps: ${STEPS.map((x) => x.id).join(', ')}`);
  if (!s.check || s.manual) return { id, ok: !!state.steps[id]?.done, detail: state.steps[id]?.done ? 'Marked done.' : `This one is done by hand. When it is: fohm-scaffold done ${id}` };
  const r = await s.check(path.resolve(dir), state);
  if (r.ok) state.steps[id] = { done: true, at: new Date().toISOString() };
  else if (state.steps[id]?.done && id !== 'create') state.steps[id] = { done: false };
  return { id, ...r };
}
