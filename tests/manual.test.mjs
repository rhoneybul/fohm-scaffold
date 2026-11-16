/** The manual-work page: what's on it, what isn't, and that it holds to claude.ai's Artifact contract. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { manual, markDone, newApp } from '../lib/core.mjs';
import { PAGE, contrast, inline, palette } from '../lib/manual.mjs';

const CLI = path.join(import.meta.dirname, '..', 'bin', 'fohm-scaffold.mjs');
const app = (input) => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fohm-manual-')), 'app');
  newApp({ name: 'Tide Pool', ...input }, { dir, git: false });
  return dir;
};
const page = (dir) => fs.readFileSync(path.join(dir, PAGE), 'utf8');

test('a new app gets its page: only what needs the person, the slow ones first', () => {
  const html = page(app({ country: 'Australia' }));
  assert.match(html, /<title>Tide Pool checklist<\/title>/);
  const early = html.slice(html.indexOf('Start these now'), html.indexOf('</section>'));
  for (const id of ['domain', 'business', 'store-accounts']) assert.match(early, new RegExp(`id="step-${id}"`), `${id} can't wait`);
  assert.match(html, /id="step-supabase"/);
  assert.match(html, /abr\.gov\.au/, 'the business step for where the business is');
  assert.doesNotMatch(html, /id="step-tests"|id="step-install"|id="step-github"/, 'nothing an agent can do alone');
  assert.match(html, /Answer the research’s open questions/, 'the person’s part of a shared step…');
  assert.doesNotMatch(html, /Delete the template line at the top of/, '…and not the agent’s');
  assert.equal((html.match(/id="step-domain"/g) ?? []).length, 1, 'listed once, under Start these now');
});

test('finished steps move to the foot as they are done or skipped', () => {
  const dir = app();
  markDone(dir, 'supabase', 'abcdefghij');
  markDone(dir, 'posthog', undefined, false, true);
  const html = page(dir);
  assert.doesNotMatch(html, /id="step-supabase"/);
  assert.match(html, /Done and skipped \(2\)/);
  assert.match(html, /abcdefghij/);
  assert.match(html, /1 of \d+ done, 1 skipped/);
});

test('the page escapes what people typed, and marks what is still unknown', () => {
  const dir = app({ registration: 'ABN <b>51</b>' });
  const html = page(dir);
  assert.match(html, /ABN &lt;b&gt;51&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>51<\/b>/);
  assert.match(html, /<var>&lt;domain&gt;<\/var>/, 'no domain yet');
});

test('the page holds to the Artifact contract: no skeleton, a named title, themed tokens, a safe gutter', () => {
  const html = page(app());
  assert.doesNotMatch(html, /<!doctype|<html[\s>]|<head[\s>]|<body[\s>]/i);
  assert.ok(html.startsWith('<title>'), 'the title is at the top');
  assert.match(html, /<meta name="claude:viewport-fit-sides" content="cover">/);
  assert.match(html, /padding-left: max\(16px, env\(safe-area-inset-left, 0px\)\)/);
  assert.match(html, /padding-right: max\(16px, env\(safe-area-inset-right, 0px\)\)/);
  assert.match(html, /@media \(prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\)/);
  assert.match(html, /:root\[data-theme="dark"\]/);
  assert.match(html, /body \{[^}]*background: var\(--bg\)/);
  for (const src of html.match(/(?:src|href)="https:\/\/[^"]+"/g) ?? []) {
    if (/fonts\.(googleapis|gstatic)\.com/.test(src)) continue;
    assert.doesNotMatch(src, /^src=/, `only Google Fonts load: ${src}`);
  }
});

test('colours: text keeps 4.5:1 in both themes, whatever the accent', () => {
  for (const accent of ['#2F6B4F', '#F2D777', '#FFFFFF', '#000000', '#3355AA', '#E8433A']) {
    for (const [name, t] of Object.entries(palette(accent))) {
      for (const [ink, bg] of [['ink', 'bg'], ['ink', 'surface'], ['ink-mid', 'bg'], ['ink-mid', 'accent-soft'], ['accent-ink', 'bg'], ['accent-ink', 'accent-soft']]) {
        assert.ok(contrast(t[ink], t[bg]) >= 4.5, `${accent} ${name}: ${ink} on ${bg} is ${contrast(t[ink], t[bg]).toFixed(2)}`);
      }
      assert.ok(contrast(t.accent, t.bg) >= 3, `${accent} ${name}: the progress bar shows`);
    }
  }
});

test('lines: links, commands, settings, files and placeholders', () => {
  assert.equal(inline('Then: fohm-scaffold done vercel --value https://<your domain>'), 'Then: <code>fohm-scaffold done vercel --value https://&lt;your domain&gt;</code>');
  assert.equal(inline('supabase.com → New project'), '<a href="https://supabase.com" target="_blank" rel="noopener">supabase.com</a> → New project');
  assert.equal(inline('Set STRIPE_SECRET_KEY (Sensitive)'), 'Set <code>STRIPE_SECRET_KEY</code> (Sensitive)');
  assert.equal(inline('See https://www.gov.uk/set-up-sole-trader.'), 'See <a href="https://www.gov.uk/set-up-sole-trader" target="_blank" rel="noopener">gov.uk/set-up-sole-trader</a>.');
  assert.equal(inline('npx eas-cli init   (links it)'), '<code>npx eas-cli init</code>   (links it)');
  assert.equal(inline('Edit src/lib/brand.ts for <domain>'), 'Edit <code>src/lib/brand.ts</code> for <var>&lt;domain&gt;</var>');
});

test('the artifact’s link is kept, so later updates go to the same page; anything but a link is refused', () => {
  const dir = app();
  assert.match(manual(dir).publish, /^Publish .* as an Artifact/);
  const r = manual(dir, { artifact: 'https://claude.ai/artifact/abc' });
  assert.equal(r.artifact, 'https://claude.ai/artifact/abc');
  assert.match(r.publish, /^Republish .* to https:\/\/claude\.ai\/artifact\/abc/);
  assert.throws(() => manual(dir, { artifact: 'claude.ai/artifact/abc' }), /https link/);
  const cli = JSON.parse(execFileSync('node', [CLI, 'manual', '--dir', dir, '--json'], { encoding: 'utf8' }));
  assert.equal(cli.artifact, 'https://claude.ai/artifact/abc');
  assert.equal(cli.file, path.join(dir, PAGE));
});
