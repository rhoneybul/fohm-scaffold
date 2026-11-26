/** The skills: each SKILL.md has its frontmatter, every relative link resolves, and every service the old steps named has its reference. Plain Node: npm test. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { QUESTIONS } from '../lib/options.mjs';

const SKILLS = path.join(import.meta.dirname, '..', 'skills');
const NAMES = ['new-app', 'app-design', 'app-launch'];
const markdown = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.md')).map((f) => path.join(dir, f));
const frontmatter = (text) => Object.fromEntries((/^---\n([\s\S]*?)\n---\n/.exec(text)?.[1] ?? '').split('\n').map((l) => l.split(/:\s(.*)/s).slice(0, 2)));

test('each skill has a SKILL.md with its name and a description that says when to use it', () => {
  assert.deepEqual(fs.readdirSync(SKILLS).sort(), [...NAMES].sort());
  for (const name of NAMES) {
    const fm = frontmatter(fs.readFileSync(path.join(SKILLS, name, 'SKILL.md'), 'utf8'));
    assert.equal(fm.name, name);
    assert.ok(fm.description?.length > 60 && fm.description.length < 1024, `${name}: a description`);
    assert.match(fm.description, /Use when/, `${name}: says when to use it`);
  }
  const front = frontmatter(fs.readFileSync(path.join(SKILLS, 'new-app', 'SKILL.md'), 'utf8')).description;
  for (const trigger of [/new app/, /scaffold/, /start an app/]) assert.match(front, trigger);
});

test('the front door stays short: detail goes in reference/', () => {
  for (const name of NAMES) assert.ok(fs.readFileSync(path.join(SKILLS, name, 'SKILL.md'), 'utf8').split('\n').length <= 200, `${name}/SKILL.md is under 200 lines`);
});

test('every relative link in a skill resolves inside it', () => {
  for (const name of NAMES)
    for (const file of markdown(path.join(SKILLS, name)))
      for (const [, href] of fs.readFileSync(file, 'utf8').matchAll(/\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:|#)/.test(href)) continue;
        const target = path.resolve(path.dirname(file), href.split('#')[0]);
        assert.ok(fs.existsSync(target), `${path.relative(SKILLS, file)} links to ${href}, which isn't there`);
        assert.ok(target.startsWith(path.join(SKILLS, name)), `${path.relative(SKILLS, file)} links outside its skill: ${href} (an uploaded skill can't reach it)`);
      }
});

test('the owner taps through a prototype of their app before anything is created: Claude Design, end to end, approved before new', () => {
  const skill = fs.readFileSync(path.join(SKILLS, 'new-app', 'SKILL.md'), 'utf8');
  const step = (word) => skill.search(new RegExp(`^## \\d+\\. ${word}`, 'm'));
  assert.ok(step('Research') > 0 && step('Research') < step('Prototype'), 'research comes before the prototype');
  assert.ok(step('Prototype') > 0 && step('Prototype') < step('Create'), 'the prototype comes before create');
  assert.match(skill, /Nothing is created until the owner approves the prototype/);
  assert.match(skill, /reference\/prototype\.md/);
  const ref = fs.readFileSync(path.join(SKILLS, 'new-app', 'reference', 'prototype.md'), 'utf8');
  for (const fact of [/Claude Design/, /create_from_type/, /\*\*Design\*\* type/, /390×844/, /#play-Main/, /is_interactive/, /fresh reviewer/, /until they say build it/, /never invented/])
    assert.match(ref, fact);
  assert.match(fs.readFileSync(path.join(SKILLS, 'app-design', 'SKILL.md'), 'utf8'), /approved prototype/, 'app-design builds to the prototype');
});

test('the prototype has its own logo, chosen from options, and uses it throughout', () => {
  const ref = fs.readFileSync(path.join(SKILLS, 'new-app', 'reference', 'prototype.md'), 'utf8');
  assert.ok(ref.search(/## 1a\. The logo, with options/) > 0 && ref.search(/## 1a\./) < ref.search(/## 2\. Make it in Claude Design/), 'the logo round comes before a screen is drawn');
  for (const fact of [/three or four concepts/, /decision page/, /at 29 px first/, /never the template's placeholder/, /## 1b\. The mark throughout/, /home screen/, /launch screen/, /landing page's header/, /Sign-in/, /dashboard's sidebar/, /\*\*The brand\*\*/, /src\/lib\/logo\.ts/, /`Lockup`/])
    assert.match(ref, fact);
  assert.match(fs.readFileSync(path.join(SKILLS, 'new-app', 'SKILL.md'), 'utf8'), /the logo round/);
  assert.match(fs.readFileSync(path.join(SKILLS, 'app-design', 'reference', 'logo.md'), 'utf8'), /prototype\.md/);
});

