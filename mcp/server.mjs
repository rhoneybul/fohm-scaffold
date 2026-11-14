/**
 * fohm-scaffold as an MCP server (stdio, newline-delimited JSON-RPC), with no
 * dependencies. Add it to Claude Code:
 *   claude mcp add fohm-scaffold -- npx -y github:rhoneybul/fohm-scaffold mcp
 * The tools mirror the CLI: an agent can ask the questions, create the app,
 * then walk the person through each step, checking as it goes.
 */
import readline from 'node:readline';

import { check, explain, markDone, newApp, overview, questions } from '../lib/core.mjs';
import { KINDS } from '../lib/options.mjs';
import { STEPS } from '../lib/steps.mjs';

const str = (description) => ({ type: 'string', description });
const dir = str('The app folder (absolute path is safest)');
const step = { type: 'string', enum: STEPS.map((s) => s.id), description: 'A step id' };

const TOOLS = [
  {
    name: 'scaffold_questions',
    description: 'What a new app needs decided, with examples and defaults. Ask the person these before scaffold_new_app; only name is required.',
    inputSchema: { type: 'object', properties: {} },
    run: () => questions(),
  },
  {
    name: 'scaffold_new_app',
    description: 'Create a new app: web app, landing page, owner dashboard, iOS and Android (Expo), Supabase backend, tests and CI, with Stripe, PostHog, Sentry, Resend email, a Claude AI assistant, Google sign-in and push notifications built in (each off until its key is set). kind "game" adds an example game with scores on the dashboard. Returns the steps to go live.',
    inputSchema: {
      type: 'object',
      required: ['name', 'dir'],
      properties: {
        dir: str('Folder to create (must not exist or be empty)'),
        name: str('The app name'),
        kind: { type: 'string', enum: KINDS },
        tagline: str('Landing page headline'),
        memberWord: str('What users are called, e.g. student'),
        ownerWord: str('What the person running it is called, e.g. coach'),
        operator: str('Who runs it, for the privacy policy'),
        supportEmail: str('Support email'),
        domain: str('Domain, e.g. tidepool.app'),
        bundleId: str('iOS/Android id, e.g. app.tidepool'),
        accent: str('Accent colour, #RRGGBB'),
        git: { type: 'boolean', description: 'git init and first commit (default true)' },
      },
    },
    run: ({ dir: d, git, ...input }) => newApp(input, { dir: d, git: git !== false }),
  },
  { name: 'scaffold_status', description: 'Every step for the app, which are done, and the next one in full.', inputSchema: { type: 'object', required: ['dir'], properties: { dir } }, run: ({ dir: d }) => overview(d) },
  {
    name: 'scaffold_check',
    description: 'Run automatic checks (one step, or all checkable steps not done). A pass marks the step done. Use after the person (or you) did the work.',
    inputSchema: { type: 'object', required: ['dir'], properties: { dir, step } },
    run: ({ dir: d, step: s }) => check(d, s),
  },
  {
    name: 'scaffold_mark_done',
    description: 'Mark a manual step done once the person confirms it (supabase: value = project ref; vercel: value = live https URL). skip: the person doesn’t want an optional integration (stripe, posthog, sentry, email, ai, google, push). undo reopens a step.',
    inputSchema: { type: 'object', required: ['dir', 'step'], properties: { dir, step, value: str('Optional value to record'), undo: { type: 'boolean' }, skip: { type: 'boolean' } } },
    run: ({ dir: d, step: s, value, undo, skip }) => markDone(d, s, value, !!undo, !!skip),
  },
  { name: 'scaffold_explain', description: 'Why a step matters and exactly what to do.', inputSchema: { type: 'object', required: ['step'], properties: { step } }, run: ({ step: s }) => explain(s) },
];

const send = (msg) => process.stdout.write(JSON.stringify(msg) + '\n');
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
const fail = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

async function onMessage(m) {
  const { id, method, params } = m;
  if (method === 'initialize')
    return reply(id, {
      protocolVersion: params?.protocolVersion ?? '2025-06-18',
      capabilities: { tools: {} },
      serverInfo: { name: 'fohm-scaffold', version: '0.1.0' },
      instructions: 'Creates a new app and guides the person through every step to live. Start with scaffold_questions, then scaffold_new_app; after that, loop: scaffold_status → help with the next step → scaffold_check or scaffold_mark_done.',
    });
  if (method === 'ping') return reply(id, {});
  if (method === 'tools/list') return reply(id, { tools: TOOLS.map(({ run, ...t }) => t) });
  if (method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === params?.name);
    if (!tool) return fail(id, -32602, `Unknown tool ${params?.name}`);
    try {
      const data = await tool.run(params.arguments ?? {});
      const isError = data && data.ok === false;
      return reply(id, { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], isError });
    } catch (e) {
      return reply(id, { content: [{ type: 'text', text: e.message }], isError: true });
    }
  }
  if (id !== undefined) fail(id, -32601, `Unknown method ${method}`);
  // Notifications (notifications/initialized and the rest) need no answer.
}

const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => {
  if (!line.trim()) return;
  let m;
  try {
    m = JSON.parse(line);
  } catch {
    return fail(null, -32700, 'Parse error');
  }
  onMessage(m).catch((e) => fail(m.id ?? null, -32603, e.message));
});
