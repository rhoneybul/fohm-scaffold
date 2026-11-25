/**
 * Release: builds the store apps on Expo's servers from a clean checkout of
 * a commit and sends them to TestFlight and Google Play's internal track,
 * through the Expo workflow `.eas/workflows/publish.yml`. Nothing runs on
 * GitHub and no repository holds an Expo token: an agent runs this in a
 * Claude session whose environment holds the token (its proxy puts it on
 * each request to api.expo.dev), or anyone runs it where they're signed in
 * to Expo (`eas login`).
 *
 *   npx tsx scripts/release.ts [ios|android|all] [patch|minor|major|none|x.y.z] [--build-only] [--ref <commit>] [--dry-run]
 *
 * The version: the highest release tag (`<prefix>v1.2.0`, the prefix `app-`
 * or RELEASE_TAG_PREFIX, which an app inside another repository sets to its
 * own) or app.json's, whichever is higher, bumped. It is set in the clean
 * checkout only, so app.json on main keeps its number and the tags are the
 * record (Naz's and Etapa's way). The commit is tagged and the tag pushed
 * once the run succeeds, so a version is never built twice and a failed
 * run leaves nothing behind. Expo's finished store builds count too, so a
 * tag that couldn't be pushed never lets a version go round again. Build numbers are EAS's own.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { bumped } from './bump-app-version';

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

/** Compares two x.y.z versions. */
export const compareVersions = (a: string, b: string) => {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
};

/** The highest x.y.z among the tags with this prefix, or null. */
export function highestTag(tags: string[], prefix: string): string | null {
  const versions = tags.filter((t) => t.startsWith(`${prefix}v`)).map((t) => t.slice(prefix.length + 1)).filter((v) => SEMVER.test(v));
  return versions.sort(compareVersions).at(-1) ?? null;
}

/** The version to build: the highest of the last tag, the last store build and app.json's, bumped; never one already released. */
export function nextVersion({ tags, prefix, appVersion, bump, built = [] }: { tags: string[]; prefix: string; appVersion: string; bump: string; built?: string[] }): string {
  const last = [highestTag(tags, prefix), ...built.filter((v) => SEMVER.test(v))].filter((v): v is string => Boolean(v)).sort(compareVersions).at(-1) ?? null;
  const baseline = last && compareVersions(last, appVersion) > 0 ? last : appVersion;
  const next = bumped(baseline, bump);
  if (tags.includes(`${prefix}v${next}`) || built.includes(next)) throw new Error(`${prefix}v${next} is built already: release with a bigger bump.`);
  if (last && compareVersions(next, last) <= 0) throw new Error(`${next} isn't above the last release, ${last}: release with a bigger bump.`);
  return next;
}

/** Reads the command line: the platform, the bump, and the flags. */
export function parseArgs(argv: string[]) {
  const words = argv.filter((a) => !a.startsWith('--'));
  const refAt = argv.indexOf('--ref');
  const ref = refAt >= 0 ? argv[refAt + 1] : 'HEAD';
  const rest = words.filter((w) => w !== ref);
  const platform = rest.find((w) => ['ios', 'android', 'all'].includes(w)) ?? 'ios';
  const bump = rest.find((w) => ['patch', 'minor', 'major', 'none'].includes(w) || SEMVER.test(w)) ?? 'patch';
  return { platform, bump, ref, submit: !argv.includes('--build-only'), dryRun: argv.includes('--dry-run') };
}

const git = (args: string[], cwd: string) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

/** The versions of the app's finished store builds on Expo: the record when a tag couldn't be pushed. */
function builtVersions(dir: string): string[] {
  try {
    const out = execFileSync('npx', ['-y', 'eas-cli@latest', 'build:list', '--status', 'finished', '--distribution', 'store', '--limit', '20', '--json', '--non-interactive'], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return (JSON.parse(out) as { appVersion?: string }[]).map((b) => b.appVersion ?? '').filter(Boolean);
  } catch {
    return [];
  }
}

function main() {
  const appDir = path.resolve(import.meta.dirname, '..');
  const { platform, bump, ref, submit, dryRun } = parseArgs(process.argv.slice(2));
  const prefix = process.env.RELEASE_TAG_PREFIX ?? 'app-';
  const root = git(['rev-parse', '--show-toplevel'], appDir);
  const folder = path.relative(root, appDir) || '.';

  git(['fetch', '--tags', 'origin'], root);
  const commit = git(['rev-parse', `${ref}^{commit}`], root);
  const tags = git(['tag', '-l', `${prefix}v*`], root).split('\n').filter(Boolean);
  const appJson = JSON.parse(git(['show', `${commit}:${folder === '.' ? '' : `${folder}/`}app.json`], root));
  const version = nextVersion({ tags, prefix, appVersion: appJson.expo.version, bump, built: builtVersions(appDir) });
  console.log(`Release ${version}: ${platform}${submit ? ', to the stores' : ', build only'}, from ${commit.slice(0, 7)}`);
  if (dryRun) return;

  // A clean checkout of the commit, so what's built is exactly what's tagged.
  const checkout = fs.mkdtempSync(path.join(os.tmpdir(), 'release-'));
  git(['worktree', 'add', '--detach', checkout, commit], root);
  try {
    const dir = path.join(checkout, folder);
    // eas-cli reads the app's config with the app's own packages: lend it the installed ones.
    if (fs.existsSync(path.join(appDir, 'node_modules'))) fs.symlinkSync(path.join(appDir, 'node_modules'), path.join(dir, 'node_modules'), 'dir');
    const file = path.join(dir, 'app.json');
    fs.writeFileSync(file, JSON.stringify({ ...appJson, expo: { ...appJson.expo, version } }, null, 2) + '\n');
    const run = spawnSync('npx', ['-y', 'eas-cli@latest', 'workflow:run', '.eas/workflows/publish.yml', '-F', `platform=${platform}`, '-F', `submit=${submit}`, '--non-interactive', '--wait'], { cwd: dir, stdio: 'inherit' });
    if (run.status !== 0) throw new Error('The Expo workflow failed: nothing was tagged. Its logs: `eas workflow:logs`, or the Expo connector (build_logs).');
  } finally {
    git(['worktree', 'remove', '--force', checkout], root);
  }

  const tag = `${prefix}v${version}`;
  git(['tag', tag, commit], root);
  try {
    git(['push', 'origin', tag], root);
    console.log(`Released ${version}: tagged ${tag}.`);
  } catch {
    // A Claude session may push only its own branch; Expo's build list is the record then.
    console.log(`Released ${version}. The tag ${tag} couldn't be pushed from here (push it with \`git push origin ${tag}\`); the next release reads the version from Expo's builds anyway.`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  try {
    main();
  } catch (e) {
    console.error((e as Error).message);
    process.exitCode = 1;
  }
}
