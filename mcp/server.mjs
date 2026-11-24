/**
 * fohm-scaffold as an MCP server (stdio, newline-delimited JSON-RPC), with no
 * dependencies. Add it to Claude Code:
 *   claude mcp add fohm-scaffold -- npx -y github:rhoneybul/fohm-scaffold mcp
 * The tools mirror the CLI: an agent can ask the questions, create the app,
 * then walk the person through each step, checking as it goes.
 */
import readline from 'node:readline';

import { check, explain, github, manual, markDone, names, newApp, questions, references, status } from '../lib/core.mjs';
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
    name: 'scaffold_check_names',
    description: 'Check whether name ideas are free: .com, .app and .co domains (registry lookups) and the GitHub repository name. Propose 5 to 10 names from the person’s idea first (short, sayable, not a competitor’s), check them here, and let them choose. A domain that comes back "couldn’t check" (the network refused the registry lookup, as cloud sessions often do): check it with Vercel’s get_bulk_availability through Claude’s Vercel connector.',
    inputSchema: { type: 'object', required: ['names'], properties: { names: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 20 }, githubOwner: str('GitHub user or organisation the repository will be under') } },
    run: ({ names: list, githubOwner }) => names(list, { owner: githubOwner }),
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
        idea: str('In a sentence: what it does, and for whom'),
        business: str('Whose business it is, and what they already sell'),
        kind: { type: 'string', enum: KINDS, description: 'coaching (default): a structured progression with assessment, path, check-ins, clips for the coach and a library; app: plain members-and-owner; game: an example game' },
        coach: { type: 'string', enum: ['yes', 'no'], description: 'Is there a real coach in the app (yes, the default), or is it programs with nobody behind them (no: no coach shown or offered, the app speaks as itself, the people who run it are "the team")? Ask the person; never invent a coach.' },
        inspiration: str('Apps the owner likes the look of, comma-separated (then find their screens on Mobbin and call scaffold_add_references)'),
        tagline: str('Landing page headline'),
        memberWord: str('What users are called, e.g. student'),
        ownerWord: str('What the person running it is called, e.g. coach'),
        operator: str('Who runs it, for the privacy policy: the person, or the business’s legal name'),
        country: str('Country the business is in (Australia, UK, US get specific steps for registering it and the domain)'),
        registration: str('The business’s registration as the terms should show it, e.g. "ABN 51 824 753 556"; leave out if it isn’t registered yet (the business step then walks them through it)'),
        address: str('The business’s registered office address, shown with the registration on the terms and privacy policy (a UK company must show it); leave out if it isn’t registered yet'),
        supportEmail: str('Support email'),
        domain: str('Domain, e.g. tidepool.app'),
        bundleId: str('iOS/Android id, e.g. app.tidepool'),
        accent: str('Accent colour, #RRGGBB'),
        git: { type: 'boolean', description: 'git init and first commit (default true; never inside an existing repository)' },
        inRepo: { type: 'boolean', description: 'Make the app a folder of the git repository it is created in: its workflows go to the repository’s root, scoped to the folder, with no git init. Found by itself when dir’s parent is in a repository; false for a repository of its own.' },
      },
    },
    run: ({ dir: d, git, inRepo, ...input }) => newApp(input, { dir: d, git: git !== false, inRepo }),
  },
  {
    name: 'scaffold_status',
    description: 'Every step for the app, which are done, who does each (who: you = only the person, both = the person gives you something, agent = you), the next one in full, and nextForAgent: the first one you can get on with while the person works through their own.',
    inputSchema: { type: 'object', required: ['dir'], properties: { dir } },
    run: ({ dir: d }) => status(d),
  },
  {
    name: 'scaffold_manual_work',
    description:
      'The manual work: every step only the person can do (accounts, payments, buying the domain, registering the business, keys into Vercel), slowest first, written as a page to <dir>/.fohm/manual-work.html (scaffold_status and every tool that changes a step rewrite it too, so it is always current). If you can publish Artifacts, publish that file as one right after scaffold_new_app (icon "checklist") and give the person the link, then call this with artifactUrl to remember it; after any step changes, republish the same file to that URL. Without Artifacts, take the person through the steps in chat. Returns the steps with their lines.',
    inputSchema: { type: 'object', required: ['dir'], properties: { dir, artifactUrl: str('The link the page was published to, to remember (https://claude.ai/artifact/...)') } },
    run: ({ dir: d, artifactUrl }) => manual(d, { artifact: artifactUrl }),
  },
  {
    name: 'scaffold_check',
    description: 'Run automatic checks (one step, or all checkable steps not done). A pass marks the step done. Use after the person (or you) did the work.',
    inputSchema: { type: 'object', required: ['dir'], properties: { dir, step } },
    run: ({ dir: d, step: s }) => check(d, s),
  },
  {
    name: 'scaffold_mark_done',
    description: 'Mark a manual step done once the person confirms it (domain: value = the domain; business: value = its legal name and number; supabase: value = project ref; vercel: value = live https URL). A result with a note says what else to change (a domain other than the one the app was made for). skip: an optional step they don’t need (business, for a free app run in their own name; the integrations stripe, posthog, sentry, email, ai, google, push). undo reopens a step and forgets its value.',
    inputSchema: { type: 'object', required: ['dir', 'step'], properties: { dir, step, value: str('Optional value to record'), undo: { type: 'boolean' }, skip: { type: 'boolean' } } },
    run: ({ dir: d, step: s, value, undo, skip }) => markDone(d, s, value, !!undo, !!skip),
  },
  {
    name: 'scaffold_create_github_repo',
    description: 'Create the app’s GitHub repository with the gh CLI on this machine and push it (private by default). If gh isn’t available but you have GitHub tools, create the repository with them instead, then run git remote add origin <url> and git push -u origin main in the app folder.',
    inputSchema: { type: 'object', required: ['dir'], properties: { dir, owner: str('User or organisation (default: the signed-in account)'), name: str('Repository name (default: the app’s slug)'), visibility: { type: 'string', enum: ['private', 'public', 'internal'] } } },
    run: ({ dir: d, owner, name, visibility }) => github(d, { owner, name, visibility }),
  },
  {
    name: 'scaffold_add_references',
    description: 'Add design references to the app’s DESIGN.md. Find them first with Mobbin’s tools (search_screens / search_flows, by each app the owner likes and by screen: onboarding, home, progress, a paywall); look at the images, then pass the best with what to take from each.',
    inputSchema: {
      type: 'object',
      required: ['dir', 'references'],
      properties: {
        dir,
        references: {
          type: 'array',
          minItems: 1,
          items: { type: 'object', required: ['app'], properties: { app: str('App name'), screen: str('Which screen or flow'), url: str('The mobbin_url'), take: str('What to take from it, concretely') } },
        },
      },
    },
    run: ({ dir: d, references: refs }) => references(d, refs),
  },
  {
    name: 'scaffold_explain',
    description: 'Why a step matters and exactly what to do. With dir, in this app’s words: its country’s steps for registering the business, its domain and project ref filled in.',
    inputSchema: { type: 'object', required: ['step'], properties: { step, dir } },
    run: ({ step: s, dir: d }) => explain(s, d),
  },
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
      instructions: [
        'Creates a new app and guides the person through every step, following one strategy: productise what a business already sells, research first, design from references, build a lean skeleton, launch, grow, hand over.',
        'Start: ask scaffold_questions in one message. No name yet? Propose 5 to 10 from their idea and check them with scaffold_check_names. Then scaffold_new_app.',
        'Then loop: scaffold_status → help with the next step → scaffold_check (checked steps) or scaffold_mark_done (manual ones; skip for optional integrations they don’t want).',
        'Manual work: some steps only the person can do (who: "you"): buying the domain, registering the business if it isn’t already, the App Store and Google Play accounts, Supabase, Vercel, keys. Right after scaffold_new_app, publish the page scaffold_manual_work writes as an Artifact if you can, give them the link, and remember it with artifactUrl; republish to the same link whenever a step changes. Walk them through the ones that take days first (domain, business, store accounts). Don’t wait on their steps: carry on with nextForAgent.',
        'Domain and business: ask whether they own the domain and whether the business is registered (and where). Already done: scaffold_mark_done with the value. Not yet: walk them through the step’s lines for their country.',
        'Research: use web search to fill docs/RESEARCH.md, citing sources and never inventing numbers. Design: use Mobbin’s MCP tools to find screens from the apps they like, then scaffold_add_references. GitHub: scaffold_create_github_repo.',
        'Never ask for secrets in chat: keys go straight into Vercel’s environment variables.',
      ].join(' '),
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
