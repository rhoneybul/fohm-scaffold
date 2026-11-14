#!/usr/bin/env node
/**
 * fohm-scaffold: make a new app (web, iOS, Android, landing page, owner
 * dashboard) and walk through every step to live.
 *
 * Interactive in a terminal; with --json (or no terminal, as for an agent) it
 * never prompts and prints one JSON object. `fohm-scaffold mcp` serves the
 * same as MCP tools over stdio.
 */
import readline from 'node:readline/promises';

import { check, explain, markDone, newApp, overview, questions, resolveDir } from '../lib/core.mjs';

const HELP = `fohm-scaffold: create a new app, then walk through every step to live

  new [folder] [--name ..] [--kind app|game] [--tagline ..] [--member-word ..]
      [--owner-word ..] [--operator ..] [--support-email ..] [--domain ..]
      [--bundle-id ..] [--accent #hex] [--no-git] [--yes]
                         create the app (asks for anything missing, unless --yes)
  status   [--dir d]     every step, done or not, and what's next
  next     [--dir d]     the next step in full
  check    [step] [--dir d]   run the automatic checks (all, or one); a pass marks it done
  done     <step> [--value v] [--dir d]   mark a manual step done (vercel: --value https://your-site)
  undo     <step> [--dir d]
  explain  <step>        why a step matters and what to do
  questions              what \`new\` asks, as data
  mcp                    serve all of this as MCP tools over stdio

  --json   print JSON only (the default when not in a terminal)
`;

function parse(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) {
      args._.push(a);
      continue;
    }
    const [k, inline] = a.slice(2).split('=', 2);
    const key = k.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (inline !== undefined) args[key] = inline;
    else if (argv[i + 1] !== undefined && !argv[i + 1].startsWith('--')) args[key] = argv[++i];
    else args[key] = true;
  }
  return args;
}

const args = parse(process.argv.slice(2));
const [cmd, arg] = args._;
const json = !!args.json || !process.stdout.isTTY;
const interactive = !json && process.stdin.isTTY && !args.yes;

function printOverview(o) {
  console.log(`\n${o.app} (${o.kind}): ${o.done} of ${o.total} steps done\n`);
  for (const s of o.steps) console.log(`  ${s.done ? '[x]' : '[ ]'} ${String(s.n).padStart(2)}. ${s.title}  (${s.id}${s.how === 'manual' ? ', by hand' : ''})`);
  if (o.next) printStep(o.next);
  else console.log('\nEverything is done. Ship it.\n');
}
function printStep(s) {
  console.log(`\nNext: ${s.title}  [${s.id}]\n  Why: ${s.why}\n`);
  for (const line of s.do) console.log(`  - ${line}`);
  console.log(s.how === 'manual' ? `\n  When it's done: fohm-scaffold done ${s.id}\n` : `\n  Then: fohm-scaffold check ${s.id}\n`);
}
const out = (data, pretty) => (json ? console.log(JSON.stringify(data, null, 2)) : pretty(data));

async function main() {
  const dir = resolveDir(args.dir);
  switch (cmd) {
    case 'new': {
      const input = { name: args.name, kind: args.kind, tagline: args.tagline, memberWord: args.memberWord, ownerWord: args.ownerWord, operator: args.operator, supportEmail: args.supportEmail, domain: args.domain, bundleId: args.bundleId, accent: args.accent, slug: args.slug };
      if (!input.name && arg) input.name = arg.split('/').pop();
      if (interactive) {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        console.log('\nLet’s make a new app. Press Enter to take the suggestion in brackets.\n');
        for (const q of questions()) {
          if (input[q.key]) continue;
          const hint = q.default !== undefined ? q.default || 'blank' : `e.g. ${q.example}`;
          const a = (await rl.question(`${q.ask} [${hint}]: `)).trim();
          if (a) input[q.key] = a;
        }
        rl.close();
      }
      const r = newApp(input, { dir: arg, git: args.git !== false && !args.noGit });
      if (!r.ok) {
        out(r, () => console.error(`Can't create it yet:\n  - ${r.errors.join('\n  - ')}`));
        process.exitCode = 1;
        return;
      }
      out(r, () => {
        console.log(`\nCreated ${r.options.name} in ${r.dir}`);
        console.log(`  web + landing page + dashboard, iOS and Android${r.options.kind === 'game' ? ', with the example game' : ''}`);
        console.log(`\n  cd ${arg ?? r.options.slug}`);
        console.log('  npx github:rhoneybul/fohm-scaffold status   (any time, to see where you are)');
        printOverview(r);
      });
      return;
    }
    case 'status':
      return out(overview(dir), printOverview);
    case 'next': {
      const o = overview(dir);
      return out(o.next ?? { done: true }, (s) => (o.next ? printStep(s) : console.log('Everything is done.')));
    }
    case 'check': {
      const r = await check(dir, arg);
      return out(r, () => {
        for (const x of r.results) console.log(`${x.ok ? 'PASS' : 'TODO'}  ${x.id}: ${x.detail}`);
        if (!r.results.length) console.log('Nothing left to check automatically.');
        printOverview(r);
      });
    }
    case 'done':
    case 'undo':
      if (!arg) throw new Error(`Which step? fohm-scaffold ${cmd} <step>`);
      return out(markDone(dir, arg, typeof args.value === 'string' ? args.value : undefined, cmd === 'undo'), printOverview);
    case 'explain':
      if (!arg) throw new Error('Which step? fohm-scaffold explain <step>');
      return out(explain(arg), printStep);
    case 'questions':
      return out(questions(), (qs) => qs.forEach((q) => console.log(`${q.key}: ${q.ask}`)));
    case 'mcp':
      await import('../mcp/server.mjs');
      return;
    default:
      if (cmd && cmd !== 'help') process.exitCode = 1;
      console.log(HELP);
  }
}

main().catch((e) => {
  if (json) console.log(JSON.stringify({ ok: false, error: e.message }));
  else console.error(e.message);
  process.exitCode = 1;
});
