/** The wizard: options, generating an app, steps and state, the CLI in JSON mode. Plain Node: npm test. */
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { check, markDone, newApp, overview } from '../lib/core.mjs';
import { resolveOptions } from '../lib/options.mjs';

const CLI = path.join(import.meta.dirname, '..', 'bin', 'fohm-scaffold.mjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'fohm-'));
const read = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');

test('options: only the name is required, the rest follow from it', () => {
  const { options } = resolveOptions({ name: 'Tide Pool', domain: 'https://tidepool.app/' });
  assert.equal(options.slug, 'tide-pool');
  assert.equal(options.kind, 'app');
  assert.equal(options.domain, 'tidepool.app');
  assert.equal(options.bundleId, 'app.tidepool');
  assert.equal(options.supportEmail, 'hello@tidepool.app');
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
  assert.ok(!fs.existsSync(path.join(dir, 'node_modules')));
  assert.equal(r.next.id, 'install');
});

test('a new app refuses a folder that already has things in it', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'x'), '');
  assert.throws(() => newApp({ name: 'X' }, { dir, git: false }), /isn't empty/);
});

test('steps: checks mark what passes; manual steps are marked by hand, with their values', async () => {
  const dir = path.join(tmp(), 'a');
  newApp({ name: 'A' }, { dir, git: false });
  const r = await check(dir, 'product');
  assert.equal(r.results[0].ok, false, 'the template PRODUCT.md is not filled in');
  fs.writeFileSync(path.join(dir, 'PRODUCT.md'), '# Product\n\nReal words.\n');
  assert.equal((await check(dir, 'product')).results[0].ok, true);
  assert.throws(() => markDone(dir, 'vercel', 'not-a-url'), /https/);
  markDone(dir, 'vercel', 'https://a.example.com');
  const o = overview(dir);
  assert.equal(o.steps.find((s) => s.id === 'vercel').value, 'https://a.example.com');
  const mobile = await check(dir, 'mobile-config');
  assert.equal(mobile.results[0].ok, false, 'the bundle id is still com.example');
});

test('the CLI speaks JSON when asked, and never prompts', () => {
  const dir = path.join(tmp(), 'cli-app');
  const made = JSON.parse(execFileSync('node', [CLI, 'new', dir, '--name', 'Cli App', '--kind', 'game', '--no-git', '--json'], { encoding: 'utf8' }));
  assert.equal(made.ok, true);
  assert.equal(made.options.kind, 'game');
  const status = JSON.parse(execFileSync('node', [CLI, 'status', '--dir', dir, '--json'], { encoding: 'utf8' }));
  assert.equal(status.total, status.steps.length);
  const bad = spawnSync('node', [CLI, 'new', path.join(tmp(), 'b'), '--accent', 'red', '--name', 'B', '--json'], { encoding: 'utf8' });
  assert.equal(bad.status, 1, 'a bad answer exits non-zero');
  assert.equal(JSON.parse(bad.stdout).ok, false);
});
