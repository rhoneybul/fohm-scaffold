/** The integrations' plain logic: Sentry envelopes, Stripe signatures and encoding. Plain Node: npm test. */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { envelope, parseDsn } from '../api/_lib/sentry';
import { formEncode, signForTest, verifyWebhook } from '../api/_lib/stripe';

test('a Sentry DSN is read into its key, host and project', () => {
  assert.deepEqual(parseDsn('https://abc123@o42.ingest.us.sentry.io/789')?.projectId, '789');
  assert.equal(parseDsn('https://abc123@o42.ingest.us.sentry.io/789')?.key, 'abc123');
  assert.equal(parseDsn('nonsense'), null);
  assert.equal(parseDsn(undefined), null);
});

test('a Sentry envelope is three lines: envelope header, item header, the event', () => {
  const lines = envelope(parseDsn('https://k@h.example/1')!, new TypeError('boom')).split('\n');
  assert.equal(lines.length, 3);
  assert.equal(JSON.parse(lines[1]).type, 'event');
  const event = JSON.parse(lines[2]);
  assert.deepEqual(event.exception.values[0], { type: 'TypeError', value: 'boom' });
  assert.equal(JSON.parse(lines[0]).event_id, event.event_id);
});

test('Stripe webhooks: a good signature passes; a bad, missing or old one fails', () => {
  const body = JSON.stringify({ type: 'x', data: { object: {} } });
  assert.equal(verifyWebhook(body, signForTest(body, 'whsec_1'), 'whsec_1').type, 'x');
  assert.throws(() => verifyWebhook(body, signForTest(body, 'other'), 'whsec_1'), /Bad signature/);
  assert.throws(() => verifyWebhook(body, null, 'whsec_1'), /Missing signature/);
  assert.throws(() => verifyWebhook(body, signForTest(body, 'whsec_1', 1000), 'whsec_1'), /too old/);
});

test('Stripe form encoding nests keys', () => {
  assert.deepEqual(formEncode({ a: 1, b: { c: 'x y', d: { 0: 2 } }, skip: undefined }), ['a=1', 'b%5Bc%5D=x%20y', 'b%5Bd%5D%5B0%5D=2']);
});
