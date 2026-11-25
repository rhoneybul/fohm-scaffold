/** The generator: options, making an app from the template, the in-repo mode, and the CLI's one command. Plain Node: npm test. */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { newApp } from '../lib/generate.mjs';
import { QUESTIONS, countryCode, resolveOptions } from '../lib/options.mjs';

const CLI = path.join(import.meta.dirname, '..', 'bin', 'fohm-scaffold.mjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'fohm-'));
const read = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');

test('options: only the name is required, the rest follow from it', () => {
  const { options } = resolveOptions({ name: 'Tide Pool', domain: 'https://tidepool.app/' });
  assert.equal(options.slug, 'tide-pool');
  assert.equal(options.kind, 'coaching');
  assert.equal(options.domain, 'tidepool.app');
  assert.equal(options.bundleId, 'app.tidepool');
  assert.equal(options.supportEmail, 'hello@tidepool.app');
  assert.equal(options.ownerWord, 'coach', 'a coaching app calls its owner the coach');
  assert.equal(resolveOptions({ name: 'X', kind: 'app' }).options.ownerWord, 'owner');
});

test('options: bad answers come back as errors, all at once', () => {
  const { errors } = resolveOptions({ name: '', kind: 'film', accent: 'red', bundleId: 'no' });
  assert.equal(errors.length, 4);
});

test('a new app carries its name, ids, colour and kind into the right files', () => {
  const dir = path.join(tmp(), 'tide');
  const r = newApp({ name: 'Tide Pool', kind: 'game', accent: '#3355AA', bundleId: 'app.tidepool', ownerWord: 'coach' }, { dir, git: false });
  assert.equal(r.ok, true);
  const app = JSON.parse(read(dir, 'app.json')).expo;
  assert.equal(app.name, 'Tide Pool');
  assert.equal(app.ios.bundleIdentifier, 'app.tidepool');
  assert.equal(app.android.package, 'app.tidepool');
  assert.equal(JSON.parse(read(dir, 'package.json')).name, 'tide-pool');
  assert.match(read(dir, 'src/lib/brand.ts'), /kind: 'game' as/);
  assert.match(read(dir, 'src/lib/brand.ts'), /ownerWord: 'coach'/);
  assert.match(read(dir, 'src/lib/theme.ts'), /accent: '#3355AA'/);
  assert.match(read(dir, '.github/workflows/test.yml'), /supabase_db_tide-pool/);
  // The server's copy for emails and Tapp's links, and Supabase's auth emails.
  assert.match(read(dir, 'api/_lib/app.ts'), /ACCENT = '#3355AA'/);
  assert.match(read(dir, 'api/_lib/app.ts'), /BUNDLE_ID = 'app.tidepool'/);
  for (const f of fs.readdirSync(path.join(dir, 'supabase/templates'))) {
    const t = read(dir, `supabase/templates/${f}`);
    assert.ok(t.includes('Tide Pool') && t.includes('#3355AA') && !/Starter|#2F6B4F/.test(t), `${f} carries the app's name and accent`);
  }
  assert.ok(!fs.existsSync(path.join(dir, 'node_modules')));
  assert.ok(!fs.existsSync(path.join(dir, '.fohm')), 'no state file: the skills keep no state');
  assert.ok(!fs.existsSync(path.join(dir, 'public', 'og.png')), 'no share card with the template’s name on it');
  assert.equal(r.next, 'Open this folder in Claude Code and run the new-app skill.');
});

test('a new app refuses a folder that already has things in it', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'x'), '');
  assert.throws(() => newApp({ name: 'X' }, { dir, git: false }), /isn't empty/);
});

