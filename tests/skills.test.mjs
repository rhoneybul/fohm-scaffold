/** The skills: each SKILL.md has its frontmatter, every relative link resolves, and every service the old steps named has its reference. Plain Node: npm test. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

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

/** Every service the wizard's steps covered, and the file that now holds what it knew. */
const SERVICES = ['domain', 'business', 'store-accounts', 'github', 'supabase', 'vercel', 'inbox', 'owner', 'smoke', 'legal', 'stripe', 'posthog', 'sentry', 'resend', 'claude', 'google', 'push', 'eas', 'testflight', 'stores', 'tapp', 'accounts'];

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
