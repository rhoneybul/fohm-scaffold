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

import { check, explain, github, markDone, names, newApp, overview, questions, references, resolveDir } from '../lib/core.mjs';

const HELP = `fohm-scaffold: create a new app, then walk through every step to live

  names <idea> [<idea>...] [--owner gh-user]
                         which of these names are free: .com/.app/.co domains and the GitHub repo
  new [folder] [--idea ..] [--business ..] [--name ..] [--kind coaching|app|game]
      [--inspiration "Speak, Ahead"] [--tagline ..] [--member-word ..]
      [--owner-word ..] [--operator ..] [--support-email ..] [--domain ..]
      [--bundle-id ..] [--accent #hex] [--no-git] [--yes]
                         create the app (asks for anything missing, unless --yes)
  status   [--dir d]     every step, by phase, done or not, and what's next
  github   [--owner org] [--public] [--dir d]   create the GitHub repository (gh CLI) and push
  references --app A [--screen S] [--url https://mobbin.com/...] [--take "what to learn"] [--dir d]
                         add a design reference to DESIGN.md
  next     [--dir d]     the next step in full
  check    [step] [--dir d]   run the automatic checks (all, or one); a pass marks it done
  done     <step> [--value v] [--dir d]   mark a manual step done (vercel: --value https://your-site)
  skip     <step> [--dir d]   skip an optional step (stripe, posthog, sentry, email, ai, google, push); undo brings it back
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
  console.log(`\n${o.app} (${o.kind}): ${o.done} of ${o.total} steps done${o.skipped ? `, ${o.skipped} skipped` : ''}`);
  let phase = '';
  for (const s of o.steps) {
    if (s.phase !== phase) console.log(`\n  ${(phase = s.phase)}`);
    console.log(`  ${s.done ? '[x]' : s.skipped ? '[-]' : '[ ]'} ${String(s.n).padStart(2)}. ${s.title}  (${s.id}${s.how === 'manual' ? ', by hand' : ''}${s.optional ? ', optional' : ''})`);
  }
  if (o.next) printStep(o.next);
  else console.log('\nEverything is done. Ship it.\n');
}
function printStep(s) {
  console.log(`\nNext${s.phase ? ` (${s.phase})` : ''}: ${s.title}  [${s.id}]\n  Why: ${s.why}\n`);
  for (const line of s.do) console.log(`  - ${line}`);
  console.log(s.how === 'manual' ? `\n  When it's done: fohm-scaffold done ${s.id}` : `\n  Then: fohm-scaffold check ${s.id}`);
  console.log(s.optional ? `  Not needed? fohm-scaffold skip ${s.id}\n` : '');
}
const out = (data, pretty) => (json ? console.log(JSON.stringify(data, null, 2)) : pretty(data));

async function main() {
  const dir = resolveDir(args.dir);
  switch (cmd) {
    case 'new': {
      const input = { idea: args.idea, business: args.business, inspiration: args.inspiration, name: args.name, kind: args.kind, tagline: args.tagline, memberWord: args.memberWord, ownerWord: args.ownerWord, operator: args.operator, supportEmail: args.supportEmail, domain: args.domain, bundleId: args.bundleId, accent: args.accent, slug: args.slug };
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
    case 'names': {
      const list = args._.slice(1);
      if (!list.length) throw new Error('Which names? fohm-scaffold names Tidepool Swellcoach Lineup');
      const r = await names(list, { owner: typeof args.owner === 'string' ? args.owner : undefined });
      return out(r, () => {
        for (const n of r) {
          const gh = Object.entries(n.github).map(([k, v]) => `${k} ${v}`).join('');
          console.log(`${n.name.padEnd(20)} ${Object.entries(n.domains).map(([d, v]) => `${d} ${v}`).join(' · ')}${gh ? ` · github ${gh}` : ''}`);
        }
        console.log('\nfree = no registration found right now; buy the domain before you announce the name.');
      });
    }
    case 'github':
      return out(github(dir, { owner: typeof args.owner === 'string' ? args.owner : undefined, name: typeof args.name === 'string' ? args.name : undefined, visibility: args.public ? 'public' : 'private' }), (r) => {
        console.log(`Created ${r.url} and pushed.`);
        printOverview(r);
      });
    case 'references':
      if (typeof args.app !== 'string') throw new Error('Which app? fohm-scaffold references --app Speak --screen Onboarding --url https://mobbin.com/screens/... --take "..."');
      return out(references(dir, [{ app: args.app, screen: args.screen, url: args.url, take: args.take }]), (r) => console.log(`Added. ${r.references} reference(s) in DESIGN.md.`));
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
    case 'skip':
      if (!arg) throw new Error(`Which step? fohm-scaffold ${cmd} <step>`);
      return out(markDone(dir, arg, typeof args.value === 'string' ? args.value : undefined, cmd === 'undo', cmd === 'skip'), printOverview);
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
