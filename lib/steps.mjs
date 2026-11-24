/**
 * Every step from a new folder to an app live on the web and in the app
 * stores. Each says why it matters and what to do; `check` proves it where a
 * machine can (and marks it done), otherwise the person marks it done.
 *
 * `you` marks what an agent can't do for the person: their accounts,
 * payments, the business's identity and keys (`true`), or just the lines
 * that need them (a list). Those are the manual-work page (lib/manual.mjs).
 * `early` steps take days, or can't wait, so the page lists them first;
 * `takes` says how long. A step's `do` can depend on the answers (the
 * country), and `<domain>`, `<project ref>`, `<support email>` and `<App>`
 * are filled in once they're known.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { dmarcPolicy, mxHosts, pointsSomewhere } from './dns.mjs';
import { COUNTRY_NAMES } from './options.mjs';
import { referenceCount } from './references.mjs';

const read = (dir, f) => (fs.existsSync(path.join(dir, f)) ? fs.readFileSync(path.join(dir, f), 'utf8') : '');
const ok = (detail) => ({ ok: true, detail });

/**
 * Why a fetch failed, in words. A name this machine couldn't look up is asked
 * of DNS over HTTPS first: only a domain that really points nowhere is told
 * how to point it; a network that can't look anything up says so.
 */
async function unreachable(url, e) {
  const { host } = new URL(url);
  if ((e.cause?.code ?? e.code) !== 'ENOTFOUND') return `Couldn't reach ${url}/api/health: ${e.message}`;
  const points = await pointsSomewhere(host).catch(() => null);
  if (points === false) return `${host} doesn't point anywhere yet. In Vercel → Settings → Domains, add it, then add the DNS records Vercel shows at the registrar (they can take an hour to spread).`;
  if (points === true) return `${host} is set up, but this machine couldn't look it up: its network may be blocking it (a sandbox, VPN or firewall). Run the check from another machine.`;
  return `Couldn't reach ${url}/api/health: this machine couldn't look up ${host}, and the DNS lookup over HTTPS failed too. Is it online?`;
}

