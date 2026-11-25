# Supabase (database and login)

**Why.** Real accounts and data, shared between the web and the apps.
Until it's set up the app runs in demo mode (everything kept in the browser), so previews work before it.

## What the agent does

With Claude's **Supabase** connector:

- Creates the project in the person's organisation (`create_project`, a region near the app's users; the cost confirmation first).
- Reads its URL and publishable key (`get_project_url`, `get_publishable_keys`) and puts them in Vercel as `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (the Vercel connector's `create_project_env`).
- Migrations, tables and keys are the connector's and the deploy's: every production deploy pushes `supabase/migrations/` as its first step (`scripts/migrate.sh`), and previews skip it because they share the database ([vercel.md](vercel.md)).
- Reads the logs and advisors (`get_advisors`) when something is wrong.

Without the connector, the person does it: supabase.com → New project, and save the database password; Project Settings → API Keys → copy the publishable key.

## What is the person's

- The database password is never shown to the agent, and never goes through the chat.
  Supabase → the project → Database → Settings → Reset database password; then Connect → copy the **Session pooler** string (port 5432) with that password into Vercel as `SUPABASE_DB_URL` (Sensitive).
  Not the direct connection (IPv6-only; Vercel builds are IPv4), not the transaction pooler (port 6543).
- Authentication → URL Configuration: Site URL = `https://<domain>`; add `https://<domain>/**` to Redirect URLs.
  Two fields, but the person's: in a cloud session Supabase's management API refuses the proxy's credential, so an agent can't change auth settings.
- Before many people sign up: Authentication → Emails → set up custom SMTP (the built-in sender allows only a few an hour; [resend.md](resend.md) says how).

## How to check it

- `curl -s https://<domain>/api/health` says `"db": "ok"` with a `migration`, and `auth` has the URL and key ([vercel.md](vercel.md)).
