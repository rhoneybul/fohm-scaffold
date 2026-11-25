/**
 * Submit for review, from a Claude session: runs the Expo workflow
 * `.eas/workflows/review.yml` on a clean checkout of the commit, as
 * scripts/release.ts does. The workflow pushes the listing (store.config.json)
 * and runs scripts/app-review.mjs on Expo's servers, where the App Store
 * Connect key is; nothing here ever holds it.
 *
 *   npx tsx scripts/review.ts [x.y.z] [--submit] [--ref <commit>] [--dry-run]
 *
 * The version: the one given, else the last released (the highest release tag
 * or finished iOS store build on Expo). Without --submit, everything is set
 * up and checked, and nothing is sent to Apple's review.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { builtVersions, compareVersions, git, highestTag, inCleanCheckout, tagPrefix } from './release';

const SEMVER = /^\d+\.\d+\.\d+$/;

/** The last version released: the highest of the release tags and Expo's finished iOS store builds. */
export function lastReleased({ tags, prefix, built }: { tags: string[]; prefix: string; built: string[] }): string | null {
  return [highestTag(tags, prefix), ...built.filter((v) => SEMVER.test(v))].filter((v): v is string => Boolean(v)).sort(compareVersions).at(-1) ?? null;
}

/** Reads the command line: the version, --submit, --ref and --dry-run. */
export function parseArgs(argv: string[]) {
  const refAt = argv.indexOf('--ref');
  const ref = refAt >= 0 ? argv[refAt + 1] : 'HEAD';
  const version = argv.find((a, i) => SEMVER.test(a) && argv[i - 1] !== '--ref');
  return { version, ref, submit: argv.includes('--submit'), dryRun: argv.includes('--dry-run') };
}

function main() {
  const appDir = path.resolve(import.meta.dirname, '..');
  const { version: asked, ref, submit, dryRun } = parseArgs(process.argv.slice(2));
  const prefix = tagPrefix();
  const root = git(['rev-parse', '--show-toplevel'], appDir);
  const folder = path.relative(root, appDir) || '.';
  git(['fetch', '--tags', 'origin'], root);
  const commit = git(['rev-parse', `${ref}^{commit}`], root);
  const tags = git(['tag', '-l', `${prefix}v*`], root).split('\n').filter(Boolean);
  const version = asked ?? lastReleased({ tags, prefix, built: builtVersions(appDir, 'ios') });
  if (!version) throw new Error('Nothing released yet: release the iPhone app first (npx tsx scripts/release.ts ios).');
  console.log(`Review ${version}${submit ? ', submitted to Apple' : ', set up and checked, not submitted'}, from ${commit.slice(0, 7)}`);
  if (dryRun) return;

  inCleanCheckout({ root, appDir, folder, commit }, (dir) => {
    const run = spawnSync('npx', ['-y', 'eas-cli@latest', 'workflow:run', '.eas/workflows/review.yml', '-F', `version=${version}`, '-F', `submit=${submit}`, '--non-interactive', '--wait'], { cwd: dir, stdio: 'inherit' });
    if (run.status !== 0) throw new Error('The review workflow stopped: its log says what Apple still needs (`eas workflow:logs`, or the Expo connector\'s workflow_logs).');
  });
  console.log(submit ? `Submitted ${version} for review: Apple usually answers within a day or two.` : `${version} is set up for review. Run again with --submit to send it.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  try {
    main();
  } catch (e) {
    console.error((e as Error).message);
    process.exitCode = 1;
  }
}
