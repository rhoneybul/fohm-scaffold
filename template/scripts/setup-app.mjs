#!/usr/bin/env node
/**
 * Set up app: everything an app needs from the shared accounts, done from
 * the keys set once on the GitHub organisation (the app-launch skill's
 * reference/accounts.md). Run by .github/workflows/setup.yml, by hand, after
 * the repository exists and again whenever a key is added: every step reads
 * what is there first and changes only what is missing, so it is safe to run
 * any number of times.
 *
 *   github    the ruleset on main and the merge buttons       REPO_ADMIN_TOKEN
 *   supabase  the project, its sign-in URLs, the database      SUPABASE_ACCESS_TOKEN
 *             password (made here, never shown) and keys
 *   vercel    the project, its own variables, the team's       VERCEL_TOKEN
 *             shared ones linked, then a redeploy
 *   firebase  the Android app in the shared Firebase project,  FIREBASE_SERVICE_ACCOUNT
 *             its google-services.json into EAS
 *   expo      the shared FCM V1 and Play submission keys       EXPO_TOKEN
 *             on the app's Android credentials
 *
 * A step whose key isn't set says so and is skipped. It also runs from a
 * Claude cloud session whose proxy holds the tokens: each token variable set
 * to a placeholder, the proxy putting the real one in the header. Plain Node, no
 * dependencies; every request goes through `api()`, so tests replace fetch.
 */
