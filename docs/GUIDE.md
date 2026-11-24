# Building a new app from scratch

A step-by-step path from an idea to an app live on the web and in the app
stores, using fohm-scaffold. It's the route Aluzam took, minus the detours.
`fohm-scaffold status` tracks the same steps for your app; this guide is the
long version, and covers growing the app afterwards.

You'll need a **domain**, the **business registered** if it takes money or
sells in the stores under its own name, accounts on **GitHub**, **Vercel** and
**Supabase** (free to start), **Expo** (free) for the iOS and Android builds,
an **Apple Developer** account ($99 a year) and a **Google Play** developer
account ($25 once) for the stores, and later **Stripe** if you charge.
Locally: Node 22, and Docker for the full local stack.

`fohm-scaffold manual` lists everything only a person can do (accounts,
payments, the domain, the business, keys), the ones that take days first, and
writes it as a page at `.fohm/manual-work.html`; in Claude it becomes an
Artifact to share with the owner, kept up to date as steps get done.

---

## 1. Write down the product (an hour, before any code)

Fill in `PRODUCT.md`: who the members are, the one job they come to do, who
runs it, and how you'll know it's working. Be concrete. Agents make dozens of
small product decisions per feature, and this file is what they decide from.

Decide the two roles in your app's words. The kit calls them **member** and
**owner** (Aluzam's were student and teacher). Renaming them is optional;
the words on screen matter more than the names in code.

Write down the rule that will keep the product honest. Aluzam's was "the
teacher sees everything students do"; the kit's `AGENTS.md` carries it as
"the owner sees everything members do". Keep it, or replace it with yours.

## 2. Create the app

```bash
npx github:rhoneybul/fohm-scaffold new my-app
```

It follows the strategy in `docs/STRATEGY.md`; this guide is the long version.
Answer the questions: the idea and the business behind it, the name (no name
yet? `fohm-scaffold names <ideas...>` checks domains and GitHub),
**coaching app, plain app or game** (coaching is the default: a level
assessment, a progression path, check-ins, clips for the coach and a library,
written in `src/lib/progression.ts`), the apps they like (for design
references), what you call the people who
use it and the person who runs it, who runs it (for the privacy policy), the
support email, the domain, the iOS/Android id and an accent colour. Only the
name is required. It creates the app with git set up and a first commit.

Then:

```bash
cd my-app
npm install
npm run web        # demo mode in the browser: the landing page, then Get started
npm start          # scan the QR code with Expo Go to try it on your phone
```

Create an account, write something (or play the game), then create another
account ticking "I run ..." with the code `change-me`, and see it all on the
dashboard.

### The domain and the business (start these early)

**The domain.** Buy it as soon as the name is chosen: names go quickly. Buy it
in the business's name, on an account the owner controls, so it stays theirs
at handover; turn on auto-renew and WHOIS privacy. Buying through Vercel sets
up the DNS for you; anywhere else (Cloudflare, Namecheap, Porkbun,
Squarespace), add the records Vercel shows when you add the domain to the
project. A `.com.au` or `.au` needs the business's ABN or ACN, in a matching
name. Search the trade mark register for the name before announcing it.
Already own one, or the app lives on the business's site
(`app.their-domain.com`)? `fohm-scaffold done domain --value <domain>`.

**The business.** Before taking money or publishing to the stores, someone has
to be the seller: the name on the privacy policy and terms, the Stripe
account, the bank account, the seller in the App Store and Google Play. A sole
trader is the owner in person (least admin; their own name shows in the
stores); a company is its own legal entity (more admin; its name shows, and it
enrols in the stores as an organisation, which needs a D-U-N-S number). The
`business` step gives the registration steps for Australia (ABN, ASIC, GST),
the UK (HMRC, Companies House, VAT) and the US (state filing, EIN), and the
general shape elsewhere. Its legal name and number go in `operator` and
`registration` in `src/lib/brand.ts`, which the privacy policy and terms show.
Already registered? Pass `--registration` to `new` and the step is done. A
free app run in your own name may need none of it: `fohm-scaffold skip
business`. This is a starting point, not legal or tax advice: an accountant
can say which structure suits and when to register for VAT or GST.

**The store accounts.** Apple and Google verify a developer before it can
publish, which takes days, and a company's D-U-N-S number can take 30 days
more. Start them early (the `store-accounts` step), on the owner's accounts.
A new personal Google Play account must run a closed test with 12 testers for
14 days before its first public release.

Put it on GitHub: create an empty repository on github.com, then

```bash
git remote add origin https://github.com/<you>/<my-app>.git
git push -u origin main
```

**App or game.** `kind` in `src/lib/brand.ts` switches the example game on
Home (`'game'`) or off (`'app'`); you can change it any time. The game, Catch
the dot, is there to replace with yours: its rules are in `src/lib/game.ts`,
its screen in `src/app/game.tsx`. Keep saving each finished round with
`saveScore`: scores are stored on the server, add-only, and show in the
dashboard's Activity and on each member's page.

## 3. Shape the data model

The kit's one example table is `entries`. Replace or extend it with your
product's real things. For each new kind of thing a member creates:

1. **Migration**: add `supabase/migrations/<yyyymmddhhmmss>_<name>.sql`. Make it
   re-runnable (`create table if not exists`, `add column if not exists`),
   with an owner column (`member_id ... references accounts(id) on delete
   cascade`) and `alter table ... enable row level security`.
2. **`api/_lib/db.ts`**: add the table to `TABLES`, listing every column.
3. **`api/data.ts`**: add its read rule to `READS` and its write rule to
   `MEMBER_WRITES`; list owner-only fields in `OWNER_ONLY` and member-only
   fields in `MEMBER_ONLY`. Typecheck fails until you do.
4. **`src/lib/activity.ts`**: add a line per field to `ADMIN_SEES` (typecheck
   fails until you do) and a case to `activity()` so it shows in Activity.
5. **`src/lib/types.ts`**: the record's interface, and its place in `DB` and
   `EMPTY_DB` (demo mode then just works).
6. **`src/lib/store.tsx`**: an action that saves it through the backend.
7. **Tests**: a case in `tests/activity.test.ts`; rules in `tests/api.test.ts`.

The prompt that does most of this for you:

> Read PRODUCT.md and AGENTS.md. Add <thing> that members can <do>. Follow the
> checklist in AGENTS.md: migration, TABLES, READS/MEMBER_WRITES, ADMIN_SEES,
> Activity, types, store, tests. Then run typecheck and the tests.

## 4. Build the screens

- Design first: run `/impeccable` against the owner's Mobbin references and
  write the direction contract to `.impeccable/surfaces/` (which reference
  each screen follows, and what it takes), then build in it. The template's
  look is a neutral starting world (white, ink, real fonts in
  `src/lib/fonts.ts`, photo cards, a floating tab bar), not the design.
- Members: make `src/app/home.tsx` your product's board. Use the kit in
  `src/components/ui.tsx` and `board.tsx`; add components there as you need
  them. Photos wherever they make it personal, each with its licence and
  credit (`src/lib/photos.ts`, `/credits`).
- Programs dated to a goal, built by AI with a rule-based fallback:
  `docs/PROGRAMS.md`. No real coach? Set `coach: false` in `src/lib/brand.ts`
  (or `--coach no` when you create it): the app speaks as itself.
- Owner: put new information where the owner already looks (a filter on
  Activity, a column on People, a section on a member's page) before adding a
  page.
- Brand: the name, landing page words and switches are in `src/lib/brand.ts`;
  colours in `src/lib/theme.ts`, recorded in `DESIGN.md`. Never hard-code
  colours in screens. Add an icon and splash in `app.json` before the stores.
- The landing page (`src/components/landing.tsx`) shows only on the web; the
  apps go straight to sign-in.
- Every screen runs on the web, iOS and Android: guard browser-only code with
  `isWeb` (`src/lib/config.ts`), and check the native bundles still build with
  `npx expo export --platform ios` (and `android`).
- Check each change in a browser at phone width (393×852) and laptop width,
  with `npm run serve:local` and Playwright. Ask the agent to do it; the line
  in `AGENTS.md` tells it how.
- After each feature, send the owner the preview link (a share link, since
  previews are behind Vercel Authentication) and the screenshots from
  `npm run screens`.

## 5. Keep it safe while it grows

- Run `npm run typecheck` and `npm test` before every push. CI runs them too,
  against a fresh local Supabase, and runs every migration twice.
- Never rename or delete a migration that has deployed. Add fields; never
  rename or drop them (open tabs still send the old shape).
- Secrets live only on the server (Vercel environment variables). The browser
  gets public settings from `/api/health`.
- Every write goes through `/api/data`, which decides who may do what. Never
  give the app a database key.
- Have the agent review its own work before merging: `/code-review` in Claude
  Code, and a design review for screens.

## 6. Go live

### Supabase (database and login)
1. Create a project. From **Connect**, copy the **Session pooler** connection
   string (port 5432). Not the direct connection (IPv6-only; Vercel builds are
   IPv4), not the transaction pooler (6543).
2. **Project Settings → API Keys**: copy the publishable key.
3. **Authentication → URL Configuration**: set the Site URL to your domain and
   add `https://<your-domain>/**` to the redirect URLs.
4. Before many people sign up, add custom SMTP (the built-in sender is
   rate-limited).

### Vercel (hosting and the backend)
1. **Add New → Project**, import the GitHub repository. `vercel.json` already
   says how to build.
2. **Settings → Environment Variables** (Production):
   - `SUPABASE_DB_URL` (Sensitive): the Session pooler string
   - `SUPABASE_PUBLISHABLE_KEY`: the publishable key
   - `OWNER_CODE` (Sensitive): the code that makes an owner account. Change it
     from the default.
3. Deploy. The build log shows the migrations applying; `/api/health` then
   reports `"db": "ok"` and the app switches from demo mode to real logins.
4. **Settings → Domains**: add your domain (and `www.`, redirecting to it),
   then add the DNS records Vercel shows at the registrar.

### An inbox for the support address
The support address (`supportEmail` in `src/lib/brand.ts`) is on the landing
page, the privacy policy and the store listings, and Apple and Google write to
it. Forward it to an inbox someone reads (registrars forward for free:
Cloudflare Email Routing, Namecheap, Porkbun, Squarespace) or give it a
mailbox. `fohm-scaffold check inbox` confirms the domain takes mail (its MX
records).

### GitHub
1. **Settings → Secrets and variables → Actions → Variables**: add `SMOKE_URL`
   (your live address). The Smoke workflow then checks production after every
   deploy; without it, it stays off.
2. Optionally protect `main` so changes arrive through pull requests with the
   Tests check green.

### The iOS and Android apps
1. In `app.json`: `extra.apiUrl` is your live site (the apps call its `/api`),
   and `ios.bundleIdentifier` / `android.package` are your own id.
   `fohm-scaffold check mobile-config` verifies both.
2. `npx eas-cli login`, then `npx eas-cli init` to link the project.
3. `npm run build:android`: the preview profile makes an `.apk` you can install
   from the link EAS gives you. Try it on a real phone.
4. `npm run build:ios`: EAS creates the certificates with your Apple account.
   Install it through TestFlight.
5. Store listings: App Store Connect (screenshots, the privacy policy URL
   `https://<domain>/privacy`, a demo member account for the reviewers) and
   the Google Play Console (Data safety: say what `src/lib/legal.ts` says).
6. `npm run submit:ios` and `npm run submit:android`.
7. Later updates: web changes deploy on every push to main; app changes need a
   new build and submission (raise `version` in `app.json` for each release).

### Before real people use it
- A privacy policy and terms of use, saying who runs it and what's stored.
- Make your own owner account on the live site.
- Sign up as a member on a phone and walk the whole path once.

## 7. Switch on the integrations

All of these are already in the code, off until their variables are set in
Vercel (then redeploy). `.env.example` lists every variable, the dashboard's
Settings page shows which are on, and `fohm-scaffold check <step>` confirms
each against the live site. Skip any you don't need with
`fohm-scaffold skip <step>`.

- **Stripe** (`stripe`): one monthly Pro plan. Members buy it on the web
  (Stripe Checkout) and cancel in Stripe's customer portal; the webhook checks
  every event against Stripe's own record; a second paid subscription goes to
  Needs you; deleting an account cancels its subscription first. You can give
  Pro from a member's page. Gate your own features with `isPro` in the app and
  `requirePro` on the server. In the iOS and Android apps, the Pro page points
  to the website: Apple and Google require their own in-app purchase for
  digital subscriptions sold inside an app, so check their current rules
  before adding a buy button there.
- **PostHog** (`posthog`): page views and the events that matter
  (`signed_up`, `entry_created`, `game_finished`, `ai_question`,
  `checkout_started`, `pro_started`, `pro_ended`), from the web, the apps and
  the server. Add yours with `track()`.
- **Sentry** (`sentry`): uncaught errors and crashed screens in the web and
  the apps, and every 500 on the server.
- **Resend** (`email`): new members get a welcome; owners are emailed when
  someone writes; members when they get a reply. Each is HTML in the app's
  colours with a plain-text twin (`api/_lib/emails.ts`). Point Supabase's SMTP
  at Resend too and paste `supabase/templates/` into its email templates, so
  sign-up and password emails come from your domain in the same look. The
  step lists the DNS records (DKIM, SPF, and a DMARC record it checks for).
- **Claude** (`ai`): the AI assistant for Pro members, with a daily limit.
  Every question and answer shows on the dashboard. Give it your product's
  knowledge with `AI_SYSTEM_PROMPT`.
- **Google** (`google`): Continue with Google on the web sign-in page.
- **Push** (`push`): replies and new messages reach phones. Needs
  `npx eas-cli init`, and Firebase for Android.
- **Tapp** (`tapp`): share links that survive the install. Members send an
  invite link from Your account, and `https://<domain>/go/<channel>` is one
  link per place you find people; the dashboard shows who invited whom and
  which link each person came through. Native: it reaches the apps with a
  store build, and on iPhone it runs only for people who allow tracking.

The dashboard's People also shows when each person was last in the app and
on what (the web, iPhone or Android, and the app's version).

## 8. Working with a coding agent, day to day

- One feature per branch and pull request; merge to `main` to ship.
- Start each request with the outcome and who it's for, not the code: "Members
  can attach a photo to an entry, and the owner sees it on their page."
- Record decisions where agents will read them: product rules in `AGENTS.md`
  (with who decided and when), product facts in `PRODUCT.md`, visual rules in
  `DESIGN.md`.
- When a review finds a class of bug, turn the fix into a rule the typechecker
  or a test enforces (that's where `ADMIN_SEES` came from).