test('the CLI speaks JSON when asked, and never prompts', () => {
  const dir = path.join(tmp(), 'cli-app');
  const made = JSON.parse(execFileSync('node', [CLI, 'new', dir, '--name', 'Cli App', '--kind', 'game', '--no-git', '--no-install', '--json'], { encoding: 'utf8' }));
  assert.equal(made.ok, true);
  assert.equal(made.options.kind, 'game');
  assert.match(made.next, /new-app skill/);
  for (const gone of ['status', 'check', 'names', 'mcp']) assert.equal(spawnSync('node', [CLI, gone, '--json'], { encoding: 'utf8' }).status, 1, `${gone} is gone: only new`);
  const bad = spawnSync('node', [CLI, 'new', path.join(tmp(), 'b'), '--accent', 'red', '--name', 'B', '--no-install', '--json'], { encoding: 'utf8' });
  assert.equal(bad.status, 1, 'a bad answer exits non-zero');
  assert.equal(JSON.parse(bad.stdout).ok, false);
});

test('the generated app knows its name on the server too', () => {
  const dir = path.join(tmp(), 'n');
  newApp({ name: 'Named App' }, { dir, git: false });
  assert.match(read(dir, 'api/_lib/app.ts'), /APP_NAME = 'Named App'/);
});

test('the strategy: idea and business go into the product brief; the apps they like into DESIGN.md', () => {
  const dir = path.join(tmp(), 's');
  newApp({ name: 'Swell', idea: 'A pocket surf coach for beginners.', business: 'A surf school', inspiration: 'Speak,  Ahead,' }, { dir, git: false });
  assert.match(read(dir, 'PRODUCT.md'), /## The thesis\n\nA pocket surf coach for beginners\.\n\nThe business: A surf school\n\n## Platform/);
  assert.match(read(dir, 'DESIGN.md'), /Apps the owner likes: Speak, Ahead\./);
  assert.match(read(dir, 'docs/RESEARCH.md'), /A pocket surf coach for beginners\./);
  assert.match(read(dir, 'src/lib/brand.ts'), /kind: 'coaching' as/);
});

test('inside an existing repository: the workflows go to its root, scoped to the folder, and no git init', () => {
  const root = tmp();
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  fs.mkdirSync(path.join(root, '.github', 'workflows'), { recursive: true });
  fs.writeFileSync(path.join(root, '.github', 'workflows', 'test.yml'), 'name: The game\n');
  const dir = path.join(root, 'app');
  const r = newApp({ name: 'Inside' }, { dir });
  assert.equal(r.ok, true);
  assert.deepEqual(r.repo.workflows, ['.github/workflows/app-test.yml', '.github/workflows/app-smoke.yml', '.github/workflows/app-setup.yml']);
  assert.equal(r.repo.folder, 'app');
  assert.ok(!fs.existsSync(path.join(dir, '.git')), 'no git init inside the repository');
  assert.ok(!fs.existsSync(path.join(dir, '.github')), 'GitHub reads workflows only at the root');
  assert.equal(read(root, '.github/workflows/test.yml'), 'name: The game\n', 'the repository’s own workflow is left alone');
  const test = read(root, '.github/workflows/app-test.yml');
  assert.match(test, /pull_request:\n    paths: \['app\/\*\*', '\.github\/workflows\/app-test\.yml'\]/);
  assert.match(test, /push:\n    branches: \[main\]\n    paths: \['app\/\*\*'/);
  assert.match(test, /defaults:\n  run:\n    working-directory: app\n/);
  assert.match(test, /cache-dependency-path: app\/package-lock\.json/);
  assert.match(test, /supabase_db_inside/);
  const smoke = read(root, '.github/workflows/app-smoke.yml');
  assert.match(smoke, /^on:\n  workflow_dispatch:\n\n/m, 'run by hand: another project here deploys too');
  assert.doesNotMatch(smoke, /^  deployment_status:/m);
  assert.match(smoke, /working-directory: app/);
  assert.match(smoke, /vars\.APP_SMOKE_URL/);
  assert.match(smoke, /npm run test:smoke/);
  assert.match(read(dir, 'AGENTS.md'), /\.github\/workflows\/app-test\.yml` at the repository's root/);
  const setupFlow = read(root, '.github/workflows/app-setup.yml');
  assert.match(setupFlow, /working-directory: /);
  assert.match(setupFlow, /APP_FOLDER: /);
  assert.ok(fs.existsSync(path.join(root, '.github/rulesets/main-rebase-only.json')), 'the ruleset Set up applies is at the root');
  assert.ok(!fs.existsSync(path.join(root, '.github/workflows/app-publish.yml')), 'publishing is an Expo workflow in the app, not a GitHub one');
  assert.ok(fs.existsSync(path.join(dir, '.eas/workflows/publish.yml')));
  assert.match(read(dir, 'scripts/release.ts'), /RELEASE_TAG_PREFIX \?\? 'inside-'/, 'its own tags, never another project’s app-v*');
  // A second app in the same repository gets its own workflow names.
  const second = newApp({ name: 'Other' }, { dir: path.join(root, 'other') });
  assert.deepEqual(second.repo.workflows, ['.github/workflows/other-test.yml', '.github/workflows/other-smoke.yml', '.github/workflows/other-setup.yml']);
  // And outside any repository, --in-repo is refused.
  assert.throws(() => newApp({ name: 'Out' }, { dir: path.join(tmp(), 'out'), inRepo: true }), /isn't in a git repository/);
});

test('programs, not coaching: --coach no makes an app with nobody behind it, speaking as itself', () => {
  const { options } = resolveOptions({ name: 'P', coach: 'no' });
  assert.equal(options.coach, false);
  assert.equal(options.ownerWord, 'team', 'the people who run it are the team');
  assert.equal(resolveOptions({ name: 'P' }).options.coach, true, 'a coach unless told otherwise');
  assert.match(resolveOptions({ name: 'P', coach: 'maybe' }).errors[0], /coach is yes/);
  const dir = path.join(tmp(), 'p');
  newApp({ name: 'P', coach: 'no' }, { dir, git: false });
  assert.match(read(dir, 'src/lib/brand.ts'), /^  coach: false,$/m);
  assert.match(read(dir, 'src/lib/brand.ts'), /ownerWord: 'team'/);
  assert.match(read(dir, 'AGENTS.md'), /There is no coach: no coach is shown or offered/);
  const cli = JSON.parse(execFileSync('node', [CLI, 'new', path.join(tmp(), 'q'), '--name', 'Q', '--coach', 'no', '--no-git', '--no-install', '--json'], { encoding: 'utf8' }));
  assert.equal(cli.options.coach, false);
  const coached = path.join(tmp(), 'c');
  newApp({ name: 'C' }, { dir: coached, git: false });
  assert.match(read(coached, 'src/lib/brand.ts'), /^  coach: true,$/m);
});

test('routes: --routes yes switches on route planning; off by default; anything else is refused', () => {
  assert.equal(resolveOptions({ name: 'R' }).options.routes, false, 'no maps unless asked for');
  assert.equal(resolveOptions({ name: 'R', routes: 'yes' }).options.routes, true);
  assert.match(resolveOptions({ name: 'R', routes: 'sometimes' }).errors[0], /routes is yes/);
  const dir = path.join(tmp(), 'r');
  newApp({ name: 'R', routes: 'yes' }, { dir, git: false });
  assert.match(read(dir, 'src/lib/brand.ts'), /^  routes: true,$/m);
  const cli = JSON.parse(execFileSync('node', [CLI, 'new', path.join(tmp(), 'r2'), '--name', 'R2', '--routes', 'yes', '--no-git', '--no-install', '--json'], { encoding: 'utf8' }));
  assert.equal(cli.options.routes, true);
  const plain = path.join(tmp(), 'r3');
  newApp({ name: 'R3' }, { dir: plain, git: false });
  assert.match(read(plain, 'src/lib/brand.ts'), /^  routes: false,$/m);
});

test('programs: the pattern for a program dated to a goal comes with every app, and AGENTS.md points to it', () => {
  const dir = path.join(tmp(), 'prog');
  newApp({ name: 'Prog' }, { dir, git: false });
  const doc = read(dir, 'docs/PROGRAMS.md');
  for (const rule of [/never invents/, /retries once/, /rule-based builder always works/i, /waitUntil/, /Haiku builds; Opus stays for chat/]) assert.match(doc, rule);
  assert.match(read(dir, 'AGENTS.md'), /docs\/PROGRAMS\.md/);
});

test('the registered office address: asked for, carried in registration, shown on the terms', () => {
  const { options } = resolveOptions({ name: 'A', registration: 'company number 01234567, registered in England and Wales', address: '1 High Street, Bristol BS1 1AA' });
  assert.equal(options.registration, 'company number 01234567, registered in England and Wales, at 1 High Street, Bristol BS1 1AA');
  assert.equal(resolveOptions({ name: 'A', registration: 'ABN 1, at 2 George St', address: '2 George St' }).options.registration, 'ABN 1, at 2 George St', 'never twice');
  assert.equal(resolveOptions({ name: 'A', address: 'at 9 Low Road' }).options.registration, 'at 9 Low Road');
  const dir = path.join(tmp(), 'addr');
  newApp({ name: 'A', registration: 'company number 01234567', address: '1 High Street, Bristol' }, { dir, git: false });
  assert.match(read(dir, 'src/lib/brand.ts'), /registration: 'company number 01234567, at 1 High Street, Bristol',/);
  assert.match(read(dir, 'src/lib/legal.ts'), /APP\.registration/, 'the terms and privacy policy show it beside the operator');
  assert.ok(QUESTIONS.some((q) => q.key === 'address'));
});

test('options: the country is a code where there is specific guidance, as typed elsewhere; the registration passes through', () => {
  assert.equal(countryCode('Australia'), 'AU');
  assert.equal(countryCode(' U.K. '), 'GB');
  assert.equal(countryCode('england'), 'GB');
  assert.equal(countryCode('USA'), 'US');
  assert.equal(countryCode('Portugal'), 'Portugal');
  assert.equal(countryCode(''), '');
  const { options } = resolveOptions({ name: 'X', country: 'australia', registration: 'ABN 51 824 753 556' });
  assert.equal(options.country, 'AU');
  assert.equal(options.registration, 'ABN 51 824 753 556');
  assert.match(resolveOptions({ name: 'X', registration: 'a "quoted" number' }).errors[0], /registration/);
});

test('a registered business: the terms show its number; one not registered yet leaves it blank', () => {
  const dir = path.join(tmp(), 'reg');
  newApp({ name: 'Reg', operator: 'Reg Ltd', registration: 'company number 01234567' }, { dir, git: false });
  assert.match(read(dir, 'src/lib/brand.ts'), /registration: 'company number 01234567',/);
  assert.match(read(dir, 'src/lib/legal.ts'), /APP\.registration \? `\$\{APP\.operator\} \(\$\{APP\.registration\}\)`/);
  const open = path.join(tmp(), 'open');
  newApp({ name: 'Open' }, { dir: open, git: false });
  assert.match(read(open, 'src/lib/brand.ts'), /registration: '',/);
});

test('registration: "no" or "not yet" leaves it blank; a bare "yes" is asked for the number', () => {
  for (const answer of ['no', 'Not yet', 'none', 'N/A']) {
    const dir = path.join(tmp(), 'no');
    newApp({ name: 'No', registration: answer }, { dir, git: false });
    assert.match(read(dir, 'src/lib/brand.ts'), /registration: '',/, answer);
  }
  assert.match(resolveOptions({ name: 'X', registration: 'yes' }).errors[0], /the number itself/);
});

test('what people type goes in as typed: $& and $1 are text, and line breaks are refused', () => {
  const dir = path.join(tmp(), 'dollar');
  newApp({ name: 'Cash $& Carry', operator: 'Cash $1 Ltd', registration: 'ABN 51 $& 556', idea: 'Costs $$ less' }, { dir, git: false });
  const brand = read(dir, 'src/lib/brand.ts');
  assert.match(brand, /name: 'Cash \$& Carry',/);
  assert.match(brand, /operator: 'Cash \$1 Ltd',/);
  assert.match(brand, /registration: 'ABN 51 \$& 556',/);
  assert.match(read(dir, 'PRODUCT.md'), /Costs \$\$ less/);
  assert.match(read(dir, 'api/_lib/app.ts'), /APP_NAME = 'Cash \$& Carry'/);
  assert.match(resolveOptions({ name: 'X', registration: 'company 1,\nregistered in England' }).errors.join(), /line breaks/);
});

test('new installs the dependencies last, unless --no-install', () => {
  const bin = tmp();
  fs.writeFileSync(path.join(bin, 'npm'), '#!/bin/sh\necho "$@" > installed\n', { mode: 0o755 });
  const dir = path.join(tmp(), 'inst');
  const r = spawnSync('node', [CLI, 'new', dir, '--name', 'Inst', '--no-git', '--json'], { encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}` } });
  assert.equal(JSON.parse(r.stdout).ok, true, r.stderr);
  assert.match(read(dir, 'installed'), /^install/);
});

