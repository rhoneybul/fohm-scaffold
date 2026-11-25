/**
 * fohm-scaffold secrets: puts the keys every app shares (accounts.md in the
 * app-launch skill) on each repository's Actions secrets with the GitHub CLI,
 * so a personal account with no organisation sets them in one go.
 *
 * Runs on the person's own machine, where `gh` is signed in and the values
 * are in the shell's environment (exported once, or from a password manager:
 * `op run -- npx github:rhoneybul/fohm-scaffold secrets --all`). Each value
 * goes to `gh` on its standard input, never on a command line or in a log.
 * A Claude session can't run it: its keys live in the proxy, out of reach.
 */
import { execFileSync } from 'node:child_process';

/** The Actions secrets an app made from the template reads (Publish and Set up app). */
export const SHARED_SECRETS = [
  'EXPO_TOKEN',
  'REPO_ADMIN_TOKEN',
  'SUPABASE_ACCESS_TOKEN',
  'VERCEL_TOKEN',
  'FIREBASE_SERVICE_ACCOUNT',
  'PLAY_SERVICE_ACCOUNT_JSON',
];

/** Runs `gh` with its arguments, the value (if any) on its standard input. */
export const runGh = (args, input) => execFileSync('gh', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });

/** The repositories to set: those named, every one the owner has, or this folder's origin. */
export function reposFor({ repo, all, owner }, gh = runGh) {
  if (repo) return [].concat(repo).flatMap((r) => String(r).split(',')).map((r) => r.trim()).filter(Boolean);
  if (all) {
    const who = owner || gh(['api', 'user', '--jq', '.login']).trim();
    return gh(['repo', 'list', who, '--limit', '500', '--no-archived', '--json', 'nameWithOwner', '--jq', '.[].nameWithOwner']).split('\n').map((s) => s.trim()).filter(Boolean);
  }
  const origin = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
  const m = origin.match(/github\.com[:/](.+?)(\.git)?$/);
  if (!m) throw new Error('No GitHub origin here: name the repository with --repo owner/name, or use --all.');
  return [m[1]];
}

/**
 * Sets each named secret that has a value in `env` on each repository.
 * Returns, per repository, the names set; a repository that refuses (no
 * admin rights, archived) is reported and the rest carry on.
 */
export function copySecrets({ repos, env = process.env, names = SHARED_SECRETS }, gh = runGh) {
  const present = names.filter((n) => env[n]);
  if (!present.length) throw new Error(`None of ${names.join(', ')} is in this shell's environment: export them first (never paste them into a chat).`);
  const result = { ok: true, set: {}, failed: {}, missing: names.filter((n) => !env[n]) };
  for (const repo of repos) {
    try {
      for (const name of present) gh(['secret', 'set', name, '--repo', repo], env[name]);
      result.set[repo] = present;
    } catch (e) {
      result.failed[repo] = String(e.stderr || e.message).trim().split('\n')[0];
      result.ok = false;
    }
  }
  return result;
}
