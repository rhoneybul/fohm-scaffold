/** A new app opens on the house's launch screen: the splash configured, its images and the throbbing mark in place, in the app's own name. Plain Node: npm test. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { newApp } from '../lib/generate.mjs';

const read = (d, f) => fs.readFileSync(path.join(d, f), 'utf8');

test('a new app has the splash, its images, the mark in code and the throbbing loader', () => {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fohm-')), 'tide');
  assert.equal(newApp({ name: 'Tide Pool', accent: '#3355AA' }, { dir, git: false }).ok, true);
  const app = JSON.parse(read(dir, 'app.json')).expo;
  const splash = app.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen')?.[1];
  assert.ok(splash, 'expo-splash-screen is configured');
  assert.equal(splash.backgroundColor, '#111113', 'on the ink, whatever the accent');
  for (const image of [splash.image, splash.dark.image, app.icon, ...Object.values(app.android.adaptiveIcon).filter((v) => v.startsWith('./')), app.web.favicon])
    assert.ok(fs.existsSync(path.join(dir, image)), `${image} comes with the app`);
  const deps = JSON.parse(read(dir, 'package.json')).dependencies;
  assert.ok(deps['expo-splash-screen'] && deps['react-native-svg']);
  assert.match(read(dir, 'src/components/logo-loader.tsx'), /export function LogoLoader/);
  assert.match(read(dir, 'src/components/logo-loader.tsx'), /export function LoadingSplash/);
  assert.match(read(dir, 'src/lib/logo.ts'), /export const MARK_PATH/);
  assert.match(read(dir, 'src/app/_layout.tsx'), /keepNativeSplash\(\)/);
  assert.match(read(dir, 'public/index.html'), /<div id="root"><\/div><!-- splash --><div id="splash"/, 'the web page shows the splash before its script runs');
  assert.equal(app.name, 'Tide Pool');
});
