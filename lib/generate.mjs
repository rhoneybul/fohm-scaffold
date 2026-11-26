/**
 * Makes a new app from template/: copies it, then writes the chosen name,
 * words, ids and colour into the few files that hold them.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { briefMarkdown } from './brief.mjs';
import { resolveOptions } from './options.mjs';
import { enclosingRepo, placeInRepo } from './repo.mjs';

export const TEMPLATE = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'template');
const SKIP = new Set(['node_modules', 'dist', '.expo', 'web-build', 'screens']);

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

/**
 * Makes the app in `dir`. Inside an existing git repository (found from the
 * folder's parent, or `inRepo: true` to insist), the app is a folder of it:
 * its workflows go to the repository's root, scoped to the folder, and there's
 * no `git init` (lib/repo.mjs). `inRepo: false` makes it a repository of its own
 * wherever it is. `install` runs npm install in it last. Returns the folder,
 * and where it sits in the repository when it's a folder of one.
 */
export function generate(dir, o, { git = true, inRepo, install = false, brief } = {}) {
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
  // The App Store listing (eas metadata:push): what the answers know; the rest stays "TO FILL" until the agent writes it from PRODUCT.md.
  editJson(target, 'store.config.json', (j) => {
    const a = j.apple;
    const info = a.info['en-US'];
    a.copyright = `${new Date().getFullYear()} ${o.operator}`;
    Object.assign(info, { title: o.name.slice(0, 30), promoText: o.tagline.slice(0, 170), marketingUrl: apiUrl, supportUrl: apiUrl, privacyPolicyUrl: `${apiUrl}/privacy` });
    if (o.tagline.length <= 30) info.subtitle = o.tagline;
    if (o.kind === 'game') a.categories = [['GAMES', 'GAMES_CASUAL'], 'ENTERTAINMENT'];
    a.advisory.messagingAndChat = o.coach !== false;
    a.review.email = o.supportEmail;
    return j;
  });
  editJson(target, 'package.json', (j) => ({ ...j, name: o.slug }));
  // The template's share card shows the template's name: a new app renders its own with `npm run og` (scripts/seo.ts uses the hero photo until then).
  fs.rmSync(path.join(target, 'public', 'og.png'), { force: true });
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
      .replace(/kind: '.*?' as/, () => `kind: ${q(o.kind)} as`)
      .replace(/^  coach: (true|false),$/m, () => `  coach: ${o.coach !== false},`)
      .replace(/^  routes: (true|false),$/m, () => `  routes: ${o.routes === true},`),
  );
  // The colour scheme, whole: the accent and the neutrals that go with it (lib/schemes.mjs).
  edit(target, 'src/lib/theme.ts', (s) =>
    Object.entries(o.colours).reduce((t, [k, v]) => t.replace(new RegExp(`^(  ${k}: )'#[0-9A-Fa-f]{6}',$`, 'm'), (_, head) => `${head}'${v}',`), s),
  );
  edit(target, 'DESIGN.md', (s) =>
    s
      .replace("(`C.bg`, `#F2F2F6`): every screen's ground, a cool grouped-list grey,", () => `(\`C.bg\`, \`${o.colours.bg}\`): every screen's ground, a ${o.schemeGround},`)
      .replace("Etapa's light palette's structure, with the brand's accent.", () => `Etapa's light palette's structure, in the ${o.schemeName} scheme (\`${o.scheme}\`, picked when the app was made): ${o.schemeMood}`),
  );
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
      () =>
        `${o.name} is ${o.kind === 'game' ? 'a game' : 'an app'} for ${o.memberWord}s, run by ${o.operator}; on screen, people are "${o.memberWord}s" and the ${o.coach === false ? 'people who run it are' : 'person who runs it is'} the "${o.ownerWord}".${o.coach === false ? ' There is no coach: no coach is shown or offered to members, and the app speaks as itself (`APP.coach` is false).' : ''} ${o.tagline}`,
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
  // Made from the app builder: its brief is discovery's, already answered (skills/new-app, step 1).
  if (brief?.brief) fs.writeFileSync(path.join(target, 'docs', 'BRIEF.md'), briefMarkdown(brief, o));
  if (o.idea) edit(target, 'docs/RESEARCH.md', (s) => s.replace('## The one-line thesis\n', () => `## The one-line thesis\n\n${o.idea}\n`));

  let repo = null;
  if (root) repo = placeInRepo(target, root, o.slug);
  else if (git) {
    try {
      execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: target });
      execFileSync('git', ['add', '-A'], { cwd: target });
      execFileSync('git', ['-c', 'user.name=fohm-scaffold', '-c', 'user.email=scaffold@localhost', 'commit', '-q', '-m', `Create ${o.name} with fohm-scaffold`], { cwd: target });
    } catch {
      // No git: the app is still made; the app-launch skill's github.md says what to do.
    }
  }
  if (install) execFileSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: target, stdio: ['ignore', 2, 2] });
  return { dir: target, repo };
}

/**
 * Resolves the answers and makes the app: `{ ok: true, dir, options, repo }`,
 * or `{ ok: false, errors }` when an answer is wrong.
 */
export function newApp(input, { dir, git = true, inRepo, install = false, brief } = {}) {
  const r = resolveOptions(input);
  if (r.errors) return { ok: false, errors: r.errors };
  const made = generate(dir || r.options.slug, r.options, { git, inRepo, install, brief });
  const next = brief?.brief ? NEXT_FROM_BRIEF : NEXT;
  return { ok: true, dir: made.dir, options: r.options, ...(made.repo ? { repo: made.repo } : {}), ...(brief?.brief ? { brief: 'docs/BRIEF.md' } : {}), next };
}

/** What to do once it's made. */
export const NEXT = 'Open this folder in Claude Code and run the new-app skill.';
export const NEXT_FROM_BRIEF = 'Open this folder in Claude Code and run the new-app skill: it carries on from docs/BRIEF.md, asking only what the app builder left open.';
