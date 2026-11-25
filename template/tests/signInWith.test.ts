/** Signing in with Apple and Google (docs/SIGN-IN.md): which buttons show, Apple's name, the nonce, the iOS URL scheme. Plain Node: npm test. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from 'node:test';

import { appleName, googleIosUrlScheme, nonceFrom, sha256Hex, signInMethods, type SignInContext } from '../src/lib/signInWith';

const ON = { apple: true, google: true };
const CLIENTS = { webClientId: 'web.apps.googleusercontent.com', iosClientId: '123-abc.apps.googleusercontent.com' };
const NATIVE = { apple: true, google: true };
const methods = (over: Partial<SignInContext>) => signInMethods({ platform: 'ios', integrations: ON, google: CLIENTS, native: NATIVE, ...over });

test('an iPhone shows Sign in with Apple first, then Google', () => {
  assert.deepEqual(methods({}), ['apple', 'google']);
});

test('Apple shows only on iOS, with its provider on and its module in the build', () => {
  assert.deepEqual(methods({ platform: 'android' }), ['google']);
  assert.deepEqual(methods({ platform: 'web' }), ['google']);
  assert.deepEqual(methods({ integrations: { google: true } }), ['google']);
  assert.deepEqual(methods({ native: { apple: false, google: true } }), ['google']);
});

test('Google on the web needs only its provider; in the apps its module and client IDs too', () => {
  assert.deepEqual(methods({ platform: 'web', google: { webClientId: '', iosClientId: '' }, native: { apple: false, google: false } }), ['google']);
  assert.deepEqual(methods({ platform: 'web', integrations: { apple: true } }), []);
  assert.deepEqual(methods({ google: { ...CLIENTS, iosClientId: '' } }), ['apple']);
  assert.deepEqual(methods({ platform: 'android', google: { ...CLIENTS, iosClientId: '' } }), ['google']);
  assert.deepEqual(methods({ platform: 'android', google: { ...CLIENTS, webClientId: '' } }), []);
  assert.deepEqual(methods({ native: { apple: true, google: false } }), ['apple']);
  assert.deepEqual(methods({ integrations: {} }), []);
});

test('Apple’s name joins what it gave, and is empty after the first sign-in', () => {
  assert.equal(appleName({ givenName: ' Ana ', familyName: 'Lopez' }), 'Ana Lopez');
  assert.equal(appleName({ givenName: 'Ana', familyName: null }), 'Ana');
  assert.equal(appleName(null), '');
  assert.equal(appleName({ givenName: null, familyName: null }), '');
});

test('the nonce Apple gets is the SHA-256 of the one Supabase gets', () => {
  const nonce = nonceFrom(new Uint8Array(32).map((_, i) => i * 7));
  assert.match(nonce, /^[0-9a-f]{64}$/);
  for (const text of [nonce, '', 'abc', 'a'.repeat(55), 'a'.repeat(56), 'b'.repeat(64), 'c'.repeat(130)])
    assert.equal(sha256Hex(text), createHash('sha256').update(text).digest('hex'), `length ${text.length}`);
});

test('the iOS URL scheme is the iOS client ID reversed, and the plugin joins the build only with one', () => {
  assert.equal(googleIosUrlScheme(CLIENTS.iosClientId), 'com.googleusercontent.apps.123-abc');
  assert.equal(googleIosUrlScheme(''), null);
  const { withGoogleSignIn, googleIosClientId } = createRequire(import.meta.url)('../app.config.js');
  const base = { plugins: ['expo-router'] };
  assert.deepEqual(withGoogleSignIn(base, ''), base);
  assert.deepEqual(withGoogleSignIn(base, CLIENTS.iosClientId).plugins[1], ['@react-native-google-signin/google-signin', { iosUrlScheme: 'com.googleusercontent.apps.123-abc' }]);
  assert.equal(typeof googleIosClientId(), 'string');
});