/** Reads the live site's /api/health, for the checks that need production. */
async function liveHealth(state) {
  const url = state.values.vercel;
  if (!url) return { error: 'Do the vercel step first (fohm-scaffold done vercel --value https://...).' };
  try {
    return { url, health: await (await fetch(`${url.replace(/\/$/, '')}/api/health`, { signal: AbortSignal.timeout(15_000) })).json() };
  } catch (e) {
    return { error: await unreachable(url, e) };
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

/** Registering the business, where the steps know the country. Checked Nov 2026; registries change their fees, not their shape. */
const REGISTER_IN = {
  AU: [
    'An ABN: free and online, often issued straight away: https://www.abr.gov.au → Apply for an ABN. A company registers with ASIC first and gets an ACN',
    'Trading under a name that isn’t the owner’s own? Register it as a business name with ASIC: https://www.asic.gov.au',
    'GST: register once turnover reaches A$75,000 a year (sooner if you choose)',
  ],
  GB: [
    'Sole trader: register for Self Assessment with HMRC (https://www.gov.uk/set-up-sole-trader) by 5 October after the tax year you start trading',
    'Company: register it at Companies House (https://www.gov.uk/limited-company-formation), usually within a day. The website must show its registered name, number and office address: put them in registration, and the terms show them',
    'VAT: register once taxable turnover passes £90,000 in 12 months',
  ],
  US: [
    'Sole proprietor: nothing to file federally; a DBA ("doing business as") with the county or state to trade under another name',
    'LLC: file with the state’s Secretary of State (fees and timings vary by state)',
    'An EIN: free from the IRS and issued online straight away (https://www.irs.gov → Apply for an EIN online). Stripe and the bank ask for it',
    'Sales tax on digital subscriptions depends on the state: Stripe Tax tracks where you owe it',
  ],
};
const registerAnywhere = (country) => [
  `Register it with ${country ? `${country}’s` : 'the country’s'} business registry and tax office, and keep its registration number (your agent can look up the exact steps for the country)`,
  'Ask an accountant when to register for sales tax (VAT or GST) on what you sell',
];

/** Where to check a name isn't someone else's trade mark. */
const TRADE_MARKS = {
  AU: 'IP Australia, https://www.ipaustralia.gov.au',
  GB: 'the UK IPO, https://www.gov.uk/search-for-trademark',
  US: 'the USPTO, https://www.uspto.gov/trademarks/search',
};

/** The person's part of the tapp step: their Tapp account, its tokens, and the store disclosures. */
const TAPP_YOURS = [
      'Make an account at tapp.so and add the app: bundle id (app.json → ios.bundleIdentifier), App Store ID and Team ID (App Store Connect), URL scheme (app.json → scheme), the Play package and its app signing SHA-256 (Play Console → Test and release → App integrity)',
      'Copy the auth token and Tapp token into Vercel as TAPP_AUTH_TOKEN and TAPP_TOKEN, and the app’s link domain (Tapp shows it, e.g. yourapp.tapp.so) into EAS → Environment variables (production) as TAPP_LINK_DOMAIN',
      'App Store Connect → App Privacy and Play Console → Data safety: add device identifiers and attribution, used for analytics and not for ads (Tapp matches an install to a click)',
];

const RAW_STEPS = [
  {
    id: 'research',
    title: 'Research the market',
    why: 'It decides what the skeleton is and isn’t: the crowded categories next door, the incumbent to study, and who to sell to first.',
    do: [
      'Ask your agent (with web search): "Research the market for this app (PRODUCT.md’s thesis) and fill in docs/RESEARCH.md. Cite sources; don’t invent numbers."',
      'Answer its open questions with the owner (audience size, revenue, time, ambition, budget, content rights)',
      'Delete the template line at the top of docs/RESEARCH.md',
    ],
    you: ['Answer the research’s open questions with the owner: audience size, revenue, their time, ambition, budget and content rights'],
    check: (dir) => (/fohm:template-research/.test(read(dir, 'docs/RESEARCH.md')) ? no('docs/RESEARCH.md is still the template. Fill it in, then delete its first comment line.') : ok('Research written.')),
  },
  {
    id: 'inspiration',
    title: 'Design references from Mobbin',
    why: 'Design from the apps the owner already likes, not from a template: the generic first look is the one that gets rejected.',
    do: [
      'Ask the owner which apps they like the look and feel of (and which they don’t)',
      'Ask the owner the three questions that decide the look, with the references open: the type (a heavy grotesque, a friendly rounded face, a serif?), the navigation (a tab bar, or one hub screen with everything off it?), and the colour (white and black with one accent, or their own colours?)',
      'With Mobbin’s MCP tools, your agent can do it: "For each app the owner likes, find its onboarding, home, progress and paywall screens on Mobbin, then add the best with fohm-scaffold references (or the scaffold_add_references tool), saying what to take from each."',
      'Without an agent: browse mobbin.com, then: fohm-scaffold references --app Speak --screen Onboarding --url https://mobbin.com/screens/... --take "one question per screen, big tappable answers"',
      'For each reference, note concretely what to take, not just the app’s name: the type (face, weight, size of titles), the navigation (tab bar, hub, back), the colour (ground, ink, the one accent and what it marks) and the components (cards, photo cards, buttons, lists, stat tiles)',
      'At least three references, then: fohm-scaffold check inspiration',
    ],
    check: (dir) => {
      const n = referenceCount(dir);
      return n >= 3 ? ok(`${n} Mobbin references in DESIGN.md.`) : no(`${n} Mobbin reference${n === 1 ? '' : 's'} in DESIGN.md; add at least three.`);
    },
  },
  {
    id: 'design',
    title: 'Adopt the references: a direction contract',
    after: ['inspiration'],
    why: 'References that are only listed get ignored: the first build of an app made here had “none of the UI/UX of the Mobbin references”, and “the typography looks terrible”. The fix was a written direction that follows the references screen by screen, then building in it.',
    do: [
      'Before building screens, run /impeccable (shape for a new app, critique for screens that exist) against the references in DESIGN.md and the owner’s three answers (type, navigation, colour)',
      'Write the direction contract to .impeccable/surfaces/<screen>.md: a "## Direction contract" with THESIS (the look in a line, naming the references it follows and what it refuses), OWN-WORLD (ground, ink, the faces and weights, buttons, cards, photos, the accent and what it marks), STORY (each screen and which reference it follows, with what it takes from it) and FIRST VIEWPORT (Home at 393 wide, top to bottom)',
      'Build in that system: fonts and tokens in src/lib/fonts.ts and src/lib/theme.ts, the kit in src/components/; record it in DESIGN.md',
      'Before any preview goes to the owner, have a fresh reviewer (a new agent, not the one that built it) put the screens at 393×852 beside the references and say where they differ; fix what it finds',
      'Then: fohm-scaffold check design',
    ],
    check: (dir, state) => {
      const folder = path.join(dir, '.impeccable', 'surfaces');
      const briefs = fs.existsSync(folder) ? fs.readdirSync(folder).filter((f) => f.endsWith('.md')).map((f) => read(folder, f)) : [];
      if (!briefs.length) return no('No surface brief in .impeccable/surfaces/ yet. Run /impeccable shape against the references and write the direction contract there.');
      const missing = (b) => ['## Direction contract', 'THESIS:', 'OWN-WORLD:', 'STORY:', 'FIRST VIEWPORT:'].filter((block) => !b.includes(block));
      const brief = briefs.find((b) => !missing(b).length);
      if (!brief) return no(`The surface brief needs its contract blocks: ${missing(briefs[0]).join(', ')}.`);
      const apps = [...new Set((state?.values?.references ?? []).map((r) => String(r.app ?? '').trim()).filter(Boolean))];
      if (apps.length && !apps.some((a) => brief.toLowerCase().includes(a.toLowerCase()))) return no(`The direction contract doesn’t name a reference it follows (${apps.join(', ')}). Say which reference each screen follows and what it takes.`);
      return ok('The direction contract follows the references.');
    },
  },
  {
    id: 'progression',
    title: 'Put the coach’s method into the app',
    why: 'The app productises what the business already sells: their levels, skills, drills and content, in their words.',
    kinds: ['coaching'],
    you: ['Gather the coach’s method for your agent: their levels, the skills and drills at each, the questions that place someone, and links to the videos and posts they already publish'],
    do: [
      'With the owner, write their levels, skills, drills, the assessment questions and the library into src/lib/progression.ts (ask your agent to turn their notes, videos and course outlines into it)',
      'Library links can point at what they already publish (YouTube, Instagram)',
      'Delete the "fohm:template-content" line, run npm test, then: fohm-scaffold check progression',
    ],
    check: (dir) => (/fohm:template-content/.test(read(dir, 'src/lib/progression.ts')) ? no('src/lib/progression.ts is still the template content.') : ok('The progression is the coach’s own.')),
  },
  {
    id: 'review',
    title: 'Review: code and design',
    why: 'Every feature in Aluzam got a fresh code review and a design review, and acting on them caught real bugs and the generic look.',
    manual: true,
    do: [
      'In Claude Code: /code-review high, then fix what it finds',
      'A design review of every screen at phone size (393×852) and laptop width against DESIGN.md and its references; act on the verdict',
      'Repeat after each big feature. Then: fohm-scaffold done review',
    ],
  },
  {
    id: 'proposal',
    title: 'Write the proposal',
    why: 'The basis for the conversation with the owner: thesis, skeleton, roadmap, open questions, and how you work together.',
    do: ['Ask your agent: "Write docs/PROPOSAL.md from PRODUCT.md and docs/RESEARCH.md"', 'Settle IP, time, handover and (if shared) the revenue definition', 'Delete the template line at the top, then: fohm-scaffold check proposal'],
    you: ['Settle with the owner how you work together: IP, your time, the handover and (if revenue is shared) how it’s defined'],
    check: (dir) => (/fohm:template-proposal/.test(read(dir, 'docs/PROPOSAL.md')) ? no('docs/PROPOSAL.md is still the template.') : ok('Proposal written.')),
  },
  {
    id: 'deck',
    title: 'Pitch deck',
    why: 'One deck to walk the owner through it, in their brand.',
    manual: true,
    do: ['In Claude: "Make a pitch deck from docs/PROPOSAL.md, in the brand from DESIGN.md, with screenshots of the app"', 'Then: fohm-scaffold done deck --value <link to the deck>'],
  },
  {
    id: 'handover',
    title: 'Hand it over',
    why: 'The owner builds on it with Claude Code; the handover is what makes that work without you being their engineer.',
    manual: true,
    you: true,
    do: [
      'Walk the owner through docs/HANDOVER.md: how to ask Claude Code for changes, what’s safe to change, what to ask about',
      'Record a short walkthrough and link it at the end of docs/HANDOVER.md',
      'Check the owner holds the accounts in their own name (the domain, Stripe, the Apple and Google developer accounts), and give them access to the GitHub repository, Vercel, Supabase and Expo',
      'Then: fohm-scaffold done handover',
    ],
  },

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
    id: 'domain',
    title: 'Own the domain',
    why: 'The landing page, the web app, sign-in links and email all live on it, and the stores link to its privacy policy. Names go quickly: buy it before announcing the name.',
    manual: true,
    you: true,
    early: true,
    takes: 'minutes, but names go quickly',
    do: (c) => [
      'Already own it, or it will live on the business’s own site (app.their-domain.com)? Then: fohm-scaffold done domain --value <domain>',
      'No domain yet? Check some names: fohm-scaffold names <ideas> (your agent can suggest them)',
      'Buy <domain> from a registrar: Vercel (Domains → Buy, which sets up the DNS for you), Cloudflare, Namecheap, Porkbun or Squarespace',
      'Buy it in the business’s name, on an account the owner controls (not yours), so it stays theirs; turn on auto-renew and WHOIS privacy',
      ...(c.country === 'AU' ? ['A .com.au or .au needs the business’s ABN or ACN, in a name that matches it: register the business first (the business step)'] : []),
      `Before announcing the name, search the trade mark register for apps or coaching already using it: ${TRADE_MARKS[c.country] ?? 'WIPO’s Global Brand Database, https://branddb.wipo.int'}`,
      'Then: fohm-scaffold done domain --value <domain>',
    ],
  },
  {
    id: 'business',
    title: 'Register the business (if it isn’t already)',
    why: 'Before you take money or publish to the stores, someone has to be the seller: the name on the privacy policy and terms, the Stripe account and the bank account the money lands in, and the seller on the App Store and Google Play. A starting point, not legal or tax advice.',
    manual: true,
    optional: true,
    you: true,
    early: true,
    takes: 'a day to a few weeks, by country',
    do: (c) => [
      'Already registered? Its legal name and number go in operator and registration in src/lib/brand.ts, where the privacy policy and terms show them (your agent can put them there); then: fohm-scaffold done business --value "<legal name and number>"',
      'Not yet: choose how it’s run. A sole trader is the owner in person: the least admin, and their own name shows in the app stores. A company is a separate legal entity: more admin, and its name shows in the stores (it enrols there as an organisation). An accountant can say which suits.',
      ...(REGISTER_IN[c.country] ?? registerAnywhere(c.country)),
      'Selling to people abroad can mean tax there too (the EU charges VAT on digital services from the first sale): Stripe Tax works out what to charge on web sales, and the App Store and Google Play handle it for in-app purchases',
      'Open a business bank account: Stripe, Apple and Google pay into it',
      'Once it’s registered, its legal name and number go in src/lib/brand.ts (your agent can do it); then: fohm-scaffold done business --value "<legal name and number>"',
      'A free app run in your own name may need none of this: fohm-scaffold skip business',
      ...(c.brandWithoutRegistration ? ['This app was made before brand.ts had a registration: your agent can add one and show it beside the operator in src/lib/legal.ts, as the template now does'] : []),
    ],
  },
  {
    id: 'brand',
    title: 'Words and brand',
    why: 'The landing page, sign-in, legal pages and app name all read from one file.',
    you: ['Send your agent the owner’s logo and artwork, the largest files they have (they go in assets/brand/)'],
    do: [
      'Put the owner’s own logo and artwork in assets/brand/ (the largest files they have)',
      'Ask your agent: "Trace the logo in assets/brand into an SVG component (never redraw it by hand), take the colours into src/lib/theme.ts, and write DESIGN.md’s north star from the owner’s artwork and the references"',
      'Edit src/lib/brand.ts: tagline and the three landing page features, in the owner’s voice',
      'App icon and splash from the logo: add icon.png (1024x1024) and set "icon" in app.json',
    ],
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
    do: [
      'fohm-scaffold github   (creates a private repository with the GitHub CLI and pushes; --owner <org> for an organisation, --public to make it public)',
      'Or by hand: create an empty repository on github.com (no README), then git remote add origin https://github.com/<you>/<repo>.git and git push -u origin main',
    ],
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
    you: [
      'Supabase → the project → Database → Settings → Reset database password (it’s never shown to your agent); then Connect → copy the Session pooler string (port 5432) with that password into Vercel as SUPABASE_DB_URL (Sensitive)',
      'Authentication → URL Configuration: Site URL and Redirect URLs (below)',
    ],
    do: [
      'With Claude’s Supabase connector, your agent does the rest: creates the project in your organisation (a region near your users), reads its URL and publishable key, and puts them in Vercel as SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY. Without it: supabase.com → New project, and save the database password.',
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
    you: [
      'Settings → Environment Variables: SUPABASE_DB_URL (from the supabase step) and OWNER_CODE (Sensitive, a code only you know; COACH_CODE too if other coaches will join). Secrets never go through the chat',
      'The domain, once you have one (below)',
    ],
    do: [
      'With Claude’s Vercel connector, your agent creates the project from the GitHub repository (root directory set when the app lives in a folder of a bigger repository) and adds every public variable: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, POSTHOG_KEY, POSTHOG_HOST, SENTRY_DSN. Without it: vercel.com → Add New → Project → import the GitHub repository (vercel.json already says how to build)',
      'Settings → Environment Variables (Production): SUPABASE_DB_URL (Sensitive, the pooler string), SUPABASE_PUBLISHABLE_KEY, OWNER_CODE (Sensitive, a code only you know), and COACH_CODE (Sensitive) if other coaches will join',
      'Deploy, then Settings → Domains → add <domain>; for a bare domain (example.com, not app.example.com), add its www. too, redirecting to it',
      'At the registrar, add the DNS records Vercel shows (bought through Vercel, it’s done for you); they can take an hour to spread',
      'Then: fohm-scaffold done vercel --value https://<your domain>',
    ],
  },
  {
    id: 'live',
    title: 'The live site is healthy',
    after: ['vercel'],
    why: 'Proves the database, migrations and login are wired up in production.',
    do: ['fohm-scaffold check live'],
    check: async (_dir, state) => {
      const { url, health: h, error } = await liveHealth(state);
      if (error) return no(error);
      if (h.db !== 'ok') return no(`${url}/api/health says db is "${h.db}". Check SUPABASE_DB_URL in Vercel and redeploy.`);
      if (!h.auth) return no('No login settings: add SUPABASE_PUBLISHABLE_KEY in Vercel and redeploy.');
      return ok(`Live: database ok, migration ${h.migration}, commit ${h.commit ?? 'unknown'}.`);
    },
  },
  {
    id: 'inbox',
    title: 'An inbox for the support address',
    why: 'The support address is on the landing page, the privacy policy and the store listings, and members, Apple and Google write to it: mail to it has to reach someone.',
    you: true,
    do: [
      'The support address is <support email> (supportEmail in src/lib/brand.ts)',
      'Forward it to an inbox someone reads: registrars forward mail for free (Cloudflare Email Routing, Namecheap, Porkbun, Squarespace), or give it a mailbox (Google Workspace, Microsoft 365, Fastmail)',
      'Send it a test email from another account and check it arrives',
      'Then: fohm-scaffold check inbox',
    ],
    check: async (dir) => {
      const email = /supportEmail: '([^']*)'/.exec(read(dir, 'src/lib/brand.ts'))?.[1] ?? '';
      const domain = email.split('@')[1] ?? '';
      if (!domain || domain === 'example.com') return no('Set supportEmail in src/lib/brand.ts to the address people should write to.');
      try {
        const { exists, hosts } = await mxHosts(domain);
        if (!exists) return no(`${domain} doesn't exist yet, so mail to ${email} bounces: buy the domain, or correct supportEmail in src/lib/brand.ts.`);
        return hosts.length ? ok(`Mail for ${email} goes to ${hosts[0]}.`) : no(`${domain} takes no mail yet (no MX records), so mail to ${email} bounces. Set up forwarding or a mailbox, then check again.`);
      } catch (e) {
        return no(`Couldn't look up where mail for ${domain} goes: ${e.message}`);
      }
    },
  },
  {
    id: 'owner',
    title: 'Make your own owner account',
    why: 'The dashboard is how you see everything people do.',
    manual: true,
    you: true,
    do: [
      'On the live site: Get started, choose "I run ...", enter your OWNER_CODE',
      'Open /admin',
      'Other coaches? Give them COACH_CODE: they sign up as "A coach here", and you assign members to them from each member’s page (each coach sees only their own)',
      'The dashboard’s People shows when each person was last in the app and on what (the web, iPhone or Android, and the app’s version); Settings shows which integrations are on',
      'Then: fohm-scaffold done owner',
    ],
  },
  {
    id: 'smoke',
    after: ['vercel'],
    title: 'Check production after every deploy',
    why: 'The Smoke workflow tests the live site each time main deploys, so a broken release is caught in minutes.',
    manual: true,
    do: [
      'GitHub → the repository → Settings → Secrets and variables → Actions → Variables → New: SMOKE_URL = https://<your domain>',
      'Or with the GitHub CLI: gh variable set SMOKE_URL --body https://<your domain>',
      'Then: fohm-scaffold done smoke',
    ],
  },
  {
    id: 'stripe',
    title: 'Payments for Pro (Stripe)',
    why: 'Members buy Pro on the web; the plan switches on and off from Stripe’s own record, and you can also give it from the dashboard.',
    optional: true,
    you: true,
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
    you: ['Nothing when your agent has Claude’s PostHog connector; without it, make the project and copy its key (below)'],
    do: ['With Claude’s PostHog connector, your agent does this: an organisation of the app’s own (one per app keeps billing and data apart), its project’s API key (public by design) into Vercel as POSTHOG_KEY, and POSTHOG_HOST from the project’s region. Without it: posthog.com → new project → copy the Project API key; in Vercel: POSTHOG_KEY, and POSTHOG_HOST=https://eu.i.posthog.com if your project is in the EU', 'Redeploy, then: fohm-scaffold check posthog', 'Events sent: $pageview, signed_up, entry_created, game_finished, ai_question, checkout_started, pro_started, pro_ended. Add your own with track() from src/lib/analytics.ts'],
    check: integrationOn('posthog', 'PostHog', 'POSTHOG_KEY'),
  },
  {
    id: 'sentry',
    title: 'Error reports (Sentry)',
    why: 'Know when something breaks for someone, on the web, in the apps or on the server, before they tell you.',
    optional: true,
    you: ['Only if your agent’s create is refused (“disabled this feature for members”): Sentry → Settings → your organisation → General Settings → Let Members Create Projects on, or create the project yourself'],
    do: ['With Claude’s Sentry connector, your agent does this: a team of the app’s own, a project on it (platform React Native), and its DSN (public by design) into Vercel as SENTRY_DSN. Without it: sentry.io → new project (platform: React Native) → copy the DSN; in Vercel: SENTRY_DSN', 'Redeploy, then: fohm-scaffold check sentry', 'Later, for native crash symbolication and source maps, add @sentry/react-native (see its Expo guide)'],
    check: integrationOn('sentry', 'Sentry', 'SENTRY_DSN'),
  },
  {
    id: 'email',
    title: 'Email (Resend)',
    why: 'New members get a welcome, owners hear when someone writes, members hear when they get a reply, and sign-up and password emails come from your own domain instead of Supabase’s, which sends only a few an hour.',
    optional: true,
    you: true,
    do: [
      'resend.com → Domains → Add domain: <domain>. At the registrar, add the records Resend shows: the DKIM TXT record (resend._domainkey), and the MX and SPF TXT records on its send subdomain. Resend verifies the domain once they’re in (minutes to an hour)',
      'Add a DMARC record too, so Gmail and Yahoo deliver it: TXT at _dmarc.<domain> with v=DMARC1; p=none; rua=mailto:<support email> (tighten to p=quarantine once mail has gone out cleanly for a few weeks). Keep one SPF record per name: if the domain already has one (a mailbox provider’s), merge them',
      'API Keys → create one (Sending access); in Vercel: RESEND_API_KEY (Sensitive) and EMAIL_FROM, the sender: "<App> <<support email>>"',
      'Sign-up and password emails: Supabase → Authentication → Emails → SMTP Settings → on, host smtp.resend.com, port 465, username resend, password: a Resend API key, sender <support email>, sender name <App>. Then Rate Limits: raise the emails an hour (Supabase’s own mail allows only a few)',
      'Supabase → Authentication → Emails → Templates: for Confirm sign up, Reset password, Magic link, Change email address and Invite user, paste the matching file from supabase/templates/ (confirmation, recovery, magic_link, email_change, invite), with subjects like "Confirm your <App> account" and "Choose a new <App> password"',
      'Supabase → Authentication → URL Configuration: Site URL https://<domain>, so the links in those emails come back to the app',
      'Redeploy, then: fohm-scaffold check email   (it also looks for the DMARC record)',
    ],
    check: async (dir, state) => {
      const on = await integrationOn('email', 'Email', 'RESEND_API_KEY and EMAIL_FROM')(dir, state);
      const domain = context(state, dir).domain;
      if (!on.ok || !domain) return on;
      try {
        const dmarc = await dmarcPolicy(domain);
        return dmarc ? ok(`${on.detail} ${domain} has a DMARC record (${dmarc}).`) : no(`Email is on, but ${domain} has no DMARC record, so Gmail and Yahoo may junk it. Add a TXT record at _dmarc.${domain}: v=DMARC1; p=none`);
      } catch (e) {
        return ok(`${on.detail} (Couldn’t look up its DMARC record: ${e.message}.)`);
      }
    },
  },
  {
    id: 'ai',
    title: 'AI assistant (Claude)',
    why: 'Pro members ask questions any time; you see every question and answer on the dashboard.',
    optional: true,
    you: true,
    do: ['platform.claude.com → API keys → create one; in Vercel: ANTHROPIC_API_KEY (Sensitive)', 'Optional: AI_DAILY_LIMIT (default 30 a member a day), AI_SYSTEM_PROMPT to give it your product’s voice and knowledge', 'Redeploy, then: fohm-scaffold check ai'],
    check: integrationOn('ai', 'The AI assistant', 'ANTHROPIC_API_KEY'),
  },
  {
    id: 'google',
    title: 'Continue with Google',
    why: 'One tap to sign up on the web.',
    optional: true,
    you: true,
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
    id: 'store-accounts',
    title: 'Developer accounts for the App Store and Google Play',
    why: 'The stores publish only from verified developer accounts, and verifying one takes days (a company also needs a D-U-N-S number first, which can take weeks), so start well before the apps are ready.',
    manual: true,
    you: true,
    early: true,
    takes: 'a few days, or up to 30 with a D-U-N-S number',
    do: [
      'Decide whose name the apps are sold under: a registered company (an organisation account; needs a D-U-N-S number) or a person (an individual account: sole traders enrol this way, and their own name shows in the stores)',
      'D-U-N-S number (organisations only): free from Dun & Bradstreet. Look it up or request it through Apple’s tool, https://developer.apple.com/enroll/duns-lookup/ (Apple allows 5 business days, Google up to 30); never pay a third party for one',
      'Apple Developer Program: https://developer.apple.com/programs/enroll/ with the owner’s Apple Account (two-factor on); US$99 a year, or the local price',
      'Google Play Console: https://play.google.com/console/signup with the owner’s Google account; US$25 once, with ID verification. A new personal account must run a closed test with at least 12 testers for 14 days before its first public release: line up the testers now',
      'Use the owner’s accounts, not yours, and add yourself as a team member: the apps stay theirs',
      'Then: fohm-scaffold done store-accounts',
    ],
  },
  {
    id: 'push',
    title: 'Push notifications (iOS and Android)',
    why: 'Replies and new messages reach people’s phones.',
    optional: true,
    you: true,
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
    you: true,
    do: [
      'Create an Expo account at expo.dev',
      'npx eas-cli login',
      'npx eas-cli init   (links the project; writes its id into app.json)',
      'npm run build:android   (an .apk you can install from the link: the "preview" profile)',
      'npm run build:ios   (needs the Apple Developer account from store-accounts; EAS creates the certificates)',
      'Then: fohm-scaffold done mobile-build',
    ],
  },
  {
    id: 'stores',
    title: 'Submit to the App Store and Google Play',
    why: 'People can then install it like any other app.',
    manual: true,
    you: true,
    takes: 'Apple’s review: usually a day or two; Google’s first: up to a week',
    do: [
      'App Store Connect: create the app with your bundle id; add screenshots, the privacy policy URL (https://<domain>/privacy) and a review account (a member login)',
      'Google Play Console: create the app; fill in Data safety from src/lib/legal.ts. A new personal account runs its 14-day closed test first (store-accounts)',
      'npm run submit:ios  and  npm run submit:android',
      'Then: fohm-scaffold done stores',
    ],
  },
  {
    id: 'tapp',
    title: 'Share links that survive the install (Tapp)',
    why: 'An invite link a member sends a friend, and one /go/<channel> link for each place you find people, still say where someone came from after they install the app: the dashboard shows who invited whom and which link each person came through. The App Store tells an app nothing about that on its own.',
    optional: true,
    after: ['stores'],
    you: TAPP_YOURS,
    do: [
      ...TAPP_YOURS,
      'Redeploy; the privacy policy then names Tapp, and Your account shows Invite a friend',
      'Build new store versions (npm run build:ios, npm run build:android) and submit them: the SDK is native code, so only a store build carries it. The first iOS build after TAPP_LINK_DOMAIN adds the Associated Domains capability: let EAS regenerate the provisioning profile',
      'On iPhone, Tapp runs only for people who have allowed tracking: the app never asks. To count iPhone installs from links too, add expo-tracking-transparency and ask in context, with a line in app.json saying why',
      'Post https://<domain>/go/<channel> links (e.g. /go/newsletter, /go/instagram): phones go through Tapp, everyone else to the site with the channel in its utm tags',
      'Then: fohm-scaffold check tapp',
    ],
    check: integrationOn('tapp', 'Tapp', 'TAPP_AUTH_TOKEN and TAPP_TOKEN'),
  },
  {
    id: 'legal',
    title: 'Privacy policy and terms checked',
    why: 'The stores require a privacy policy, and people deserve to know what is kept.',
    manual: true,
    you: true,
    do: ['Read src/lib/legal.ts and have it checked for where you operate (it is a starting point, not legal advice)', 'Then: fohm-scaffold done legal'],
  },
];

