/**
 * Is a name free? For each candidate: the domains (by RDAP, the registries'
 * own lookup: 404 means nobody has it) and, when we know whose GitHub it's
 * going on, the repository name. Answers are hints, not guarantees: buy the
 * domain before announcing the name.
 */
import { execFileSync } from 'node:child_process';

import { slugify } from './options.mjs';

export const TLDS = ['com', 'app', 'co'];
// Overridable for tests.
const RDAP = () => process.env.FOHM_RDAP_URL || 'https://rdap.org';
const GITHUB_API = () => process.env.FOHM_GITHUB_API || 'https://api.github.com';

async function domainFree(domain) {
  try {
    const res = await fetch(`${RDAP()}/domain/${domain}`, { redirect: 'follow', signal: AbortSignal.timeout(8000), headers: { accept: 'application/rdap+json' } });
    if (res.status === 404) return 'free';
    if (res.ok) return 'taken';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

/** The signed-in GitHub account, through the gh CLI, or null. */
export function githubLogin() {
  try {
    return execFileSync('gh', ['api', 'user', '--jq', '.login'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 }).trim() || null;
  } catch {
    return null;
  }
}

async function repoFree(owner, slug) {
  try {
    const res = await fetch(`${GITHUB_API()}/repos/${owner}/${slug}`, { signal: AbortSignal.timeout(8000), headers: { 'user-agent': 'fohm-scaffold' } });
    return res.status === 404 ? 'free' : res.ok ? 'taken' : 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function checkNames(names, { owner } = {}) {
  const who = owner || githubLogin();
  return Promise.all(
    names.map(async (name) => {
      const slug = slugify(name);
      const bare = slug.replace(/-/g, '');
      const domains = Object.fromEntries(await Promise.all(TLDS.map(async (t) => [`${bare}.${t}`, await domainFree(`${bare}.${t}`)])));
      const github = who ? { [`${who}/${slug}`]: await repoFree(who, slug) } : {};
      return { name, slug, domains, github, free: Object.entries(domains).filter(([, v]) => v === 'free').map(([d]) => d) };
    }),
  );
}
