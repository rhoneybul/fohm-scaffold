/**
 * Personal, with lots of photos (the app-design skill's photo rules): the
 * slots every app ships with. Read from the source, as plain Node can't load
 * React Native. A list row or hub card without a photo is the reviewer's to
 * catch; these hold the slots that come with the template.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const src = (f: string) => readFileSync(new URL(`../src/${f}`, import.meta.url), 'utf8');

test('Home: the member’s own photo by the greeting, and the goal they train for as a photo card', () => {
  const home = src('app/home.tsx');
  const greeting = home.indexOf('greeting(now, me.name)');
  const avatar = home.indexOf('<Avatar name={me.name} photoPath={me.photoPath}');
  assert.ok(greeting > 0 && avatar > greeting && avatar - greeting < 400, 'the avatar sits beside the greeting');
  assert.match(home, /size=\{(5[6-9]|[6-9]\d)\}/, 'prominent: 56pt or more');
  assert.match(home, /<GoalCard \/>/);
  assert.match(home, /function GoalCard[\s\S]*currentGoal\([\s\S]*savedPhotos\([\s\S]*<PhotoCard[^>]*credit=\{photo\}/, 'the goal’s photo, with its credit inside the card');
});

test('Account: the member’s photo, large, with a way to change it', () => {
  const account = src('app/account.tsx');
  assert.match(account, /<Avatar name=\{me\.name\} photoPath=\{me\.photoPath\} size=\{72\}/);
  assert.match(account, /Add a photo/);
});

test('the landing page leads with a photo slot, credited, and lists it on /credits', () => {
  const landing = src('components/landing.tsx');
  assert.ok(landing.indexOf('APP.heroPhoto?.url') < landing.indexOf('{APP.tagline}'), 'the photo comes before the headline in the page');
  assert.match(landing, /<CreditLink photo=\{APP\.heroPhoto\}/);
  assert.match(src('lib/brand.ts'), /heroPhoto: undefined as CreditedPhoto \| undefined/);
  assert.match(src('lib/credits.ts'), /APP\.heroPhoto/);
});

test('an empty state takes a photo and its credit, not only an icon', () => {
  const ui = src('components/ui.tsx');
  assert.match(ui, /export function Empty\(\{[^}]*photo[^}]*\}/);
  assert.match(ui, /creditLine\(photo\)/);
});

test('rows and cards have their photo slots: Row’s thumb, PhotoCard and PhotoHero with credits', () => {
  assert.match(src('components/ui.tsx'), /export function Row\(\{[^}]*thumb/);
  const board = src('components/board.tsx');
  assert.match(board, /export function PhotoCard\(\{[^}]*credit/);
  assert.match(board, /export function PhotoHero\(\{[^}]*credit/);
});