import { createSign, randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const env = process.env;
const log = (...a) => console.log(...a);
/** Keeps a value out of the run's log (GitHub Actions' mask). */
const mask = (value) => env.GITHUB_ACTIONS && console.log(`::add-mask::${value}`);

/** A JSON request that throws with the service's own words when it fails. */
export async function api(url, { token, method = 'GET', body, headers = {} } = {}) {
  const res = await fetch(url, {
    method,
    headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? safeJson(text) : null;
  if (!res.ok) throw new Error(`${method} ${url.split('?')[0]} → ${res.status} ${text.slice(0, 300)}`);
  return data;
}
const safeJson = (text) => { try { return JSON.parse(text); } catch { return text; } };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** What the app is, from app.json. */
export function appFrom(appDir) {
  const { expo } = JSON.parse(readFileSync(path.join(appDir, 'app.json'), 'utf8'));
  return {
    name: expo.name,
    slug: expo.slug,
    scheme: expo.scheme,
    owner: expo.owner,
    bundleId: expo.ios?.bundleIdentifier,
    androidPackage: expo.android?.package,
    appleSignIn: Boolean(expo.ios?.usesAppleSignIn),
    projectId: expo.extra?.eas?.projectId,
  };
}

/** The Session pooler string (port 5432) with the password, from Supabase's pooler settings. */
export function poolerUrl(pooler, password) {
  const p = (Array.isArray(pooler) ? pooler.find((x) => x.database_type === 'PRIMARY') ?? pooler[0] : pooler);
  return `postgresql://${p.db_user}:${encodeURIComponent(password)}@${p.db_host}:5432/${p.db_name}`;
}

/** The redirect URLs sign-in may return to: the site and the app's scheme. */
export const redirectUrls = (site, scheme) => [site && `${site.replace(/\/$/, '')}/**`, scheme && `${scheme}://**`].filter(Boolean);

// ── GitHub ───────────────────────────────────────────────────────────────────

export async function github({ repo, token, rulesetFile }) {
  const base = `https://api.github.com/repos/${repo}`;
  const headers = { accept: 'application/vnd.github+json' };
  const ruleset = JSON.parse(readFileSync(rulesetFile, 'utf8'));
  const existing = await api(`${base}/rulesets`, { token, headers });
  if (existing.some((r) => r.name === ruleset.name)) log(`  ruleset "${ruleset.name}" already on`);
  else {
    await api(`${base}/rulesets`, { token, headers, method: 'POST', body: ruleset });
    log(`  ruleset "${ruleset.name}" made`);
  }
  await api(base, { token, headers, method: 'PATCH', body: { allow_merge_commit: false, allow_squash_merge: false, allow_rebase_merge: true, delete_branch_on_merge: true } });
  log('  merge buttons: rebase only, branches deleted after merging');
}

// ── Supabase ─────────────────────────────────────────────────────────────────

const SB = 'https://api.supabase.com/v1';

/** Finds the app's project (by ref, else by name), or makes it with a password nobody sees. */
export async function supabaseProject({ token, app, ref, org, region }) {
  const projects = await api(`${SB}/projects`, { token });
  const found = projects.find((p) => (ref ? p.id === ref || p.ref === ref : p.name === app.name));
  if (found) return { ref: found.id ?? found.ref, made: false };
  const orgs = await api(`${SB}/organizations`, { token });
  const slug = org ?? orgs[0]?.slug ?? orgs[0]?.id;
  if (!slug) throw new Error('No Supabase organisation to make the project in: set SUPABASE_ORG.');
  const password = randomBytes(24).toString('base64url');
  mask(password);
  const made = await api(`${SB}/projects`, { token, method: 'POST', body: { name: app.name, organization_slug: slug, region: region ?? 'eu-west-2', db_pass: password } });
  const newRef = made.id ?? made.ref;
  for (let i = 0; i < 60; i++) {
    const p = await api(`${SB}/projects/${newRef}`, { token });
    if (p.status === 'ACTIVE_HEALTHY') break;
    await wait(10_000);
  }
  return { ref: newRef, made: true, password };
}

export async function supabase({ token, app, ref, org, region, site, google, needDbUrl }) {
  const project = await supabaseProject({ token, app, ref, org, region });
  log(`  project ${project.ref}${project.made ? ' made' : ''}`);

  const auth = { site_url: site ?? undefined, uri_allow_list: redirectUrls(site, app.scheme).join(',') };
  if (app.appleSignIn && app.bundleId) Object.assign(auth, { external_apple_enabled: true, external_apple_client_id: app.bundleId });
  if (google?.webClientId && google?.secret) {
    Object.assign(auth, {
      external_google_enabled: true,
      external_google_client_id: [google.webClientId, google.iosClientId].filter(Boolean).join(','),
      external_google_secret: google.secret,
      external_google_skip_nonce_check: true,
    });
  }
  await api(`${SB}/projects/${project.ref}/config/auth`, { token, method: 'PATCH', body: auth });
  log(`  sign-in returns to ${auth.uri_allow_list || 'the site'}${auth.external_apple_enabled ? '; Apple on' : ''}${auth.external_google_enabled ? '; Google on' : ''}`);

  const keys = await api(`${SB}/projects/${project.ref}/api-keys`, { token });
  const publishable = keys.find((k) => k.type === 'publishable')?.api_key ?? keys.find((k) => k.name === 'anon')?.api_key;

  let dbUrl;
  if (needDbUrl) {
    // A new password, set here and written straight into Vercel: nobody ever sees it.
    const password = project.password ?? randomBytes(24).toString('base64url');
    mask(password);
    if (!project.password) await api(`${SB}/projects/${project.ref}/database/password`, { token, method: 'PATCH', body: { password } });
    dbUrl = poolerUrl(await api(`${SB}/projects/${project.ref}/config/database/pooler`, { token }), password);
    mask(dbUrl);
    log('  database password set and kept for Vercel');
  }
  return { ref: project.ref, publishable, dbUrl };
}

// ── Vercel ───────────────────────────────────────────────────────────────────

const VC = 'https://api.vercel.com';

export async function vercelProject({ token, team, name, repo, rootDirectory }) {
  const q = team ? `?teamId=${team}` : '';
  try {
    return await api(`${VC}/v9/projects/${encodeURIComponent(name)}${q}`, { token });
  } catch (e) {
    if (!String(e.message).includes('404')) throw e;
  }
  const made = await api(`${VC}/v11/projects${q}`, { token, method: 'POST', body: { name, rootDirectory: rootDirectory === '.' ? null : rootDirectory, gitRepository: repo ? { type: 'github', repo } : undefined } });
  log(`  project ${name} made`);
  return made;
}

export async function vercel({ token, team, name, repo, rootDirectory, set = {}, shared = [] }) {
  const q = team ? `teamId=${team}` : '';
  const project = await vercelProject({ token, team, name, repo, rootDirectory });
  let changed = false;

  const own = Object.entries(set).filter(([, v]) => v && v.value);
  if (own.length) {
    await api(`${VC}/v10/projects/${project.id}/env?upsert=true${q ? `&${q}` : ''}`, {
      token, method: 'POST',
      body: own.map(([key, v]) => ({ key, value: v.value, type: v.sensitive ? 'sensitive' : 'encrypted', target: ['production', 'preview'] })),
    });
    log(`  set ${own.map(([k]) => k).join(', ')}`);
    changed = true;
  }

  if (shared.length) {
    const { data = [] } = (await api(`${VC}/v1/env${q ? `?${q}` : ''}`, { token })) ?? {};
    for (const key of shared) {
      const variable = data.find((v) => v.key === key);
      if (!variable) { log(`  shared ${key}: not on the team yet (Vercel → Settings → Environment Variables)`); continue; }
      if ((variable.projectId ?? []).includes(project.id)) { log(`  shared ${key}: already linked`); continue; }
      await api(`${VC}/v1/env/${variable.id}${q ? `?${q}` : ''}`, { token, method: 'PATCH', body: { projectIdUpdates: { link: [project.id] } } });
      log(`  shared ${key}: linked`);
      changed = true;
    }
  }

  if (changed) {
    const { deployments = [] } = (await api(`${VC}/v6/deployments?projectId=${project.id}&target=production&limit=1${q ? `&${q}` : ''}`, { token })) ?? {};
    if (deployments[0]) {
      await api(`${VC}/v13/deployments${q ? `?${q}` : ''}`, { token, method: 'POST', body: { name, deploymentId: deployments[0].uid, target: 'production' } });
      log('  production redeployed with the new variables');
    }
  }
  return { id: project.id, existing: await envKeys({ token, q, id: project.id }) };
}

/** The variable names a Vercel project has (never their values). */
export async function envKeys({ token, q, id }) {
  const { envs = [] } = (await api(`${VC}/v9/projects/${id}/env${q ? `?${q}` : ''}`, { token })) ?? {};
  return envs.map((e) => e.key);
}

// ── Firebase ─────────────────────────────────────────────────────────────────

/** A Google access token from a service account's key (a signed JWT, no SDK). */
export async function googleToken(account, scope = 'https://www.googleapis.com/auth/cloud-platform') {
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({ iss: account.client_email, scope, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(account.private_key, 'base64url');
  const { access_token } = await api('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }).toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  });
  return access_token;
}

const FB = 'https://firebase.googleapis.com/v1beta1';

/** The app's Android app in the shared Firebase project (made if missing), and its google-services.json. */
export async function firebase({ account, app }) {
  const token = await googleToken(account);
  const project = `projects/${account.project_id}`;
  const { apps = [] } = (await api(`${FB}/${project}/androidApps?pageSize=100`, { token })) ?? {};
  let found = apps.find((a) => a.packageName === app.androidPackage);
  if (!found) {
    let op = await api(`${FB}/${project}/androidApps`, { token, method: 'POST', body: { packageName: app.androidPackage, displayName: app.name } });
    for (let i = 0; i < 30 && !op.done; i++) { await wait(3000); op = await api(`${FB}/${op.name}`, { token }); }
    if (op.error) throw new Error(`Firebase: ${op.error.message}`);
    found = op.response;
    log(`  Android app ${app.androidPackage} added to ${account.project_id}`);
  } else log(`  Android app ${app.androidPackage} already in ${account.project_id}`);
  const config = await api(`${FB}/${project}/androidApps/${found.appId}/config`, { token });
  return Buffer.from(config.configFileContents, 'base64').toString('utf8');
}

// ── Expo ─────────────────────────────────────────────────────────────────────

const gql = (token, query, variables) => api('https://api.expo.dev/graphql', { token, method: 'POST', body: { query, variables } }).then((r) => {
  if (r.errors?.length) throw new Error(`Expo: ${r.errors.map((e) => e.message).join('; ')}`);
  return r.data;
});

/**
 * The account's Google service account key for a client email: one already
 * on the Expo account (another app's, shared), else the JSON uploaded.
 */
async function expoKey(token, accountId, accountName, key) {
  const email = typeof key === 'string' ? key : key.client_email;
  const data = await gql(token, `query($n: String!) { account { byName(accountName: $n) { googleServiceAccountKeysPaginated(first: 100) { edges { node { id clientEmail } } } } } }`, { n: accountName });
  const hit = data.account.byName.googleServiceAccountKeysPaginated.edges.map((e) => e.node).find((k) => k.clientEmail === email);
  if (hit) return hit.id;
  if (typeof key === 'string') throw new Error(`Expo: no key for ${email} on the ${accountName} account`);
  const json = key;
  const made = await gql(token, `mutation($k: GoogleServiceAccountKeyInput!, $a: ID!) { googleServiceAccountKey { createGoogleServiceAccountKey(googleServiceAccountKeyInput: $k, accountId: $a) { id } } }`, { k: { jsonKey: json }, a: accountId });
  log(`  uploaded ${json.client_email} to the Expo account`);
  return made.googleServiceAccountKey.createGoogleServiceAccountKey.id;
}

/** Points the app's Android credentials at the shared FCM V1 key and the Play submission key. */
export async function expo({ token, app, fcm, play }) {
  const fullName = `@${app.owner}/${app.slug}`;
  const data = await gql(token, `query($f: String!, $p: String) { app { byFullName(fullName: $f) { id ownerAccount { id name } androidAppCredentials(filter: { applicationIdentifier: $p }) { id googleServiceAccountKeyForFcmV1 { id } googleServiceAccountKeyForSubmissions { id } } } } }`, { f: fullName, p: app.androidPackage });
  const target = data.app.byFullName;
  const account = target.ownerAccount;
  const want = {
    googleServiceAccountKeyForFcmV1Id: fcm ? await expoKey(token, account.id, account.name, fcm) : undefined,
    googleServiceAccountKeyForSubmissionsId: play ? await expoKey(token, account.id, account.name, play) : undefined,
  };
  let creds = target.androidAppCredentials[0];
  if (!creds) {
    const made = await gql(token, `mutation($i: AndroidAppCredentialsInput!, $a: ID!, $p: String!) { androidAppCredentials { createAndroidAppCredentials(androidAppCredentialsInput: $i, appId: $a, applicationIdentifier: $p) { id } } }`, { i: want, a: target.id, p: app.androidPackage });
    log(`  Android credentials made for ${app.androidPackage}`);
    return made;
  }
  if (want.googleServiceAccountKeyForFcmV1Id && creds.googleServiceAccountKeyForFcmV1?.id !== want.googleServiceAccountKeyForFcmV1Id) {
    await gql(token, `mutation($c: ID!, $k: ID!) { androidAppCredentials { setGoogleServiceAccountKeyForFcmV1(id: $c, googleServiceAccountKeyId: $k) { id } } }`, { c: creds.id, k: want.googleServiceAccountKeyForFcmV1Id });
    log('  push (FCM V1) key set');
  }
  if (want.googleServiceAccountKeyForSubmissionsId && creds.googleServiceAccountKeyForSubmissions?.id !== want.googleServiceAccountKeyForSubmissionsId) {
    await gql(token, `mutation($c: ID!, $k: ID!) { androidAppCredentials { setGoogleServiceAccountKeyForSubmissions(id: $c, googleServiceAccountKeyId: $k) { id } } }`, { c: creds.id, k: want.googleServiceAccountKeyForSubmissionsId });
    log('  Play submission key set');
  }
}

// ── The run ──────────────────────────────────────────────────────────────────

async function step(name, key, fn) {
  if (!key) { log(`- ${name}: skipped (no ${name === 'github' ? 'REPO_ADMIN_TOKEN' : name === 'supabase' ? 'SUPABASE_ACCESS_TOKEN' : name === 'vercel' ? 'VERCEL_TOKEN' : name === 'firebase' ? 'FIREBASE_SERVICE_ACCOUNT' : 'EXPO_TOKEN'})`); return undefined; }
  log(`- ${name}`);
  return fn();
}

export async function main() {
  const appDir = env.APP_DIR || '.';
  const app = appFrom(appDir);
  const repo = env.GITHUB_REPOSITORY;
  const vercelName = env.VERCEL_PROJECT || app.slug;
  /** The app's folder in the repository: Vercel's root directory. */
  const rootDirectory = env.APP_FOLDER || '.';
  const site = env.SITE_URL || undefined;
  const failures = [];
  const run = async (...a) => step(...a).catch((e) => { failures.push(a[0]); log(`  failed: ${e.message}`); });

  await run('github', env.REPO_ADMIN_TOKEN, () => github({ repo, token: env.REPO_ADMIN_TOKEN, rulesetFile: env.RULESET_FILE || '.github/rulesets/main-rebase-only.json' }));

  const vercelQ = env.VERCEL_TEAM ? `teamId=${env.VERCEL_TEAM}` : '';
  const vercelHas = env.VERCEL_TOKEN
    ? await vercelProject({ token: env.VERCEL_TOKEN, team: env.VERCEL_TEAM, name: vercelName, repo, rootDirectory })
      .then((p) => envKeys({ token: env.VERCEL_TOKEN, q: vercelQ, id: p.id })).catch(() => [])
    : [];
  const sb = await run('supabase', env.SUPABASE_ACCESS_TOKEN, () => supabase({
    token: env.SUPABASE_ACCESS_TOKEN, app, ref: env.SUPABASE_PROJECT_REF, org: env.SUPABASE_ORG, region: env.SUPABASE_REGION, site,
    google: { webClientId: env.GOOGLE_WEB_CLIENT_ID, iosClientId: env.GOOGLE_IOS_CLIENT_ID, secret: env.GOOGLE_WEB_CLIENT_SECRET },
    needDbUrl: Boolean(env.VERCEL_TOKEN) && (!vercelHas.includes('SUPABASE_DB_URL') || env.ROTATE_DB_PASSWORD === 'true'),
  }));

  await run('vercel', env.VERCEL_TOKEN, () => vercel({
    token: env.VERCEL_TOKEN, team: env.VERCEL_TEAM, name: vercelName, repo, rootDirectory,
    set: {
      SUPABASE_DB_URL: { value: sb?.dbUrl, sensitive: true },
      SUPABASE_PUBLISHABLE_KEY: { value: sb?.publishable && !vercelHas.includes('SUPABASE_PUBLISHABLE_KEY') ? sb.publishable : undefined },
      OWNER_EMAIL: { value: env.OWNER_EMAIL && !vercelHas.includes('OWNER_EMAIL') ? env.OWNER_EMAIL : undefined },
    },
    shared: (env.SHARED_ENV ?? 'ANTHROPIC_API_KEY,RESEND_API_KEY').split(',').map((s) => s.trim()).filter(Boolean),
  }));

  // A key's JSON, or the client email of one already on the Expo account.
  const fcm = env.FIREBASE_SERVICE_ACCOUNT ? JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) : env.EXPO_FCM_KEY_EMAIL || null;
  const play = env.PLAY_SERVICE_ACCOUNT_JSON ? JSON.parse(env.PLAY_SERVICE_ACCOUNT_JSON) : env.EXPO_PLAY_KEY_EMAIL || null;
  await run('firebase', typeof fcm === 'object' && fcm && app.androidPackage, async () => {
    const json = await firebase({ account: fcm, app });
    if (!env.EXPO_TOKEN) return log('  google-services.json not stored: no EXPO_TOKEN');
    const file = path.join(mkdtempSync(path.join(tmpdir(), 'gs-')), 'google-services.json');
    writeFileSync(file, json);
    execFileSync('npx', ['-y', 'eas-cli@latest', 'env:set', '--name', 'GOOGLE_SERVICES_JSON', '--type', 'file', '--value', file, '--environment', 'production', '--environment', 'preview', '--visibility', 'sensitive', '--non-interactive'], { cwd: appDir, stdio: 'inherit' });
    log('  google-services.json stored in EAS as GOOGLE_SERVICES_JSON');
  });
  await run('expo', env.EXPO_TOKEN && app.owner && app.androidPackage && (fcm || play), () => expo({ token: env.EXPO_TOKEN, app, fcm, play }));

  if (failures.length) {
    console.error(`Failed: ${failures.join(', ')}. The rest is done; fix and run again.`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exitCode = 1; });
