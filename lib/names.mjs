/**
 * Is a name free? For each candidate: the domains (by RDAP, the registries'
 * own lookup: 404 means nobody has it) and, when we know whose GitHub it's
 * going on, the repository name. Answers are hints, not guarantees: buy the
 * domain before announcing the name.
 *
 * Node's fetch ignores HTTPS_PROXY, so behind a proxy (a cloud session, a
 * company network) every lookup used to fail and come back a silent
 * "unknown". Now a lookup goes through the proxy: undici's ProxyAgent when
 * undici can be imported, else curl, which honours the proxy variables
 * itself. One that still can't be made says why, and where to check instead.
 */
import { execFile, execFileSync } from 'node:child_process';

import { slugify } from './options.mjs';

export const TLDS = ['com', 'app', 'co'];
// Overridable for tests.
const RDAP = () => process.env.FOHM_RDAP_URL || 'https://rdap.org';
const GITHUB_API = () => process.env.FOHM_GITHUB_API || 'https://api.github.com';
const TIMEOUT_MS = 8000;

/** Where to check when this machine can't: said in the output, and in the domain step. */
export const CHECK_ELSEWHERE =
  'Some names couldn’t be checked from here. Your agent can check them with Vercel’s domain tools (get_bulk_availability, through Claude’s Vercel connector), or look them up at a registrar.';

/** The proxy a request to `url` should go through, from the environment (NO_PROXY respected), or null. */
export function proxyFor(url, env = process.env) {
  const { protocol, hostname } = new URL(url);
  const proxy = protocol === 'https:' ? env.HTTPS_PROXY || env.https_proxy : env.HTTP_PROXY || env.http_proxy;
  if (!proxy) return null;
  const skip = (env.NO_PROXY || env.no_proxy || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  const host = hostname.toLowerCase();
  const bypass = skip.some((s) => s === '*' || host === s.replace(/^\*?\./, '') || host.endsWith(s.startsWith('.') ? s : s.startsWith('*.') ? s.slice(1) : `.${s}`));
  return bypass ? null : proxy;
}

/** undici's ProxyAgent, set as fetch's dispatcher once, when undici can be imported. */
let proxied;
async function undiciThrough(proxy) {
  if (proxied === undefined) {
    try {
      const { ProxyAgent, setGlobalDispatcher } = await import('undici');
      setGlobalDispatcher(new ProxyAgent(proxy));
      proxied = true;
    } catch {
      proxied = false;
    }
  }
  return proxied;
}

/** A GET through curl: its status code, or why it couldn't be made. curl reads the proxy variables itself. */
export function curlStatus(url, headers = {}) {
  const args = ['-sS', '-L', '-o', '/dev/null', '-w', '%{http_code}', '--max-time', String(TIMEOUT_MS / 1000), ...Object.entries(headers).flatMap(([k, v]) => ['-H', `${k}: ${v}`]), url];
  return new Promise((resolve) =>
    execFile('curl', args, { timeout: TIMEOUT_MS + 2000 }, (e, stdout, stderr) => {
      const host = new URL(url).hostname;
      if (!e) return resolve({ status: Number(stdout.trim()) });
      if (e.code === 'ENOENT') return resolve({ error: `there’s no curl here to go through the proxy to ${host}` });
      if (/CONNECT tunnel failed|response 40[37]/i.test(stderr)) return resolve({ error: `the network refused ${host}` });
      if (/timed out/i.test(stderr) || e.code === 28) return resolve({ error: `${host} didn’t answer in time` });
      return resolve({ error: `the network couldn’t reach ${host}` });
    }),
  );
}

/**
 * A GET's status code, or why it couldn't be made. `via` swaps the parts
 * that reach the network (tests): `env`, `fetch`, `curl`, `undici`.
 */
export async function lookup(url, headers = {}, via = {}) {
  const env = via.env ?? process.env;
  const host = new URL(url).hostname;
  const proxy = proxyFor(url, env);
  const useUndici = via.undici ?? undiciThrough;
  if (proxy && !(await useUndici(proxy))) return (via.curl ?? curlStatus)(url, headers);
  try {
    const res = await (via.fetch ?? fetch)(url, { redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS), headers });
    return { status: res.status };
  } catch (e) {
    return { error: e?.name === 'TimeoutError' ? `${host} didn’t answer in time` : `the network couldn’t reach ${host}` };
  }
}

/** free, taken, or "couldn't check: <why>". */
const verdict = (r, host) => (r.error ? `couldn’t check: ${r.error}` : r.status === 404 ? 'free' : r.status >= 200 && r.status < 400 ? 'taken' : `couldn’t check: ${host} answered ${r.status}`);

const domainFree = async (domain, via) => {
  const url = `${RDAP()}/domain/${domain}`;
  return verdict(await lookup(url, { accept: 'application/rdap+json' }, via), new URL(url).hostname);
};

const repoFree = async (owner, slug, via) => {
  const url = `${GITHUB_API()}/repos/${owner}/${slug}`;
  return verdict(await lookup(url, { 'user-agent': 'fohm-scaffold' }, via), new URL(url).hostname);
};

/** The signed-in GitHub account, through the gh CLI, or null. */
export function githubLogin() {
  try {
    return execFileSync('gh', ['api', 'user', '--jq', '.login'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000 }).trim() || null;
  } catch {
    return null;
  }
}

/**
 * Each name's domains and repository, free or taken; one that couldn't be
 * checked says why, and `checkWith` says where to check it instead.
 */
export async function checkNames(names, { owner, via } = {}) {
  const who = owner || githubLogin();
  return Promise.all(
    names.map(async (name) => {
      const slug = slugify(name);
      const bare = slug.replace(/-/g, '');
      const domains = Object.fromEntries(await Promise.all(TLDS.map(async (t) => [`${bare}.${t}`, await domainFree(`${bare}.${t}`, via)])));
      const github = who ? { [`${who}/${slug}`]: await repoFree(who, slug, via) } : {};
      const unchecked = Object.entries(domains)
        .filter(([, v]) => v.startsWith('couldn’t check'))
        .map(([d]) => d);
      return {
        name,
        slug,
        domains,
        github,
        free: Object.entries(domains)
          .filter(([, v]) => v === 'free')
          .map(([d]) => d),
        ...(unchecked.length ? { unchecked, checkWith: CHECK_ELSEWHERE } : {}),
      };
    }),
  );
}