test('discovery is a live chat shaped by the answers, whose brief holds everything new needs, and ends in the prototype', () => {
  const skill = fs.readFileSync(path.join(SKILLS, 'new-app', 'SKILL.md'), 'utf8');
  assert.match(skill, /reference\/discovery\.md/);
  assert.doesNotMatch(skill, /Ask these in one message/, 'not one long list at once');
  const ref = fs.readFileSync(path.join(SKILLS, 'new-app', 'reference', 'discovery.md'), 'utf8');
  for (const fact of [/Open with a heads-up/, /three parts/, /Part 2 of 3/, /One or two questions a turn/, /their answers make relevant/, /Read before you ask/, /describe what someone does in the app/i, /I don't know, help me figure it out/, /two or three workflows/, /search_screens/, /search_flows/, /Mobbin link/, /what they like about each/, /Only when/, /brief\.md/, /Is this your app\?/, /prototype\.md/])
    assert.match(ref, fact);
  assert.doesNotMatch(ref.replace(/Never call it a hero journey/, ''), /hero journey/i, 'the person is asked to describe the workflow, never for a hero journey');
  const flag = (key) => `--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
  for (const q of QUESTIONS) assert.ok(ref.includes(`\`${flag(q.key)}\``), `the brief gathers ${flag(q.key)}, which new takes`);
  const proto = fs.readFileSync(path.join(SKILLS, 'new-app', 'reference', 'prototype.md'), 'utf8');
  assert.match(proto, /brief\.md/);
  assert.match(proto, /walks the owner's workflow from discovery, in detail/);
});

/** Every service the wizard's steps covered, and the file that now holds what it knew. */
const SERVICES = ['domain', 'business', 'store-accounts', 'github', 'supabase', 'vercel', 'inbox', 'owner', 'smoke', 'legal', 'stripe', 'posthog', 'sentry', 'resend', 'claude', 'google', 'push', 'eas', 'testflight', 'stores', 'tapp', 'accounts', 'mapbox', 'app-review', 'slack', 'doppler'];

test('every service has its reference, in the one shape', () => {
  const dir = path.join(SKILLS, 'app-launch', 'reference');
  for (const s of SERVICES) {
    const file = path.join(dir, `${s}.md`);
    assert.ok(fs.existsSync(file), `app-launch/reference/${s}.md`);
    const text = fs.readFileSync(file, 'utf8');
    for (const heading of ['**Why.**', '## What the agent does', '## What is the person\'s', '## How to check it']) assert.ok(text.includes(heading), `${s}.md has ${heading}`);
  }
  const skill = fs.readFileSync(path.join(SKILLS, 'app-launch', 'SKILL.md'), 'utf8');
  for (const s of SERVICES) assert.ok(skill.includes(`reference/${s}.md`), `app-launch's SKILL.md links ${s}.md`);
});

test('the hard-won details survive: store accounts, DMARC, the pooler, the closed test, the country lines', () => {
  const all = NAMES.flatMap((n) => markdown(path.join(SKILLS, n))).map((f) => fs.readFileSync(f, 'utf8')).join('\n');
  for (const fact of [/D-U-N-S/, /12 testers/, /14 days/, /_dmarc\./, /Session pooler/, /port 5432/, /6543/, /smtp\.resend\.com/, /abr\.gov\.au/, /Companies House/, /£90,000/, /A\$75,000/, /EIN/, /get_bulk_availability/, /get_access_to_vercel_url/, /TAPP_LINK_DOMAIN/, /FCM V1/, /STRIPE_WEBHOOK_SECRET/, /customer\.subscription\.deleted|\.deleted/, /management API refuses the proxy/, /usesNonExemptEncryption/, /guideline 4\.8/, /itunes\.apple\.com\/search/, /29 px/]) assert.match(all, fact);
});

test('the checklist page holds to the Artifact contract: no skeleton, a named title, themed tokens, a safe gutter', () => {
  const html = fs.readFileSync(path.join(SKILLS, 'app-launch', 'reference', 'checklist.html'), 'utf8');
  assert.doesNotMatch(html, /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i);
  assert.match(html, /<title>\{\{App\}\} checklist<\/title>/);
  assert.match(html, /<meta name="claude:viewport-fit-sides" content="cover">/);
  assert.match(html, /padding-left: max\(16px, env\(safe-area-inset-left, 0px\)\)/);
  assert.match(html, /@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\)/);
  assert.match(html, /:root\[data-theme="dark"\]/);
  assert.match(html, /<!-- STEPS: early/);
  assert.match(html, /body \{[^}]*background: var\(--bg\)/);
});
