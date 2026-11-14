/**
 * POST /api/ai { question } → { chat }: the AI assistant, answered by Claude
 * and stored, so the owner sees every question and answer (AGENTS.md). Needs
 * Pro and ANTHROPIC_API_KEY; at most AI_DAILY_LIMIT questions a day each
 * (default 30). The last few exchanges go along, so follow-ups make sense.
 */
import Anthropic from '@anthropic-ai/sdk';

import { actorFrom, requirePro } from './_lib/access.js';
import { APP_NAME } from './_lib/app.js';
import { capture } from './_lib/analytics.js';
import { HttpError, handle, sql, toRecord } from './_lib/db.js';

const AI_MODEL = 'claude-opus-5-5';
const aiConfigured = () => !!process.env.ANTHROPIC_API_KEY;

const system = () =>
  process.env.AI_SYSTEM_PROMPT ||
  `You are the assistant inside ${APP_NAME}. Answer the person's question helpfully and briefly, in plain English, without emoji. ` +
    `If something needs a human (their account, payments, a complaint, anything personal or risky), say the people who run ${APP_NAME} can help and suggest they write to them in the app.`;

export const POST = handle(async (req) => {
  const actor = await actorFrom(req);
  requirePro(actor);
  if (!aiConfigured()) throw new HttpError(503, 'The AI assistant isn’t switched on yet.');
  const body = (await req.json().catch(() => ({}))) as { question?: unknown };
  const question = String(body.question ?? '').trim().slice(0, 4000);
  if (!question) throw new HttpError(400, 'Ask a question first.');

  const db = sql();
  const [{ n }] = await db`select count(*)::int as n from ai_chats where member_id = ${actor.id} and created_at > now() - interval '1 day'`;
  if (n >= Number(process.env.AI_DAILY_LIMIT || 30)) throw new HttpError(429, 'That’s today’s questions used up. Try again tomorrow.');
  const history = (await db`select question, answer from ai_chats where member_id = ${actor.id} order by created_at desc limit 6`).reverse();

  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = [
    ...history.flatMap((h): Anthropic.Beta.BetaMessageParam[] => [
      { role: 'user', content: h.question },
      { role: 'assistant', content: h.answer },
    ]),
    { role: 'user', content: question },
  ];
  // If the model declines on safety grounds, the API retries on its default fallback model in the same call.
  const response = await client.beta.messages.create({
    model: AI_MODEL,
    max_tokens: 16000,
    system: system(),
    messages,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });
  const answer =
    response.stop_reason === 'refusal'
      ? 'I can’t help with that one. The people who run this app can: write to them from Home.'
      : response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n').trim() || 'I don’t have an answer for that.';

  const id = `ai_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const [row] = await db`insert into ai_chats (id, member_id, question, answer, model) values (${id}, ${actor.id}, ${question}, ${answer}, ${response.model}) returning *`;
  await capture(actor.id, 'ai_question');
  return Response.json({ chat: toRecord('ai', row) });
});
