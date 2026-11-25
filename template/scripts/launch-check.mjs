#!/usr/bin/env node
/**
 * Launch check: every key, account and setting the app needs to be live on
 * the web and in the stores, each done or missing, with the fix for each
 * missing one in a line and the app-launch skill's reference file that has
 * the detail. Run it first and after every launch step (`npm run
 * launch:check`, `--json` for machines); it exits 1 while a required item
 * is missing.
 *
 * It only reads, and it reads names, flags, statuses and dates, never a
 * secret's value: Vercel's variable names, Expo's variable names and
 * visibility, whether Supabase holds Google's secret (a boolean), whether
 * credentials exist and when they expire. Nothing read is printed but what
 * each item says. A service whose token isn't set is "not checked".
 *
 *   github    the ruleset on main and the merge buttons       REPO_ADMIN_TOKEN
 *   supabase  the project, sign-in URLs, Google and Apple      SUPABASE_ACCESS_TOKEN
 *   vercel    the project, its variables, the shared ones      VERCEL_TOKEN
 *   live site /api/health: the database and the integrations   (none)
 *   expo      the project, iOS and Android credentials, the    EXPO_TOKEN
 *             account's App Store Connect variables
 *   app store eas.json, store.config.json, the screenshots      (none)
 *   google    APP.google's client IDs and the iOS URL scheme   (none)
 *   build     the capabilities in the provisioning profile     (none)
 *
 * Same environment as Set up app (scripts/setup-app.mjs): APP_DIR,
 * APP_FOLDER, SITE_URL, VERCEL_TEAM, VERCEL_PROJECT, SUPABASE_PROJECT_REF,
 * GITHUB_REPOSITORY, and in a Claude session each token set to
 * `proxy-injected` with NODE_USE_ENV_PROXY=1 and NODE_EXTRA_CA_CERTS.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { api, appFrom, redirectUrls } from './setup-app.mjs';

export const DONE = 'done';
export const MISSING = 'missing';
export const NOT_CHECKED = 'not checked';
export const OFF = 'optional, off';

const SB = 'https://api.supabase.com/v1';
const VC = 'https://api.vercel.com';
const EXPO = 'https://api.expo.dev/graphql';
const DAY = 86_400_000;
/** Credentials that expire within this many days are flagged for renewal. */
export const RENEW_WITHIN_DAYS = 30;

/** One line of the checklist. `required` items missing fail the check; the rest are reported only. */
const item = (group, name, status, { detail = '', fix = '', ref = '', required = true, warn = false } = {}) =>
  ({ group, name, status, detail, fix, ref, required, warn });

/** Every item in a group "not checked", with the reason (usually the token that isn't set). */
const unchecked = (group, names, why, ref) => names.map((name) => item(group, name, NOT_CHECKED, { detail: why, ref }));

const readJson = (file) => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const readText = (file) => { try { return readFileSync(file, 'utf8'); } catch { return ''; } };
/** Why a read failed, without the service's reply (which could carry anything): its status, or the error's first words. */
export function reason(e) {
  const message = String(e?.message ?? e);
  const status = message.match(/ → (\d{3})\b/)?.[1];
  if (status) return `the service answered ${status}${status === '401' || status === '403' ? ' (the token is refused, or lacks access)' : ''}`;
  return `${message.split(' → ')[0].slice(0, 120)}${e?.cause?.code ? ` (${e.cause.code})` : ''}`;
}

/** What the check needs to know about the app, from its own files. */
export function appContext(appDir) {
  const app = appFrom(appDir);
  const appJson = readJson(path.join(appDir, 'app.json'))?.expo ?? {};
  const brand = readText(path.join(appDir, 'src/lib/brand.ts'));
  return {
    ...app,
    dir: appDir,
    site: (process.env.SITE_URL || appJson.extra?.apiUrl || '').replace(/\/$/, ''),
    tablet: appJson.ios?.supportsTablet === true,
    push: (appJson.plugins ?? []).some((p) => (Array.isArray(p) ? p[0] : p) === 'expo-notifications'),
    routes: /\broutes:\s*true\b/.test(brand),
  };
}

// ── GitHub ───────────────────────────────────────────────────────────────────

