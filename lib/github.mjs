/**
 * Creates the app's GitHub repository and pushes it, through the gh CLI
 * (https://cli.github.com, signed in with `gh auth login`). Private unless
 * asked otherwise. An agent with GitHub tools of its own can create the
 * repository itself and then run `git remote add origin ... && git push -u origin main`.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';

import { loadState, saveState } from './state.mjs';

const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 }).trim();

export function createGithubRepo(dir, { name, owner, visibility = 'private' } = {}) {
  const target = path.resolve(dir);
  const state = loadState(target);
  try {
    run('gh', ['--version'], target);
  } catch {
    throw new Error('The GitHub CLI (gh) isn’t installed. Install it from https://cli.github.com and run `gh auth login`, or create the repository on github.com and push to it (the github step says how).');
  }
  try {
    run('gh', ['auth', 'status'], target);
  } catch {
    throw new Error('gh isn’t signed in. Run `gh auth login`, then try again.');
  }
  try {
    run('git', ['remote', 'get-url', 'origin'], target);
    throw new Error('This app already has a git remote called origin.');
  } catch (e) {
    if (e.message.includes('already has')) throw e;
  }
  const repo = owner ? `${owner}/${name || state.options.slug}` : name || state.options.slug;
  if (!['private', 'public', 'internal'].includes(visibility)) throw new Error('visibility is private, public or internal');
  run('gh', ['repo', 'create', repo, `--${visibility}`, '--source', target, '--remote', 'origin', '--push', '--description', state.options.tagline], target);
  const url = run('git', ['remote', 'get-url', 'origin'], target);
  state.steps.github = { done: true, at: new Date().toISOString() };
  state.values.github = url;
  saveState(target, state);
  return { url };
}
