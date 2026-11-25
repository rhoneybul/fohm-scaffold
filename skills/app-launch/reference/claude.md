# AI assistant (Claude)

Optional; off until its key is set.

**Why.** Pro members ask questions any time; the owner sees every question and answer on the dashboard.

## What the agent does

- Knows what's built: `api/ai.ts` and `src/app/ask.tsx`, model `claude-opus-5-5` through the official SDK with the server-side refusal fallback on; members can't write `ai_chats` themselves; an AI says it's an AI.
- Writes `AI_SYSTEM_PROMPT` with the owner to give it the product's voice and knowledge, and sets `AI_DAILY_LIMIT` if 30 a member a day is wrong.
- Programs built by AI use Haiku, with a rule-based fallback (the new-app skill's `reference/programs.md`).

## What is the person's

- A key per app, never one shared by every app, so each app's spend and revocation are its own (Robert's choice, Nov 2026): platform.claude.com → Workspaces → + (named for the app) → API keys → create one in that workspace.
- Type it into the app's Doppler project → `prd` → `ANTHROPIC_API_KEY` (Set up app has made the name, empty; [doppler.md](doppler.md)); the sync carries it to Vercel's production. Without Doppler: in the app's Vercel project, `ANTHROPIC_API_KEY` (Sensitive). Redeploy.

## How to check it

- `curl -s https://<domain>/api/health | jq .integrations.ai` is `true`.
- `npm run launch:check` names *ANTHROPIC_API_KEY (the app's own)* in Doppler; it can't say whether it has a value, which is what the line above shows.