export async function checkGithub({ app, env }) {
  const G = 'GitHub';
  const names = ['The ruleset on main', 'Merge buttons: rebase only'];
  if (!env.REPO_ADMIN_TOKEN) return unchecked(G, names, 'no REPO_ADMIN_TOKEN', 'github.md');
  if (!env.GITHUB_REPOSITORY) return unchecked(G, names, 'no GITHUB_REPOSITORY (owner/name)', 'github.md');
  const base = `https://api.github.com/repos/${env.GITHUB_REPOSITORY}`;
  const headers = { accept: 'application/vnd.github+json' };
  const token = env.REPO_ADMIN_TOKEN;
  const rulesetName = [env.RULESET_FILE, '.github/rulesets/main-rebase-only.json', '../.github/rulesets/main-rebase-only.json']
    .filter(Boolean).map((f) => readJson(path.resolve(app.dir, f))?.name).find(Boolean);
  const out = [];
  try {
    const rulesets = await api(`${base}/rulesets`, { token, headers });
    const on = rulesets.some((r) => (rulesetName ? r.name === rulesetName : r.target === 'branch'));
    out.push(on
      ? item(G, names[0], DONE, { detail: rulesetName ?? 'a branch ruleset' })
      : item(G, names[0], MISSING, { fix: 'Run Set up app (Actions → Set up app) with REPO_ADMIN_TOKEN set, or add .github/rulesets/main-rebase-only.json in Settings → Rules.', ref: 'github.md' }));
  } catch (e) { out.push(item(G, names[0], NOT_CHECKED, { detail: reason(e), ref: 'github.md' })); }
  try {
    const repo = await api(base, { token, headers });
    const rebaseOnly = repo.allow_rebase_merge === true && repo.allow_merge_commit === false && repo.allow_squash_merge === false;
    out.push(rebaseOnly
      ? item(G, names[1], DONE)
      : item(G, names[1], MISSING, { fix: 'Settings → General → Pull Requests: only Allow rebase merging ticked (Set up app does it).', ref: 'github.md' }));
  } catch (e) { out.push(item(G, names[1], NOT_CHECKED, { detail: reason(e), ref: 'github.md' })); }
  return out;
}

// ── Supabase ─────────────────────────────────────────────────────────────────

