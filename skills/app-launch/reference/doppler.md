# Doppler (where the keys live)

Takes: about fifteen minutes once for the business, then nothing for each new app but typing its own keys.

**Why.** Every app's keys sit in one place, set once and synced into each app's Vercel project, so nobody pastes the same key into five projects.
Keys every app uses (`SLACK_WEBHOOK_URL`, `RESEND_API_KEY`) live once in a project called `shared`.
Keys that belong to one app live in that app's own project, so its spend and its revocation are its own: `ANTHROPIC_API_KEY` is one of these, from the app's own Anthropic workspace (Robert's choice, Nov 2026).
An app's project holds its own keys and a reference to each shared one, so changing a shared key changes it in every app.
Without Doppler, the Vercel team's shared variables are the fallback ([accounts.md](accounts.md)).

## What the agent does

- Asks for the Doppler token with `request_credential` (host `api.doppler.com`), like the Supabase, Vercel and Expo tokens, and runs Set up app with `DOPPLER_TOKEN=proxy-injected` ([accounts.md](accounts.md), *Running it from a Claude session*).
- Set up app's `doppler` step, before Vercel's, does the rest, and a second run changes nothing:
  - the app's project, named its slug (or `DOPPLER_PROJECT`), made if missing, with its `dev`, `stg` and `prd` configs;
  - in `prd`, each of the app's own keys by name and empty, for the person to fill (`ANTHROPIC_API_KEY`, or the list in `DOPPLER_APP_SECRETS`);
  - in `prd`, a reference to each name in `shared/prd` (`DOPPLER_SHARED_PROJECT`, default `shared`): the value is the literal `${shared.prd.SLACK_WEBHOOK_URL}`;
  - a Vercel team shared variable of the same name unlinked from the app's Vercel project, or the two clash;
  - the sync from `prd` to the Vercel project's production variables, if there isn't one: `import_option: prefer_integration`, so Doppler first imports what the Vercel project already has and keeps it, and nothing live is wiped;
  - a redeploy of production, so the synced variables take effect.
- Previews keep their own Vercel variables: the sync is production only.
- Variables Vercel marks Sensitive can't be imported, so they stay in Vercel untouched: `SUPABASE_DB_URL`, which Set up app writes, is one.
- Set up app then links from the Vercel team only the shared variables Doppler doesn't sync, so no name is set twice.
- Reads only names (`GET /v3/configs/config/secrets/names`), never `/secrets` or `/secret`, which answer with values; a write's answer, which carries values, is dropped unread.
- Never asks for a value, and never types one: the person types each into Doppler's dashboard.
- Gives the person the link to the app's config: `https://dashboard.doppler.com/workplace/<workplace slug from GET /v3/me>/projects/<project>/configs/prd`.

## What is the person's

Once for the business, not once an app:

1. **The workplace**: doppler.com → sign up → a workplace for the business (for example `fohm`).
2. **The shared project**: Projects → + → `shared`; in its `prd` config, the keys every app uses (`SLACK_WEBHOOK_URL`, `RESEND_API_KEY`), typed there and nowhere else.
3. **The token**: Doppler → the account → Tokens → a personal token, pasted only into the Claude environment's secure form when the agent asks (host `api.doppler.com`); never in a chat, an issue or the repository.
4. **The integrations**: Doppler → Integrations → Vercel (the team), and Railway for an app whose API runs there.

For each new app:

1. Its own keys, in the app's project → `prd` (the link the agent gives): `ANTHROPIC_API_KEY` from a new workspace in the Anthropic console for this app (platform.claude.com → Workspaces → + → API keys).
2. Nothing else: the sync carries them to Vercel, and a key changed in Doppler reaches the app at its next deploy.

## How to check it

- `npm run launch:check` (with `DOPPLER_TOKEN`) shows the Doppler group: the app's project, each of its own keys and each reference by name, the names in `shared`, and the sync with its status and last run.
- Doppler's API can't say whether a secret has a value without answering with the value, so the check names keys and never reads one: an empty key shows as its integration off in `curl -s https://<domain>/api/health | jq .integrations` after a redeploy.
- `curl -s https://api.doppler.com/v3/integrations` (in a session, through the proxy) lists each sync with `lastSyncedAt` and `status`, and no values.
