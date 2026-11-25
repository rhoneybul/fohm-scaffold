# Vercel (web app, landing page, dashboard and API)

**Why.** Every push to main deploys: migrations first, then the site and `/api`.
Previews of every pull request are how the owner sees the app between releases.

**Migrations run themselves.** They run automatically as the first step of every production deploy (`scripts/migrate.sh` in the build command): serverless functions have no startup to run them in.
A migration that fails stops the deploy, and the previous one keeps serving, so code never goes live without the schema it needs.
Previews skip them, because they share the production database: a migration pushed from a pull request before it merged would stop every production deploy of main (Strawberry Fields, Nov 2026).
So a migration ships with its PR merging, and nothing pushes one by hand.

## What the agent does

With Claude's **Vercel** connector:

- Creates the project from the GitHub repository (`vercel.json` already says how to build).
  In-repo: Root Directory = the app's folder, a project of its own beside whatever else deploys from that repository.
- Adds every public variable: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `POSTHOG_KEY`, `POSTHOG_HOST`, `SENTRY_DSN`.
- Secret keys come from Doppler when it's set up, synced to the project's production variables ([doppler.md](doppler.md)); previews keep their own variables.
- Deploys, then adds the domain (Settings → Domains, `add_project_domain`); for a bare domain (example.com, not app.example.com) adds its `www.` too, redirecting to it.
  Bought through Vercel, the DNS is done; anywhere else, gives the person the records Vercel shows.
- Previews: every pull request gets its own preview deployment, behind Vercel Authentication, so the owner can't open the bare link.
  Gives them a share link with `get_access_to_vercel_url` (it lasts 23 hours), with screenshots (`npm run screens`) after each feature.
- With no database yet the app runs in demo mode, so a preview works before Supabase's password is set: sends the owner one early.
- Failed deploys: the build logs (`get_deployment`, `list_deployment_events`); production errors: `get_runtime_errors`.

Without the connector: vercel.com → Add New → Project → import the GitHub repository.

## What is the person's

- Settings → Environment Variables (Production), each Sensitive: `SUPABASE_DB_URL` (the pooler string, [supabase.md](supabase.md)) and `OWNER_CODE` (a code only they know, never the default `change-me`); `COACH_CODE` too if other coaches will join.
  Secrets never go through the chat.
- The DNS records at the registrar, when it isn't Vercel (they can take an hour to spread).

## How to check it

`curl -s https://<domain>/api/health` proves the database, migrations and login are wired up in production:

- `"db": "ok"`: anything else, check `SUPABASE_DB_URL` in Vercel and redeploy.
- `auth` is set: otherwise add `SUPABASE_PUBLISHABLE_KEY` and redeploy.
- `migration` and `commit` name what's live.
- A production build's log shows the migrations applying (`[migrate] Done.`); a preview's says it skipped them; the app switches from demo mode to real logins.

When the site can't be reached, find out why before telling the person:

- Ask DNS over HTTPS: `curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=<domain>&type=A'`.
- No answer: the domain doesn't point anywhere yet. In Vercel → Settings → Domains, add it, then add the DNS records Vercel shows at the registrar (they can take an hour to spread).
- An answer, but this machine still can't reach it: its network may be blocking it (a sandbox, VPN or firewall). Check from another machine, or with the Vercel connector's `web_fetch_vercel_url`.