export async function checkSupabase({ app, env }) {
  const S = 'Supabase';
  const names = ['The project', 'Site URL', 'Redirect URLs', 'Sign in with Apple', 'Continue with Google'];
  if (!env.SUPABASE_ACCESS_TOKEN) return unchecked(S, names, 'no SUPABASE_ACCESS_TOKEN', 'supabase.md');
  const token = env.SUPABASE_ACCESS_TOKEN;
  let project;
  try {
    const projects = await api(`${SB}/projects`, { token });
    const ref = env.SUPABASE_PROJECT_REF;
    project = projects.find((p) => (ref ? (p.id ?? p.ref) === ref : p.name === app.name));
  } catch (e) { return unchecked(S, names, reason(e), 'supabase.md'); }
  if (!project) {
    return [item(S, names[0], MISSING, { fix: 'Run Set up app (it finds the project by name or makes it), or set SUPABASE_PROJECT_REF to the project\'s ref.', ref: 'supabase.md' }),
      ...unchecked(S, names.slice(1), 'no project', 'supabase.md')];
  }
  const ref = project.id ?? project.ref;
  const out = [project.status && project.status !== 'ACTIVE_HEALTHY'
    ? item(S, names[0], MISSING, { detail: `${ref} is ${project.status}`, fix: 'Restore or unpause the project in Supabase\'s dashboard.', ref: 'supabase.md' })
    : item(S, names[0], DONE, { detail: ref })];

  let auth;
  try { auth = await api(`${SB}/projects/${ref}/config/auth`, { token }); } catch (e) { return [...out, ...unchecked(S, names.slice(1), reason(e), 'supabase.md')]; }
  const site = app.site;
  out.push(!site
    ? item(S, names[1], NOT_CHECKED, { detail: 'no site address: set SITE_URL or app.json extra.apiUrl', ref: 'supabase.md' })
    : (auth.site_url ?? '').replace(/\/$/, '') === site
      ? item(S, names[1], DONE, { detail: site })
      : item(S, names[1], MISSING, { detail: auth.site_url ? `is ${auth.site_url}` : 'not set', fix: `Authentication → URL Configuration → Site URL ${site} (Set up app with SITE_URL=${site}).`, ref: 'supabase.md' }));

  const allowed = String(auth.uri_allow_list ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const wanted = redirectUrls(site, app.scheme);
  const lacking = wanted.filter((u) => !allowed.includes(u));
  out.push(lacking.length
    ? item(S, names[2], MISSING, { detail: `lacks ${lacking.join(', ')}`, fix: `Authentication → URL Configuration → Redirect URLs: add ${lacking.join(' and ')} (Set up app adds them).`, ref: 'testflight.md' })
    : item(S, names[2], DONE, { detail: wanted.join(', ') }));

  if (!app.appleSignIn) out.push(item(S, names[3], OFF, { detail: 'ios.usesAppleSignIn is off in app.json', required: false }));
  else {
    const appleOk = auth.external_apple_enabled === true && String(auth.external_apple_client_id ?? '').split(',').map((s) => s.trim()).includes(app.bundleId);
    out.push(appleOk
      ? item(S, names[3], DONE, { detail: `client ID ${app.bundleId}` })
      : item(S, names[3], MISSING, { detail: auth.external_apple_enabled ? `client ID isn't ${app.bundleId}` : 'off', fix: `Run Set up app: it turns the Apple provider on with ${app.bundleId} as its client ID.`, ref: 'testflight.md' }));
  }

  const ids = [app.google?.webClientId, app.google?.iosClientId].filter(Boolean);
  // Whether Supabase holds Google's secret, as a boolean: the value itself is never kept or shown.
  const hasSecret = Boolean(auth.external_google_secret);
  if (!ids.length && !auth.external_google_enabled) out.push(item(S, names[4], OFF, { detail: 'no APP.google client IDs', fix: 'When Google sign-in goes in: its clients, then Set up app.', ref: 'google.md', required: false }));
  else {
    const clientIds = String(auth.external_google_client_id ?? '').split(',').map((s) => s.trim());
    const lackingIds = ids.filter((id) => !clientIds.includes(id));
    const problems = [!auth.external_google_enabled && 'off', lackingIds.length && `lacks ${lackingIds.length === 2 ? 'both client IDs' : lackingIds[0] === app.google.webClientId ? 'the web client ID' : 'the iOS client ID'}`, !hasSecret && 'no client secret'].filter(Boolean);
    out.push(problems.length
      ? item(S, names[4], MISSING, { detail: problems.join(', '), fix: hasSecret ? 'Run Set up app: it turns Google on with APP.google\'s client IDs.' : 'Paste the web client\'s secret into Supabase → Authentication → Sign In / Providers → Google (never in the chat), then run Set up app.', ref: 'google.md' })
      : item(S, names[4], DONE, { detail: `on, ${ids.length} client ID${ids.length === 1 ? '' : 's'}, secret present` }));
  }
  return out;
}

// ── Vercel ───────────────────────────────────────────────────────────────────

/** The variables a Vercel project can read, by name only: its own, and the team's shared ones linked to it. */
export async function vercelNames({ token, team, project }) {
  const q = team ? `teamId=${team}` : '';
  const { envs = [] } = (await api(`${VC}/v9/projects/${project.id}/env${q ? `?${q}` : ''}`, { token })) ?? {};
  const own = envs.map((e) => ({ key: e.key, production: !e.target || [].concat(e.target).includes('production') }));
  const { data: shared = [] } = (await api(`${VC}/v1/env${q ? `?${q}` : ''}`, { token })) ?? {};
  const linked = shared.filter((v) => (v.projectId ?? []).includes(project.id)).map((v) => v.key);
  return {
    own: own.filter((e) => e.production).map((e) => e.key),
    shared: shared.map((v) => v.key),
    linked,
    all: new Set([...own.filter((e) => e.production).map((e) => e.key), ...linked]),
  };
}

export async function checkVercel({ app, env }) {
  const V = 'Vercel';
  const names = ['The project', 'SUPABASE_DB_URL', 'SUPABASE_PUBLISHABLE_KEY', 'OWNER_EMAIL or OWNER_CODE', 'Shared ANTHROPIC_API_KEY', 'Shared RESEND_API_KEY'];
  if (!env.VERCEL_TOKEN) return { items: unchecked(V, names, 'no VERCEL_TOKEN', 'vercel.md'), names: null };
  const token = env.VERCEL_TOKEN;
  const team = env.VERCEL_TEAM;
  const name = env.VERCEL_PROJECT || app.slug;
  let project;
  try {
    project = await api(`${VC}/v9/projects/${encodeURIComponent(name)}${team ? `?teamId=${team}` : ''}`, { token });
  } catch (e) {
    if (String(e.message).includes('404')) {
      return { items: [item(V, names[0], MISSING, { detail: `no project ${name}`, fix: 'Run Set up app (it makes the project, rooted at APP_FOLDER), or set VERCEL_PROJECT to its name.', ref: 'vercel.md' }), ...unchecked(V, names.slice(1), 'no project', 'vercel.md')], names: null };
    }
    return { items: unchecked(V, names, reason(e), 'vercel.md'), names: null };
  }
  let vars;
  try { vars = await vercelNames({ token, team, project }); } catch (e) {
    return { items: [item(V, names[0], DONE, { detail: name }), ...unchecked(V, names.slice(1), reason(e), 'vercel.md')], names: null };
  }
  const own = (key, fix) => (vars.all.has(key)
    ? item(V, key, DONE, { detail: 'set for production' })
    : item(V, key, MISSING, { fix, ref: 'vercel.md' }));
  // The shared keys switch on optional integrations: one on the team but not linked is missing; one not on the team is off.
  const shared = (key, ref) => (vars.linked.includes(key) || vars.own.includes(key)
    ? item(V, `Shared ${key}`, DONE, { detail: vars.linked.includes(key) ? 'linked from the team' : 'the project\'s own', required: false })
    : vars.shared.includes(key)
      ? item(V, `Shared ${key}`, MISSING, { detail: 'on the team, not linked', fix: 'Run Set up app: it links the team\'s shared variable to the project.', ref, required: false })
      : item(V, `Shared ${key}`, OFF, { detail: 'not on the team', fix: `Vercel team → Settings → Environment Variables → shared: ${key}, Sensitive (typed by the person), then Set up app.`, ref: 'accounts.md', required: false }));
  const items = [
    item(V, names[0], DONE, { detail: `${name}${project.rootDirectory ? `, root ${project.rootDirectory}` : ''}` }),
    own('SUPABASE_DB_URL', 'Run Set up app with SUPABASE_ACCESS_TOKEN and VERCEL_TOKEN: it sets a database password nobody sees and writes the string into Vercel.'),
    own('SUPABASE_PUBLISHABLE_KEY', 'Run Set up app: it copies Supabase\'s publishable key into Vercel.'),
    vars.all.has('OWNER_EMAIL') || vars.all.has('OWNER_CODE')
      ? item(V, names[3], DONE, { detail: vars.all.has('OWNER_EMAIL') ? 'OWNER_EMAIL' : 'OWNER_CODE' })
      : item(V, names[3], MISSING, { fix: 'Run Set up app with OWNER_EMAIL set (not a secret).', ref: 'owner.md' }),
    shared('ANTHROPIC_API_KEY', 'claude.md'),
    shared('RESEND_API_KEY', 'resend.md'),
  ];
  return { items, names: vars.all };
}

// ── The live site ────────────────────────────────────────────────────────────

/** Fetches /api/health; `null` with the reason when the site can't be reached from here. */
export async function liveHealth(site) {
  if (!site) return { health: null, why: 'no site address: set SITE_URL or app.json extra.apiUrl' };
  let res;
  try {
    res = await fetch(`${site}/api/health`, { signal: AbortSignal.timeout(15_000) });
  } catch (e) {
    const code = typeof e.cause?.code === 'string' ? `, ${e.cause.code}` : '';
    return { health: null, why: `couldn't reach ${site} from here (blocked by this network, or the site is down${code})` };
  }
  const text = await res.text();
  let body = null;
  try { body = JSON.parse(text); } catch {}
  if (res.ok && body && typeof body === 'object' && 'db' in body) return { health: body, status: res.status };
  return { health: null, status: res.status, why: `${site}/api/health answered ${res.status}${body ? '' : ' (not JSON)'}` };
}

export function checkHealth({ app, live }) {
  const L = 'The live site';
  if (!live.health) {
    // The proxy's refusal and a site that's down look different: an answer from the site is a finding.
    const status = live.status && live.status !== 403 && live.status !== 407 ? MISSING : NOT_CHECKED;
    return [item(L, '/api/health', status, { detail: live.why, fix: status === MISSING ? 'Look at the production deployment in Vercel (Deployments → the latest → Logs).' : '', ref: 'vercel.md' })];
  }
  const h = live.health;
  return [
    h.db === 'ok'
      ? item(L, 'The database', DONE, { detail: `migration ${h.migration ?? 'none'}` })
      : item(L, 'The database', MISSING, { detail: `db is ${h.db}`, fix: h.db === 'off' ? 'SUPABASE_DB_URL in Vercel (Set up app), then redeploy.' : 'Check SUPABASE_DB_URL (the Session pooler, port 5432) and the deploy\'s migration step.', ref: 'supabase.md' }),
    h.auth
      ? item(L, 'Sign-in (Supabase Auth)', DONE)
      : item(L, 'Sign-in (Supabase Auth)', MISSING, { fix: 'SUPABASE_PUBLISHABLE_KEY in Vercel (Set up app), then redeploy.', ref: 'supabase.md' }),
  ];
}

// ── Optional integrations ────────────────────────────────────────────────────

/** Each integration: what /api/health says, else the Vercel variables it needs. */
export const INTEGRATIONS = [
  { name: 'Errors (Sentry)', health: 'sentry', vars: ['SENTRY_DSN'], ref: 'sentry.md' },
  { name: 'Analytics (PostHog)', health: 'posthog', vars: ['POSTHOG_KEY'], ref: 'posthog.md' },
  { name: 'Email (Resend)', health: 'email', vars: ['RESEND_API_KEY', 'EMAIL_FROM'], ref: 'resend.md' },
  { name: 'Payments (Stripe)', health: 'billing', vars: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'], ref: 'stripe.md' },
  { name: 'The AI assistant (Claude)', health: 'ai', vars: ['ANTHROPIC_API_KEY'], ref: 'claude.md' },
  { name: 'Share links (Tapp)', health: 'tapp', vars: ['TAPP_AUTH_TOKEN', 'TAPP_TOKEN'], ref: 'tapp.md' },
  { name: 'Maps (Mapbox)', health: 'maps', vars: ['MAPBOX_TOKEN'], ref: 'mapbox.md', only: (app) => app.routes },
];

export function checkIntegrations({ app, live, vercel }) {
  const I = 'Optional integrations';
  return INTEGRATIONS.filter((i) => !i.only || i.only(app)).map((i) => {
    if (live.health?.integrations) {
      const on = Boolean(live.health.integrations[i.health]);
      return on ? item(I, i.name, DONE, { detail: 'on (/api/health)', required: false })
        : item(I, i.name, OFF, { detail: 'off (/api/health)', fix: `${i.vars.join(' and ')} in Vercel when the owner wants it.`, ref: i.ref, required: false });
    }
    if (vercel) {
      const lacking = i.vars.filter((v) => !vercel.has(v));
      if (!lacking.length) return item(I, i.name, DONE, { detail: 'its variables are in Vercel', required: false });
      return item(I, i.name, OFF, { detail: lacking.length < i.vars.length ? `lacks ${lacking.join(', ')}` : 'no variables in Vercel', fix: `${lacking.join(' and ')} in Vercel when the owner wants it.`, ref: i.ref, required: false });
    }
    return item(I, i.name, NOT_CHECKED, { detail: 'neither /api/health nor Vercel could be read', ref: i.ref, required: false });
  });
}

// ── Expo ─────────────────────────────────────────────────────────────────────

const gql = (token, query, variables) => api(EXPO, { token, method: 'POST', body: { query, variables } }).then((r) => {
  if (r?.errors?.length) throw new Error(`Expo: ${r.errors.map((e) => e.message).join('; ').slice(0, 160)}`);
  return r.data;
});

/** When a date is, in words, and whether it is close enough to renew. */
export function expiry(date, now = Date.now()) {
  if (!date) return { text: 'no expiry given', soon: false, past: false };
  const days = Math.floor((new Date(date).getTime() - now) / DAY);
  const day = new Date(date).toISOString().slice(0, 10);
  if (days < 0) return { text: `expired ${day}`, soon: true, past: true };
  return { text: `expires ${day} (in ${days} day${days === 1 ? '' : 's'})`, soon: days <= RENEW_WITHIN_DAYS, past: false };
}

/** The account's App Store Connect variables `scripts/review.ts` submits with. */
export const ASC_VARIABLES = ['EXPO_ASC_API_KEY_PATH', 'EXPO_ASC_KEY_ID', 'EXPO_ASC_ISSUER_ID'];

// Only names, ids, dates and statuses are asked for: never a key, a keystore, a password or a variable's value.
const Q_PROJECT = `query($f: String!) { app { byFullName(fullName: $f) { id } } }`;
const Q_ACCOUNT = `query($n: String!) { account { byName(accountName: $n) {
  appStoreConnectApiKeysPaginated(first: 50) { edges { node { id keyIdentifier appleTeam { appleTeamIdentifier } } } }
  environmentVariables { name environments visibility type scope }
} } }`;
const Q_CREDENTIALS = `query($f: String!) { app { byFullName(fullName: $f) {
  iosAppCredentials {
    appleAppIdentifier { bundleIdentifier }
    appStoreConnectApiKeyForSubmissions { keyIdentifier }
    iosAppBuildCredentialsList { iosDistributionType distributionCertificate { validityNotAfter } provisioningProfile { expiration status } }
  }
  androidAppCredentials {
    applicationIdentifier
    googleServiceAccountKeyForSubmissions { id }
    googleServiceAccountKeyForFcmV1 { id }
    androidAppBuildCredentialsList { androidKeystore { id } }
  }
} } }`;

export async function checkExpo({ app, env, now = Date.now() }) {
  const E = 'Expo';
  const names = ['The project', 'App Store Connect key on the account', 'iOS distribution certificate', 'iOS provisioning profile', 'App Store Connect key for submissions', ...ASC_VARIABLES, 'Android keystore', 'Play submission key', 'Android push (FCM V1) key'];
  if (!env.EXPO_TOKEN) return unchecked(E, names, 'no EXPO_TOKEN', 'eas.md');
  if (!app.owner) return [item(E, names[0], MISSING, { fix: 'Set expo.owner in app.json to the Expo account the token belongs to.', ref: 'testflight.md' }), ...unchecked(E, names.slice(1), 'no expo.owner', 'eas.md')];
  const token = env.EXPO_TOKEN;
  const fullName = `@${app.owner}/${app.slug}`;
  const out = [];

  let projectId;
  try {
    projectId = (await gql(token, Q_PROJECT, { f: fullName }))?.app?.byFullName?.id;
  } catch (e) {
    if (!/not.*found|no app|does not exist|doesn't exist/i.test(e.message)) return unchecked(E, names, reason(e), 'eas.md');
  }
  if (!projectId) out.push(item(E, names[0], MISSING, { detail: `no ${fullName}`, fix: 'Run `npx eas-cli init --non-interactive --force` in the app (or Set up app) and commit app.json\'s extra.eas.projectId.', ref: 'testflight.md' }));
  else if (app.projectId !== projectId) out.push(item(E, names[0], MISSING, { detail: app.projectId ? `app.json has ${app.projectId}, the project is ${projectId}` : 'app.json has no extra.eas.projectId', fix: `Put "extra": { "eas": { "projectId": "${projectId}" } } in app.json, in a PR.`, ref: 'testflight.md' }));
  else out.push(item(E, names[0], DONE, { detail: `${fullName}, matches app.json` }));

  try {
    const account = (await gql(token, Q_ACCOUNT, { n: app.owner })).account.byName;
    const keys = account.appStoreConnectApiKeysPaginated.edges.map((e) => e.node);
    out.push(keys.length
      ? item(E, names[1], DONE, { detail: keys.map((k) => k.keyIdentifier).join(', ') })
      : item(E, names[1], MISSING, { fix: 'App Store Connect → Users and Access → Integrations → Team Keys → + (App Manager); upload the .p8 on the Expo account\'s Credentials, not a project\'s.', ref: 'accounts.md' }));
    const vars = account.environmentVariables ?? [];
    for (const name of ASC_VARIABLES) {
      const v = vars.find((x) => x.name === name && (x.environments ?? []).some((e) => String(e).toLowerCase() === 'production'));
      out.push(!v
        ? item(E, name, MISSING, { fix: `expo.dev → the account → Settings → Environment variables → ${name}, production, Secret${name === 'EXPO_ASC_API_KEY_PATH' ? ', type File (the Admin key\'s .p8)' : ''}.`, ref: 'app-review.md' })
        : item(E, name, DONE, { detail: `production, ${String(v.visibility ?? 'unknown').toLowerCase()}${String(v.visibility).toUpperCase() === 'SECRET' ? '' : ' (should be Secret)'}`, warn: String(v.visibility).toUpperCase() !== 'SECRET' }));
    }
  } catch (e) {
    out.push(...unchecked(E, [names[1], ...ASC_VARIABLES], reason(e), 'accounts.md'));
  }

  let creds;
  try { creds = projectId ? (await gql(token, Q_CREDENTIALS, { f: fullName })).app.byFullName : null; } catch (e) {
    return [...out, ...unchecked(E, [names[2], names[3], names[4], ...names.slice(-3)], reason(e), 'eas.md')];
  }
  if (!creds) return [...out, ...unchecked(E, [names[2], names[3], names[4], ...names.slice(-3)], 'no Expo project', 'eas.md')];

  const ios = (creds.iosAppCredentials ?? []).find((c) => c.appleAppIdentifier?.bundleIdentifier === app.bundleId);
  const build = (ios?.iosAppBuildCredentialsList ?? []).find((b) => b.iosDistributionType === 'APP_STORE') ?? ios?.iosAppBuildCredentialsList?.[0];
  const firstBuild = 'A first store build makes it: `npx tsx scripts/release.ts ios --build-only`, with the account\'s App Store Connect key assigned (Set up app).';
  const dated = (name, date, extra = '') => {
    const when = expiry(date, now);
    if (when.past) return item(E, name, MISSING, { detail: when.text, fix: 'npx eas-cli credentials -p ios → Build Credentials → remove it, then build again: EAS makes a new one with the App Store Connect key.', ref: 'testflight.md' });
    return item(E, name, DONE, { detail: `${when.text}${extra}${when.soon ? ': renew soon' : ''}`, warn: when.soon });
  };
  out.push(build?.distributionCertificate ? dated(names[2], build.distributionCertificate.validityNotAfter)
    : item(E, names[2], MISSING, { fix: firstBuild, ref: 'testflight.md' }));
  const profile = build?.provisioningProfile;
  out.push(!profile ? item(E, names[3], MISSING, { fix: firstBuild, ref: 'testflight.md' })
    : profile.status && String(profile.status).toUpperCase() !== 'ACTIVE' ? item(E, names[3], MISSING, { detail: `status ${profile.status}`, fix: 'npx eas-cli credentials -p ios → Build Credentials → Provisioning Profile: Delete, then Set up all (with the person\'s Apple login).', ref: 'testflight.md' })
    : dated(names[3], profile.expiration));
  out.push(ios?.appStoreConnectApiKeyForSubmissions
    ? item(E, names[4], DONE, { detail: ios.appStoreConnectApiKeyForSubmissions.keyIdentifier })
    : item(E, names[4], MISSING, { fix: 'Run Set up app with EXPO_TOKEN: it assigns the account\'s key to the iPhone app.', ref: 'accounts.md' }));

  const android = (creds.androidAppCredentials ?? []).find((c) => c.applicationIdentifier === app.androidPackage);
  const keystore = (android?.androidAppBuildCredentialsList ?? []).some((b) => b.androidKeystore?.id);
  const later = { required: false, detail: 'no Android build yet' };
  out.push(keystore ? item(E, names.at(-3), DONE)
    : item(E, names.at(-3), OFF, { ...later, fix: 'A first Android build makes it: `npx tsx scripts/release.ts android --build-only`.', ref: 'eas.md' }));
  out.push(android?.googleServiceAccountKeyForSubmissions ? item(E, names.at(-2), DONE, { required: false })
    : item(E, names.at(-2), keystore ? MISSING : OFF, { ...(keystore ? { required: true } : later), fix: 'Run Set up app with EXPO_PLAY_KEY_EMAIL (the shared Play key\'s client email), after the first upload by hand in Play Console.', ref: 'accounts.md' }));
  out.push(android?.googleServiceAccountKeyForFcmV1 ? item(E, names.at(-1), DONE, { required: false })
    : item(E, names.at(-1), OFF, { ...later, detail: keystore ? 'push on Android is off' : later.detail, fix: 'Run Set up app with EXPO_FCM_KEY_EMAIL, or FIREBASE_SERVICE_ACCOUNT on GitHub.', ref: 'push.md' }));
  return out;
}

// ── The App Store listing (local files) ──────────────────────────────────────

/** Every field of store.config.json still marked TO FILL, as dotted paths. */
export function toFill(value, at = '') {
  if (typeof value === 'string') return value.includes('TO FILL') ? [at] : [];
  if (Array.isArray(value)) return value.some((v) => typeof v === 'string' && v.includes('TO FILL')) ? [at] : value.flatMap((v, i) => toFill(v, `${at}[${i}]`));
  if (value && typeof value === 'object') return Object.entries(value).flatMap(([k, v]) => toFill(v, at ? `${at}.${k}` : k));
  return [];
}

export function checkAppStore({ app }) {
  const A = 'App Store';
  const out = [];
  const eas = readJson(path.join(app.dir, 'eas.json'));
  const ios = eas?.submit?.production?.ios ?? {};
  out.push(ios.appleTeamId ? item(A, 'eas.json appleTeamId', DONE, { detail: ios.appleTeamId })
    : item(A, 'eas.json appleTeamId', MISSING, { fix: 'submit.production.ios.appleTeamId: the Team ID from developer.apple.com → Membership details (Naz\'s and Etapa\'s eas.json have it).', ref: 'testflight.md' }));
  out.push(ios.ascAppId ? item(A, 'eas.json ascAppId', DONE, { detail: ios.ascAppId })
    : item(A, 'eas.json ascAppId', MISSING, { fix: `App Store Connect → Apps → + → New App, bundle ID ${app.bundleId}; then Set up app writes its Apple ID into eas.json.`, ref: 'testflight.md' }));

  const store = readJson(path.join(app.dir, 'store.config.json'));
  if (!store?.apple) return [...out, item(A, 'store.config.json', MISSING, { fix: 'The listing as data: copy store.config.json from the template and write it from PRODUCT.md.', ref: 'app-review.md' })];
  const blanks = toFill(store.apple);
  out.push(blanks.length
    ? item(A, 'store.config.json filled in', MISSING, { detail: `TO FILL in ${blanks.join(', ')}`, fix: 'Write each from PRODUCT.md and brand.ts; the review contact\'s name and phone come from the person (not secret).', ref: 'app-review.md' })
    : item(A, 'store.config.json filled in', DONE));

  const locales = Object.keys(store.apple.info ?? {});
  const devices = [['iPhone 6.9-inch', (t) => t === 'APP_IPHONE_67' || t === 'APP_IPHONE_65', true], ['iPad 13-inch', (t) => t.startsWith('APP_IPAD_PRO'), app.tablet]];
  for (const [label, matches, needed] of devices) {
    if (!needed) continue;
    const lacking = locales.filter((locale) => {
      const sets = Object.entries(store.apple.info[locale].screenshots ?? {}).filter(([t]) => matches(t));
      const files = sets.flatMap(([, f]) => f);
      return !files.length || files.some((f) => !existsSync(path.resolve(app.dir, f)));
    });
    const name = `Screenshots: ${label}`;
    out.push(lacking.length || !locales.length
      ? item(A, name, MISSING, { detail: locales.length ? `none or a file missing for ${lacking.join(', ')}` : 'no locale in store.config.json', fix: '`npx expo export --platform web` then `npm run store:screens`; look at each, and commit them.', ref: 'app-review.md' })
      : item(A, name, DONE, { detail: locales.map((l) => `${l}: ${Object.entries(store.apple.info[l].screenshots).filter(([t]) => matches(t)).flatMap(([, f]) => f).length}`).join(', ') }));
  }
  return out;
}

// ── Google sign-in and the build's capabilities (local files) ────────────────

export function checkGoogle({ app }) {
  const G = 'Google sign-in';
  const { webClientId = '', iosClientId = '' } = app.google ?? {};
  if (!webClientId && !iosClientId) return [item(G, 'APP.google client IDs', OFF, { detail: 'not set in src/lib/brand.ts: the apps offer Apple and email', fix: 'Make the web and iOS clients in the shared Google Cloud project; their IDs go in APP.google.', ref: 'google.md', required: false })];
  const shape = /^[\w-]+\.apps\.googleusercontent\.com$/;
  const out = [];
  const lacking = [!webClientId && 'webClientId', !iosClientId && 'iosClientId'].filter(Boolean);
  const bad = [webClientId && !shape.test(webClientId) && 'webClientId', iosClientId && !shape.test(iosClientId) && 'iosClientId'].filter(Boolean);
  out.push(lacking.length || bad.length
    ? item(G, 'APP.google client IDs', MISSING, { detail: [lacking.length && `lacks ${lacking.join(', ')}`, bad.length && `${bad.join(', ')} isn't a client ID`].filter(Boolean).join('; '), fix: 'Google Cloud → Clients: copy each client\'s ID (….apps.googleusercontent.com) into APP.google in src/lib/brand.ts.', ref: 'google.md' })
    : item(G, 'APP.google client IDs', DONE, { detail: 'web and iOS' }));
  const id = iosClientId.replace(/\.apps\.googleusercontent\.com$/, '');
  out.push(iosClientId && shape.test(iosClientId)
    ? item(G, 'The iOS URL scheme', DONE, { detail: `com.googleusercontent.apps.${id} (app.config.js writes it)` })
    : item(G, 'The iOS URL scheme', MISSING, { fix: 'It comes from APP.google.iosClientId: set that, and the next store build carries it.', ref: 'google.md' }));
  return out;
}

export function checkCapabilities({ app }) {
  const C = 'Build capabilities';
  const remake = 'Add it to app.json; if the iPhone app already has a provisioning profile, make it again: `npx eas-cli credentials -p ios` → Build Credentials → Provisioning Profile: Delete, then Set up all.';
  return [
    app.appleSignIn ? item(C, 'Sign in with Apple (ios.usesAppleSignIn)', DONE)
      : item(C, 'Sign in with Apple (ios.usesAppleSignIn)', MISSING, { fix: remake, ref: 'testflight.md' }),
    app.push ? item(C, 'Push (expo-notifications)', DONE)
      : item(C, 'Push (expo-notifications)', MISSING, { fix: remake.replace('Add it', 'Add the expo-notifications plugin'), ref: 'push.md' }),
  ];
}

// ── The run ──────────────────────────────────────────────────────────────────

/** Every item, in the checklist's order. */
export async function launchCheck({ appDir = '.', env = process.env, now = Date.now() } = {}) {
  const app = appContext(appDir);
  const [github, supabase, vercel, live, expo] = await Promise.all([
    checkGithub({ app, env }),
    checkSupabase({ app, env }),
    checkVercel({ app, env }),
    liveHealth(app.site),
    checkExpo({ app, env, now }),
  ]);
  const items = [
    ...github, ...supabase, ...vercel.items,
    ...checkHealth({ app, live }),
    ...expo,
    ...checkAppStore({ app }),
    ...checkGoogle({ app }),
    ...checkCapabilities({ app }),
    ...checkIntegrations({ app, live, vercel: vercel.names }),
  ];
  return { app: { name: app.name, bundleId: app.bundleId, site: app.site }, items, ok: !items.some((i) => i.required && i.status === MISSING) };
}

const REFERENCE = 'the app-launch skill\'s reference/';

/** Counts by status, and the required items still missing. */
export function summary(items) {
  const count = (s) => items.filter((i) => i.status === s).length;
  const missing = items.filter((i) => i.status === MISSING);
  const required = missing.filter((i) => i.required);
  return { done: count(DONE), missing: missing.length, required: required.length, notChecked: count(NOT_CHECKED), off: count(OFF), soon: items.filter((i) => i.warn).length };
}

export function summaryLine(items) {
  const s = summary(items);
  return `${s.done} done, ${s.missing} missing${s.missing ? ` (${s.required} required)` : ''}, ${s.notChecked} not checked, ${s.off} optional and off${s.soon ? `, ${s.soon} to look at soon` : ''}.`;
}

/** The checklist as text: grouped, plain words, the fix under each missing item. */
export function format({ app, items }) {
  const width = Math.max(...items.map((i) => i.status.length)) + 2;
  const lines = [`Launch check: ${app.name}${app.bundleId ? ` (${app.bundleId})` : ''}${app.site ? `, ${app.site}` : ''}`];
  let group = '';
  let collapsed = false;
  for (const i of items) {
    if (i.group !== group) {
      group = i.group;
      lines.push('', group);
      // A group nobody could read (its token isn't set) is one line, not one per item.
      const all = items.filter((x) => x.group === group);
      collapsed = all.length > 1 && all.every((x) => x.status === NOT_CHECKED && x.detail === i.detail);
      if (collapsed) lines.push(`  ${NOT_CHECKED.padEnd(width)}${all.map((x) => x.name).join(', ')}: ${i.detail}`);
    }
    if (collapsed) continue;
    const status = i.warn && i.status === DONE ? 'done, soon' : i.status;
    lines.push(`  ${status.padEnd(width)}${i.name}${i.detail ? `: ${i.detail}` : ''}`);
    if (i.fix && i.status !== DONE) lines.push(`  ${''.padEnd(width)}Fix: ${i.fix}${i.ref ? ` (${REFERENCE}${i.ref})` : ''}`);
  }
  lines.push('', summaryLine(items));
  return lines.join('\n');
}

export async function main(argv = process.argv.slice(2)) {
  const result = await launchCheck({ appDir: process.env.APP_DIR || '.' });
  console.log(argv.includes('--json') ? JSON.stringify(result, null, 2) : format(result));
  if (!result.ok) process.exitCode = 1;
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exitCode = 1; });
