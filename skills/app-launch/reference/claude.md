# AI assistant (Claude)

Optional; off until its key is set.

**Why.** Pro members ask questions any time; the owner sees every question and answer on the dashboard.

## What the agent does

- Knows what's built: `api/ai.ts` and `src/app/ask.tsx`, model `claude-opus-5-5` through the official SDK with the server-side refusal fallback on; members can't write `ai_chats` themselves; an AI says it's an AI.
- Writes `AI_SYSTEM_PROMPT` with the owner to give it the product's voice and knowledge, and sets `AI_DAILY_LIMIT` if 30 a member a day is wrong.
- Programs built by AI use Haiku, with a rule-based fallback (the new-app skill's `reference/programs.md`).

## What is the person's

- platform.claude.com → API keys → create one; in Vercel: `ANTHROPIC_API_KEY` (Sensitive). Redeploy.

## How to check it

- `curl -s https://<domain>/api/health | jq .integrations.ai` is `true`.
