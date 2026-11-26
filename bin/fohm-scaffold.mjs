#!/usr/bin/env node
/**
 * fohm-scaffold new <folder>: copies template/ and fills in the app's values.
 * Everything after that is the skills' (skills/new-app, app-design,
 * app-launch). Asks for anything missing only in a terminal without --yes;
 * with --json, or with no terminal (an agent), it never prompts and prints
 * one JSON object.
 */
import readline from 'node:readline/promises';

import { NEXT, newApp } from '../lib/generate.mjs';
import { QUESTIONS } from '../lib/options.mjs';
import { SCHEMES, pickedScheme, suggestSchemes } from '../lib/schemes.mjs';
import { SHARED_SECRETS, copySecrets, reposFor } from '../lib/secrets.mjs';

const HELP = `fohm-scaffold: make a new app from the template

  new <folder> [--name ..] [--idea ..] [--business ..] [--kind coaching|app|game] [--coach yes|no] [--routes yes|no]
      [--inspiration "Speak, Ahead"] [--tagline ..] [--member-word ..] [--owner-word ..]
      [--operator ..] [--country ..] [--registration ..] [--address ..]
      [--support-email ..] [--domain ..] [--bundle-id ..] [--scheme name] [--accent #hex]
      [--no-git] [--no-install] [--in-repo [no]] [--yes] [--json]

  schemes [--idea ..] [--business ..] [--inspiration ..] [--kind ..] [--count 4] [--json]
      The colour schemes that suit the app best (from what it's about and the apps
      you like), each a whole palette: the accent and the neutrals with it. Pick
      one with new's --scheme; --accent builds one around your own brand colour.
      The schemes: ${SCHEMES.map((s) => s.id).join(', ')}.

  secrets [--repo owner/name[,owner/name]] [--all [--owner name]] [--json]
      Puts the keys every app shares (${SHARED_SECRETS.join(', ')}) on each
      repository's Actions secrets with the GitHub CLI, from this shell's
      environment: this folder's repository, the ones named, or all of them.
      Run it on your own machine, where gh is signed in; nothing goes through a chat.

  Inside a git repository the app is a folder of it: its workflows go to the
  repository's root, scoped to the folder (--in-repo no for a repository of its own).
  Then: ${NEXT}
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
const [cmd, folder] = args._;
const json = !!args.json || !process.stdout.isTTY;
const interactive = !json && process.stdin.isTTY && !args.yes;

async function ask(input) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log('\nLet’s make a new app. Press Enter to take the suggestion in brackets.\n');
  for (const q of QUESTIONS) {
    if (input[q.key]) continue;
    if (q.schemes) {
      if (input.accent) continue;
      input.scheme = await pickScheme(rl, input);
      continue;
    }
    const hint = q.default !== undefined ? q.default || 'blank' : `e.g. ${q.example}`;
    const a = (await rl.question(`${q.ask} [${hint}]: `)).trim();
    if (a) input[q.key] = a;
  }
  rl.close();
}

const swatch = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return process.stdout.hasColors?.() ? `\x1b[48;2;${r};${g};${b}m    \x1b[0m` : '';
};

function printSchemes(list) {
  list.forEach((s, i) => {
    const t = s.tokens;
    console.log(`  ${i + 1}. ${s.name} (${s.id})  ${swatch(t.accent)}${swatch(t.accentSoft)}${swatch(t.bg)}${swatch(t.inkMid)}  ${t.accent} on ${t.bg}`);
    console.log(`     ${s.mood}${s.why ? ` Suggested: ${s.why}.` : ''}`);
  });
}

/** Shows the schemes that suit the app, best first, and takes the one picked by number or name. */
async function pickScheme(rl, input) {
  const list = suggestSchemes(input);
  console.log('\nColour schemes that suit it, best first (the accent, its pale ground, the canvas, the text):');
  printSchemes(list);
  console.log(`  Or any of: ${SCHEMES.map((s) => s.id).join(', ')}; or blank, then your own brand colour.`);
  return pickedScheme(await rl.question(`Which do you like most? [1, ${list[0].id}]: `), list);
}

function schemes() {
  const list = suggestSchemes({ idea: args.idea, business: args.business, inspiration: args.inspiration, kind: args.kind }, Number(args.count) || 4);
  if (json) return console.log(JSON.stringify({ ok: true, schemes: list.map(({ words, apps, ...s }) => s) }, null, 2));
  printSchemes(list);
}

function secrets() {
  const r = copySecrets({ repos: reposFor({ repo: args.repo, all: !!args.all, owner: args.owner }) });
  if (json) return console.log(JSON.stringify(r, null, 2));
  for (const [repo, names] of Object.entries(r.set)) console.log(`${repo}: ${names.join(', ')}`);
  for (const [repo, why] of Object.entries(r.failed)) console.error(`${repo}: not set (${why})`);
  if (r.missing.length) console.log(`Not in this shell, so not set: ${r.missing.join(', ')}`);
  if (!r.ok) process.exitCode = 1;
}

async function main() {
  if (cmd === 'secrets') return secrets();
  if (cmd === 'schemes') return schemes();
  if (cmd !== 'new') {
    if (cmd && cmd !== 'help') process.exitCode = 1;
    return console.log(HELP);
  }
  const input = Object.fromEntries(QUESTIONS.map((q) => [q.key, typeof args[q.key] === 'string' ? args[q.key] : undefined]));
  input.slug = args.slug;
  if (!input.name && folder) input.name = folder.split('/').pop();
  if (interactive) await ask(input);
  const inRepo = args.inRepo === undefined ? undefined : !['no', 'false'].includes(String(args.inRepo).toLowerCase());
  const r = newApp(input, { dir: folder, git: !args.noGit, inRepo, install: !args.noInstall });
  if (json) console.log(JSON.stringify(r, null, 2));
  if (!r.ok) {
    if (!json) console.error(`Can't create it yet:\n  - ${r.errors.join('\n  - ')}`);
    process.exitCode = 1;
    return;
  }
  if (json) return;
  console.log(`\nCreated ${r.options.name} in ${r.dir}: the web app, landing page, dashboard, iOS and Android${r.options.kind === 'game' ? ', with the example game' : ''}.`);
  if (r.repo) console.log(`It's the folder ${r.repo.folder}/ of the repository at ${r.repo.root}; its workflows are ${r.repo.workflows.join(' and ')} there (commit them with the app).`);
  console.log(`\n${NEXT}\n`);
}

main().catch((e) => {
  if (json) console.log(JSON.stringify({ ok: false, error: e.message }));
  else console.error(e.message);
  process.exitCode = 1;
});
