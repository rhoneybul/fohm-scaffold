/** What the emails say: HTML in the app's layout with a plain-text twin. Plain Node: npm test. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { layout, newEntryEmail, replyEmail, welcomeEmail } from '../api/_lib/emails';

test('every email has a subject, HTML and a plain-text twin saying the same', () => {
  process.env.SITE_URL = 'https://app.example.com';
  for (const email of [welcomeEmail('Sam'), newEntryEmail('Sam', 'My first clip', 'usr_1'), replyEmail('My first clip')]) {
    assert.ok(email.subject);
    assert.match(email.html, /^<!doctype html>/);
    assert.ok(!email.text.includes('<'), 'the text twin has no markup');
    assert.match(email.text, /https:\/\/app\.example\.com\//, 'the button is a link in the text too');
  }
  assert.match(newEntryEmail('Sam', 'x', 'usr_1').text, /\/admin\/people\/usr_1/);
  delete process.env.SITE_URL;
});

test('what people typed is escaped in the HTML', () => {
  const email = newEntryEmail('<b>Sam</b>', '"quote" & <script>', 'usr_1');
  assert.ok(!email.html.includes('<script>'));
  assert.ok(!email.html.includes('<b>Sam'));
  assert.match(email.html, /&lt;script&gt;/);
});

test('without a known site address there is no button, and no broken link', () => {
  delete process.env.SITE_URL;
  delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const email = layout({ subject: 's', heading: 'h', paragraphs: ['p'], button: { label: 'Go', path: '/home' } });
  assert.ok(!email.html.includes('href="/home"'));
  assert.ok(!email.text.includes('Go:'));
});