/** Each step's phase, in order: discover, design, build, launch, grow, hand over. */
const ORDER = [
  ['Discover', ['create', 'research', 'product', 'domain', 'business']],
  ['Design', ['inspiration', 'design', 'brand']],
  ['Build', ['install', 'progression', 'github', 'tests', 'review']],
  ['Launch', ['supabase', 'vercel', 'live', 'inbox', 'owner', 'smoke', 'legal']],
  ['Grow', ['stripe', 'posthog', 'sentry', 'email', 'ai', 'google', 'store-accounts', 'push', 'mobile-config', 'mobile-build', 'stores', 'tapp']],
  ['Hand over', ['proposal', 'deck', 'handover']],
];
const byId = new Map(RAW_STEPS.map((s) => [s.id, s]));
export const STEPS = ORDER.flatMap(([phase, ids]) => ids.map((id) => ({ ...byId.get(id), phase })));
for (const s of byId.values()) if (!STEPS.some((x) => x.id === s.id)) throw new Error(`step ${s.id} has no phase`);

/** The steps for this app: some are only for one kind (the progression is for coaching apps). */
export const stepsFor = (state) => STEPS.filter((s) => !s.kinds || s.kinds.includes(state.options.kind));

export const stepById = (id) => STEPS.find((s) => s.id === id);

