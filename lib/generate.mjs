/**
 * Makes a new app from template/: copies it, then writes the chosen name,
 * words, ids and colour into the few files that hold them.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { enclosingRepo, placeInRepo } from './repo.mjs';
import { initialState, saveState } from './state.mjs';

export const TEMPLATE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'template');
const SKIP = new Set(['node_modules', 'dist', '.expo', '.fohm', 'web-build']);

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const a = path.join(from, e.name);
    const b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

const edit = (dir, file, fn) => {
  const p = path.join(dir, file);
  fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8')));
};
// Every replacement below that carries an answer is a function, so what people
// typed is never read as a pattern ($& or $1 would otherwise pull in the match).
const editJson = (dir, file, fn) => edit(dir, file, (s) => JSON.stringify(fn(JSON.parse(s)), null, 2) + '\n');
const q = (s) => `'${String(s).replace(/'/g, '’')}'`;

/** A pale tint of the accent for soft backgrounds. */
function soften(hex) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(c + (255 - c) * 0.85);
  return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => mix(c).toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Makes the app in `dir`. Inside an existing git repository (found from the
 * folder's parent, or `inRepo: true` to insist), the app is a folder of it:
 * its workflows go to the repository's root, scoped to the folder, and there's
 * no `git init` (lib/repo.mjs). `inRepo: false` makes it a repository of its own
 * wherever it is.
 */
export function generate(dir, o, { git = true, inRepo } = {}) {
  const target = path.resolve(dir);
  if (fs.existsSync(target) && fs.readdirSync(target).length) throw new Error(`${target} already exists and isn't empty. Pick a new folder.`);
  const root = inRepo === false ? null : enclosingRepo(path.dirname(target));
  if (inRepo && !root) throw new Error(`--in-repo, but ${path.dirname(target)} isn't in a git repository.`);
  copyDir(TEMPLATE, target);
  const cap = (w) => w[0].toUpperCase() + w.slice(1);
  const apiUrl = o.domain ? `https://${o.domain}` : `https://${o.slug}.vercel.app`;

  editJson(target, 'app.json', (j) => {
    const e = j.expo;
    Object.assign(e, { name: o.name, slug: o.slug, scheme: o.slug.replace(/-/g, '') });
    e.ios.bundleIdentifier = o.bundleId;
    e.android.package = o.bundleId;
    Object.assign(e.web, { name: o.name, shortName: o.name.slice(0, 12) });
    e.extra.apiUrl = apiUrl;
    return j;
  });
  editJson(target, 'package.json', (j) => ({ ...j, name: o.slug }));
  if (fs.existsSync(path.join(target, 'package-lock.json')))
    editJson(target, 'package-lock.json', (j) => {
      j.name = o.slug;
      if (j.packages?.['']) j.packages[''].name = o.slug;
      return j;
    });
  edit(target, 'src/lib/brand.ts', (s) =>
    s
      .replace(/name: '.*?',/, () => `name: ${q(o.name)},`)
      .replace(/tagline: '.*?',/, () => `tagline: ${q(o.tagline)},`)
      .replace(/memberWord: '.*?',/, () => `memberWord: ${q(o.memberWord)},`)
      .replace(/ownerWord: '.*?',/, () => `ownerWord: ${q(o.ownerWord)},`)
      .replace(/operator: '.*?',/, () => `operator: ${q(o.operator)},`)
      .replace(/registration: '.*?',/, () => `registration: ${q(o.registration)},`)
      .replace(/supportEmail: '.*?',/, () => `supportEmail: ${q(o.supportEmail)},`)
      .replace(/kind: '.*?' as/, () => `kind: ${q(o.kind)} as`),
  );
  edit(target, 'src/lib/theme.ts', (s) => s.replace("accent: '#2F6B4F'", `accent: '${o.accent.toUpperCase()}'`).replace("accentSoft: '#E3EFE8'", `accentSoft: '${soften(o.accent)}'`));
  edit(target, 'api/_lib/app.ts', (s) =>
    s
      .replace("APP_NAME = 'Starter'", () => `APP_NAME = ${q(o.name)}`)
      .replace("ACCENT = '#2F6B4F'", () => `ACCENT = '${o.accent.toUpperCase()}'`)
      .replace("BUNDLE_ID = 'com.example.starter'", () => `BUNDLE_ID = ${q(o.bundleId)}`),
  );
  // Supabase's sign-up and password emails, to paste into its dashboard: in the app's name and accent.
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  for (const f of fs.readdirSync(path.join(target, 'supabase/templates')))
    edit(target, `supabase/templates/${f}`, (s) => s.replaceAll('Starter', () => esc(o.name)).replaceAll('#2F6B4F', () => o.accent.toUpperCase()));
  edit(target, 'src/lib/backend.ts', (s) => s.replaceAll("'starter:", `'${o.slug}:`));
  edit(target, 'supabase/config.toml', (s) => s.replace(/project_id = ".*"/, `project_id = "${o.slug}"`));
  edit(target, '.github/workflows/test.yml', (s) => s.replace('supabase_db_starter', `supabase_db_${o.slug}`));
  edit(target, 'README.md', (s) => s.replace(/^# Starter\n/, () => `# ${o.name}\n`));
  edit(target, 'AGENTS.md', (s) =>
    s.replace(
      'Replace this first paragraph with one sentence on what\nyour app is and who it is for.',
      () => `${o.name} is ${o.kind === 'game' ? 'a game' : 'an app'} for ${o.memberWord}s, run by ${o.operator}; on screen, people are "${o.memberWord}s" and the person who runs it is the "${o.ownerWord}". ${o.tagline}`,
    ),
  );
  edit(target, 'PRODUCT.md', (s) =>
    s
      .replace(
        /## The thesis\n\n[\s\S]*?\n\n## Platform/,
        () => `## The thesis\n\n${o.idea || 'One line: what this app does for people, and why this business is the one to make it.'}${o.business ? `\n\nThe business: ${o.business}` : ''}\n\n## Platform`,
      )
      .replace('- **Members (primary):**', () => `- **${cap(o.memberWord)}s (primary):**`)
      .replace('- **The owner:**', () => `- **The ${o.ownerWord}:**`)
      .replace('Web (Expo / React Native Web on Vercel), used on phones and laptops in the browser.', () => `${o.kind === 'game' ? 'A game' : 'An app'} on the web (Vercel), iOS and Android (Expo / EAS), from one codebase. Landing page at ${o.domain || 'its domain'}; the ${o.ownerWord}'s dashboard at /admin.`),
  );

  if (o.inspiration)
    edit(target, 'DESIGN.md', (s) =>
      s.replace(
        '<!-- fohm:references -->',
        () => `Apps the owner likes: ${o.inspiration}. Find their screens on Mobbin (onboarding, home, progress, paywall) and add them below with what to take from each.\n\n<!-- fohm:references -->`,
      ),
    );
  if (o.idea) edit(target, 'docs/RESEARCH.md', (s) => s.replace('## The one-line thesis\n', () => `## The one-line thesis\n\n${o.idea}\n`));

  const state = initialState(o);
  if (root) {
    // Where it sits in the repository; not the repository's absolute path, which is this machine's.
    const { folder, workflows } = placeInRepo(target, root, o.slug);
    state.values.repo = { folder, workflows };
    saveState(target, state);
    return target;
  }
  saveState(target, state);
  if (git) {
    try {
      execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: target });
      execFileSync('git', ['add', '-A'], { cwd: target });
      execFileSync('git', ['-c', 'user.name=fohm-scaffold', '-c', 'user.email=scaffold@localhost', 'commit', '-q', '-m', `Create ${o.name} with fohm-scaffold`], { cwd: target });
    } catch {
      // No git: the app is still made; the github step says what to do.
    }
  }
  return target;
}
