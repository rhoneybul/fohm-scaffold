/** `new --from`: an app made from the app builder's brief.json, with no flags retyped. Plain Node: npm test. */
import assert from 'node:assert/strict';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { promisify } from 'node:util';

import { BRIEF_KIND, parseBrief, readBrief } from '../lib/brief.mjs';

const run = promisify(execFile);
const CLI = path.join(import.meta.dirname, '..', 'bin', 'fohm-scaffold.mjs');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'fohm-brief-'));
const read = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');

// What the app builder's /app-builder/submissions/<id>/brief.json serves.
const BRIEF = {
  fohm: BRIEF_KIND,
  version: 1,
  options: {
    name: 'Tide Pool',
    idea: 'A pocket surf coach for beginners, between lessons.',
    business: 'A Cornwall surf school.',
    kind: 'coaching',
    coach: 'yes',
    routes: 'no',
    inspiration: 'Runna, Strava',
    tagline: 'Surf more between lessons.',
    memberWord: 'surfer',
    ownerWord: 'coach',
    operator: 'Tide Pool',
    supportEmail: 'support@example.com',
    bundleId: 'com.example.tidepool',
    accent: '#1B5E9A',
    email: 'someone@example.com',
    nameSure: 'no',
  },
  answers: { template: 'aluzam', photo: 'https://upload.wikimedia.org/x.jpg' },
  brief: 'I want to make a new app with fohm-scaffold.\n\n## The app\n\n- **What is the app called?** Tide Pool\n',
};

const writeBrief = (data = BRIEF) => {
  const f = path.join(tmp(), 'brief.json');
  fs.writeFileSync(f, JSON.stringify(data));
  return f;
};

test('a brief gives new only the options it takes', () => {
  const { input } = parseBrief(BRIEF);
  assert.equal(input.name, 'Tide Pool');
  assert.equal(input.memberWord, 'surfer');
  assert.equal(input.email, undefined, 'the visitor’s email is not an option of new');
  assert.equal(input.nameSure, undefined);
});

test('anything that is not a version 1 brief is refused, saying why', () => {
  assert.throws(() => parseBrief({ name: 'X' }), /isn't an app builder brief/);
  assert.throws(() => parseBrief({ ...BRIEF, version: 2 }), /version 2/);
});

test('new --from a file makes the app, keeps the brief, and flags given win', () => {
  const dir = path.join(tmp(), 'tide');
  const out = execFileSync('node', [CLI, 'new', dir, '--from', writeBrief(), '--domain', 'tidepool.app', '--no-git', '--no-install', '--json'], { encoding: 'utf8' });
  const r = JSON.parse(out);
  assert.equal(r.ok, true);
  assert.equal(r.brief, 'docs/BRIEF.md');
  assert.match(r.next, /docs\/BRIEF\.md/);
  assert.equal(r.options.domain, 'tidepool.app', 'a flag beside --from is added');
  assert.equal(r.options.bundleId, 'com.example.tidepool', 'the brief’s app id is kept');
  assert.equal(JSON.parse(read(dir, 'app.json')).expo.name, 'Tide Pool');
  assert.match(read(dir, 'src/lib/brand.ts'), /memberWord: 'surfer'/);
  assert.match(read(dir, 'src/lib/theme.ts'), /#1B5E9A/i);
  const kept = read(dir, 'docs/BRIEF.md');
  assert.match(kept, /^# Tide Pool: the brief/);
  assert.match(kept, /What is the app called\?\*\* Tide Pool/);
});

test('new --from a link, with the folder left to the slug', async () => {
  const server = http.createServer((req, res) => {
    if (req.url !== '/brief.json') return res.writeHead(404).end();
    res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(BRIEF));
  });
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  const url = `http://127.0.0.1:${server.address().port}/brief.json`;
  try {
    assert.equal((await readBrief(url)).input.name, 'Tide Pool');
    await assert.rejects(readBrief(url.replace('brief', 'nope')), /404/);
    const cwd = tmp();
    const { stdout } = await run('node', [CLI, 'new', '--from', url, '--no-git', '--no-install', '--json'], { cwd });
    const r = JSON.parse(stdout);
    assert.equal(r.ok, true);
    assert.equal(r.dir, path.join(fs.realpathSync(cwd), 'tide-pool'));
    assert.ok(fs.existsSync(path.join(r.dir, 'docs', 'BRIEF.md')));
  } finally {
    server.close();
  }
});

test('new --from with nothing after it says what it needs', () => {
  const r = spawnSync('node', [CLI, 'new', path.join(tmp(), 'x'), '--from', '--json'], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /--from needs a link or a file/);
});