/** Who does a step: the person ('you'), an agent ('agent'), or an agent with something from the person ('both'). */
export const whoDoes = (s) => (s.you === true ? 'you' : s.you ? 'both' : 'agent');

/**
 * What a step's words can depend on: the answers, what's been learned since,
 * and, given the app's folder, what its brand.ts says now (the support address
 * may have changed since the app was made).
 */
export function context(state, dir) {
  const o = state?.options ?? {};
  const v = state?.values ?? {};
  const brand = dir ? read(dir, 'src/lib/brand.ts') : '';
  const email = /supportEmail: '([^']*)'/.exec(brand)?.[1] || o.supportEmail || '';
  return {
    name: o.name ?? '',
    country: o.country ?? '',
    countryName: COUNTRY_NAMES[o.country] ?? o.country ?? '',
    domain: v.domain || o.domain || '',
    supportEmail: email.endsWith('@example.com') ? '' : email,
    projectRef: v.supabase ?? '',
    brandWithoutRegistration: !!brand && !/\bregistration:/.test(brand),
  };
}

const PLACEHOLDERS = [
  [/<your domain>|<domain>/g, (c) => c.domain],
  [/<project ref>/g, (c) => c.projectRef],
  [/<support email>/g, (c) => c.supportEmail],
  [/<App>/g, (c) => c.name],
];
/** A line with what's known written in (as text, never as a replacement pattern); what isn't stays a <placeholder>. */
export const fill = (line, c) => PLACEHOLDERS.reduce((l, [re, value]) => (value(c) ? l.replace(re, () => value(c)) : l), line);

