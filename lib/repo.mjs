/**
 * An app made inside a repository that already exists (a folder beside a
 * game, a site, another app). GitHub runs workflows only from the
 * repository's root, so the template's two workflows go there, scoped to the
 * app's folder: run in it, triggered only by changes to it, caching from its
 * lockfile. The smoke workflow runs by hand, because another project in the
 * same repository deploys too, and a bare deployment_status trigger would
 * fire for both. The repository is the existing one: no `git init`.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** The root of the git repository a folder would sit in (the nearest existing folder up from it), or null. */
export function enclosingRepo(dir) {
  let at = path.resolve(dir);
  while (!fs.existsSync(at)) at = path.dirname(at);
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: at, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}

/** The folder's path from the repository's root, with forward slashes (what GitHub and Vercel want). */
export const folderIn = (root, dir) => path.relative(fs.realpathSync(root), path.resolve(dir)).split(path.sep).join('/');

const DEFAULTS = (folder) => `defaults:\n  run:\n    working-directory: ${folder}\n\n`;

/** The template's test workflow, scoped to `folder` and named for it. */
export function scopedTestWorkflow(text, folder, file) {
  const paths = `\n    paths: ['${folder}/**', '.github/workflows/${file}']`;
  return text
    .replace(/^# Typecheck and every test, on each pull request and each push to main, against\n/m, `# The app in ${folder}/ (made with fohm-scaffold): typecheck and every test, on\n# each pull request and push to main that touches it, against\n`)
    .replace(/^name: Tests$/m, 'name: App tests')
    .replace(/^on:\n  pull_request:\n  push:\n    branches: \[main\]\n/m, `on:\n  pull_request:${paths}\n  push:\n    branches: [main]${paths}\n`)
    .replace(/^jobs:\n/m, `${DEFAULTS(folder)}jobs:\n`)
    .replace(/^  test:\n    runs-on/m, '  test:\n    name: App tests\n    runs-on')
    .replace(/cache: npm\n/, `cache: npm\n          cache-dependency-path: ${folder}/package-lock.json\n`);
}

/** The template's smoke workflow, scoped to `folder`, run by hand, against `APP_SMOKE_URL`. */
export function scopedSmokeWorkflow(text, folder) {
  return [
    `# Smoke tests for the app in ${folder}/ against its live site: /api/health is up`,
    '# with its database, the web app and its pages load, and member data still',
    '# needs a sign-in (tests/smoke/). It only reads. Run by hand from the Actions',
    '# tab (Run workflow) after a deploy: another project in this repository',
    '# deploys too, so a bare deployment_status trigger would fire for both. Once',
    '# the app has its own Vercel project, it can follow that project’s deploys.',
    'name: App smoke',
    '',
    'on:',
    '  workflow_dispatch:',
    '',
    DEFAULTS(folder) + 'jobs:',
    '  smoke:',
    "    if: vars.APP_SMOKE_URL != ''",
    '    runs-on: ubuntu-latest',
    '    timeout-minutes: 10',
    '    steps:',
    ...text
      .slice(text.indexOf('      - uses: actions/checkout'))
      .replace(/cache: npm\n/, `cache: npm\n          cache-dependency-path: ${folder}/package-lock.json\n`)
      .replace('${{ vars.SMOKE_URL }}', '${{ vars.APP_SMOKE_URL }}')
      .replace(/\n\s*SMOKE_COMMIT: .*$/m, '')
      .trimEnd()
      .split('\n'),
  ].join('\n') + '\n';
}

/** A workflow file name at the root that isn't taken: app-test.yml, else <slug>-test.yml. */
function freeName(dir, base, slug) {
  return fs.existsSync(path.join(dir, `app-${base}.yml`)) ? `${slug}-${base}.yml` : `app-${base}.yml`;
}

/**
 * Moves the app's workflows to the repository's root, scoped to its folder,
 * and points its AGENTS.md at them. Returns where they went.
 */
export function placeInRepo(target, root, slug) {
  const folder = folderIn(root, target);
  const from = path.join(target, '.github', 'workflows');
  const to = path.join(root, '.github', 'workflows');
  fs.mkdirSync(to, { recursive: true });
  const test = freeName(to, 'test', slug);
  const smoke = freeName(to, 'smoke', slug);
  fs.writeFileSync(path.join(to, test), scopedTestWorkflow(fs.readFileSync(path.join(from, 'test.yml'), 'utf8'), folder, test));
  fs.writeFileSync(path.join(to, smoke), scopedSmokeWorkflow(fs.readFileSync(path.join(from, 'smoke.yml'), 'utf8'), folder));
  fs.rmSync(path.join(target, '.github'), { recursive: true, force: true });
  const agents = path.join(target, 'AGENTS.md');
  fs.writeFileSync(
    agents,
    fs
      .readFileSync(agents, 'utf8')
      .replaceAll('(`.github/workflows/test.yml`)', `(\`.github/workflows/${test}\` at the repository's root)`)
      .replace('and the Smoke workflow then checks the live site.', `once the app has its own Vercel project, root directory \`${folder}\`; then App smoke (\`.github/workflows/${smoke}\`, run by hand) checks the live site.`),
  );
  return { root, folder, workflows: [`.github/workflows/${test}`, `.github/workflows/${smoke}`] };
}