test('CI: the app’s one test job is All tests, the check branch protection requires; in a repository it is App tests', () => {
  const dir = path.join(tmp(), 'ci');
  newApp({ name: 'Ci' }, { dir, git: false });
  assert.match(read(dir, '.github/workflows/test.yml'), /^  test:\n    name: All tests\n/m);
  const root = tmp();
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  newApp({ name: 'In' }, { dir: path.join(root, 'app') });
  assert.match(read(root, '.github/workflows/app-test.yml'), /^  test:\n    name: App tests\n/m);
});

test('TestFlight from a session: the Expo Publish workflow, the release script, the export compliance answer and the submit profile come with every app', () => {
  const dir = path.join(tmp(), 'tf');
  newApp({ name: 'Tide Flight', bundleId: 'com.tideflight.app' }, { dir, git: false });
  const publish = read(dir, '.eas/workflows/publish.yml');
  for (const step of [/workflow_dispatch:/, /type: build/, /type: submit/, /profile: production/]) assert.match(publish, step);
  assert.doesNotMatch(publish, /secrets\./, 'no secret anywhere: Expo runs it with the account');
  assert.ok(!fs.existsSync(path.join(dir, '.github/workflows/publish.yml')));
  assert.match(read(dir, 'scripts/release.ts'), /workflow:run/);
  const app = JSON.parse(read(dir, 'app.json')).expo;
  assert.equal(app.ios.config.usesNonExemptEncryption, false, 'the export compliance answer, so TestFlight never asks');
  assert.equal(app.ios.bundleIdentifier, 'com.tideflight.app');
  const eas = JSON.parse(read(dir, 'eas.json'));
  assert.ok(eas.submit.production.ios, 'a submit profile for iOS: appleTeamId and ascAppId go here');
  assert.equal(eas.cli.appVersionSource, 'remote');
});