/** A step's instructions for this app (state may be null: the general version; dir adds what its files say). */
export function linesFor(s, state, dir) {
  const c = context(state, dir);
  return (typeof s.do === 'function' ? s.do(c) : s.do).map((l) => fill(l, c));
}

/** The person's part of a step: all of it, the lines only they can do, or nothing. */
export function yourLines(s, state, dir) {
  if (s.you === true) return linesFor(s, state, dir);
  return (s.you ?? []).map((l) => fill(l, context(state, dir)));
}

const isOpen = (state) => (s) => !state.steps[s.id]?.done && !state.steps[s.id]?.skipped;
/** A step that needs another done first (the live checks need the deploy) can't be started before it. */
const canStart = (state) => (s) => (s.after ?? []).every((id) => state.steps[id]?.done);

/** Every step with whether it's done. */
export function status(state) {
  return stepsFor(state).map((s, i) => ({
    n: i + 1,
    id: s.id,
    title: s.title,
    phase: s.phase,
    done: !!state.steps[s.id]?.done,
    skipped: !!state.steps[s.id]?.skipped,
    optional: !!s.optional,
    how: s.manual ? 'manual' : 'checked',
    who: whoDoes(s),
    value: state.values[s.id],
  }));
}

/** The next step: the first one neither done nor skipped. */
export const nextStep = (state) => stepsFor(state).find(isOpen(state));

/** The first open step an agent can get on with while the person works through their own. */
export const nextForAgent = (state) => stepsFor(state).find((s) => isOpen(state)(s) && canStart(state)(s) && whoDoes(s) !== 'you');

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