test('a new app gets the GitHub machinery Naz and Etapa run on', () => {
  const dir = path.join(tmp(), 'gh');
  newApp({ name: 'Git Hub' }, { dir, git: false, install: false });
  for (const f of ['.github/workflows/test.yml', '.github/workflows/smoke.yml', '.eas/workflows/publish.yml', 'scripts/release.ts', '.github/workflows/setup.yml', 'scripts/setup-app.mjs', '.github/rulesets/main-rebase-only.json', '.github/pull_request_template.md', '.claude/skills/get-it-home/SKILL.md', 'docs/branch-protection.md'])
    assert.ok(fs.existsSync(path.join(dir, f)), `${f} comes with every app`);
  const ruleset = JSON.parse(fs.readFileSync(path.join(dir, '.github/rulesets/main-rebase-only.json'), 'utf8'));
  const checks = ruleset.rules.find((r) => r.type === 'required_status_checks').parameters.required_status_checks.map((c) => c.context);
  assert.deepEqual(checks, ['All tests'], 'the ruleset requires the gate test.yml names');
  assert.match(fs.readFileSync(path.join(dir, '.github/workflows/test.yml'), 'utf8'), /name: All tests/);
  assert.deepEqual(ruleset.rules.find((r) => r.type === 'pull_request').parameters.allowed_merge_methods, ['rebase']);
  assert.match(fs.readFileSync(path.join(dir, '.github/pull_request_template.md'), 'utf8'), /^Template:/m, 'the port-back line');
});
