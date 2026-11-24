/**
 * Tapp: the links the server asks for (fetch mocked), what a claim and a link
 * say, the native build plugin and the link domain. Plain Node: npm test.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { afterEach, test } from 'node:test';

import { BUNDLE_ID } from '../api/_lib/app';
import { clientOf } from '../api/_lib/seen';
import { TAPP_API, channelLink, inviteLink, newInviteCode, platformOf, readClaim, tappConfigured, tappPublicConfig, withinClaimWindow } from '../api/_lib/tapp';
import { readTappLink } from '../src/lib/tappLink';

const require = createRequire(import.meta.url);
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.TAPP_AUTH_TOKEN;
  delete process.env.TAPP_TOKEN;
  delete process.env.TAPP_BUNDLE_ID;
});

function fakeTapp(answer: { status?: number; body?: unknown } | Error) {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    if (answer instanceof Error) throw answer;
    return new Response(JSON.stringify(answer.body ?? {}), { status: answer.status ?? 200 });
  }) as typeof fetch;
  return calls;
}
const switchOn = () => Object.assign(process.env, { TAPP_AUTH_TOKEN: 'auth-1', TAPP_TOKEN: 'tapp-1' });

test('off until both tokens are set: no link, no request, nothing in /api/health', async () => {
  const calls = fakeTapp({ body: { influencer_url: 'https://x.tapp.so/a' } });
  assert.equal(tappConfigured(), false);
  assert.equal(tappPublicConfig(), null);
  assert.equal(await inviteLink('abcdef123456'), null);
  assert.equal(await channelLink('newsletter'), null);
  assert.equal(calls.length, 0);
});

test('an invite link is asked for the way Tapp’s SDKs ask: bearer auth token, the app id, Tapp’s own attribution', async () => {
  switchOn();
  const calls = fakeTapp({ body: { influencer_url: 'https://x.tapp.so/abc' } });
  assert.equal(await inviteLink('abcdef123456'), 'https://x.tapp.so/abc');
  assert.equal(calls[0].url, TAPP_API);
  assert.equal((calls[0].init.headers as Record<string, string>).authorization, 'Bearer auth-1');
  const body = JSON.parse(String(calls[0].init.body));
  assert.deepEqual(
    { token: body.tapp_token, bundle: body.bundle_id, mmp: body.mmp, influencer: body.influencer, kind: body.data.kind },
    { token: 'tapp-1', bundle: BUNDLE_ID, mmp: 3, influencer: 'abcdef123456', kind: 'invite' },
  );
  process.env.TAPP_BUNDLE_ID = 'com.other.app';
  await inviteLink('abcdef123456');
  assert.equal(JSON.parse(String(calls[1].init.body)).bundle_id, 'com.other.app');
});

test('a channel link is keyed go-<channel>, which no invite code can be', async () => {
  switchOn();
  const calls = fakeTapp({ body: { influencer_url: 'https://x.tapp.so/go' } });
  assert.equal(await channelLink('instagram'), 'https://x.tapp.so/go');
  const body = JSON.parse(String(calls[0].init.body));
  assert.equal(body.influencer, 'go-instagram');
  assert.deepEqual(body.data, { kind: 'channel', channel: 'instagram' });
  assert.equal(await channelLink('Not A Slug!'), null);
});

test('Tapp refusing, answering without a link, or unreachable is no link, never a throw', async () => {
  switchOn();
  fakeTapp({ status: 401, body: { message: 'bad token' } });
  assert.equal(await inviteLink('abcdef123456'), null);
  fakeTapp({ body: {} });
  assert.equal(await inviteLink('abcdef123456'), null);
  fakeTapp(new Error('network down'));
  assert.equal(await inviteLink('abcdef123456'), null);
});

test('invite codes are 12 hex characters, and a malformed one never reaches Tapp', async () => {
  assert.match(newInviteCode(), /^[0-9a-f]{12}$/);
  assert.notEqual(newInviteCode(), newInviteCode());
  switchOn();
  const calls = fakeTapp({ body: { influencer_url: 'x' } });
  assert.equal(await inviteLink('go-instagram'), null);
  assert.equal(calls.length, 0);
});

test('a claim is an invite code or a channel, and nothing else', () => {
  assert.deepEqual(readClaim({ code: ' ABCDEF123456 ' }), { code: 'abcdef123456' });
  assert.deepEqual(readClaim({ channel: 'newsletter' }), { channel: 'newsletter' });
  assert.equal(readClaim({ code: 'x' }), null);
  assert.equal(readClaim({ channel: '-bad' }), null);
  assert.equal(readClaim({}), null);
});

test('an invite counts within 14 days of sign-up', () => {
  const now = Date.parse('2026-06-15T00:00:00Z');
  assert.equal(withinClaimWindow('2026-06-02T00:00:00Z', now), true);
  assert.equal(withinClaimWindow('2026-05-31T00:00:00Z', now), false);
});

test('what the app reads back from a Tapp link', () => {
  assert.deepEqual(readTappLink({ influencer: 'abcdef123456', data: { kind: 'invite' } }), { code: 'abcdef123456' });
  assert.deepEqual(readTappLink({ influencer: 'go-newsletter', data: { kind: 'channel', channel: 'newsletter' } }), { channel: 'newsletter' });
  assert.deepEqual(readTappLink({ influencer: 'go-flyer' }), { channel: 'flyer' });
  assert.equal(readTappLink({ error: true, influencer: 'abcdef123456' }), null);
  assert.equal(readTappLink(null), null);
  assert.equal(readTappLink({ influencer: 'Some Influencer' }), null);
});

test('which phone a click came from, and which app a request says it is', () => {
  assert.equal(platformOf('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'), 'ios');
  assert.equal(platformOf('Mozilla/5.0 (Linux; Android 15)'), 'android');
  assert.equal(platformOf('Mozilla/5.0 (Macintosh)'), 'web');
  assert.deepEqual(clientOf(new Headers({ 'x-app-platform': 'iOS', 'x-app-version': '1.2.0' })), { platform: 'ios', version: '1.2.0' });
  assert.deepEqual(clientOf(new Headers({ 'x-app-platform': 'toaster', 'x-app-version': '<script>' })), { platform: null, version: null });
});

test('the iOS build gets Tapp’s pods as static frameworks, once', () => {
  const { addTappStaticFrameworks } = require('../plugins/withTappStaticFrameworks.js');
  const podfile = "target 'App' do\n  use_expo_modules!\n  post_install do |installer|\n  end\nend\n";
  const patched = addTappStaticFrameworks(podfile);
  assert.ok(patched.indexOf('pre_install do') < patched.indexOf('post_install do'));
  assert.match(patched, /"Tapp","Tapp-Networking"/);
  assert.equal(addTappStaticFrameworks(patched), patched);
});

test('the Tapp link domain opens the installed app only when the build sets it', () => {
  const { withTappLinkDomain } = require('../app.config.js');
  const base = { ios: { bundleIdentifier: 'a.b' }, android: { package: 'a.b' } };
  assert.deepEqual(withTappLinkDomain(base, undefined), base);
  const linked = withTappLinkDomain(base, 'app.tapp.so');
  assert.deepEqual(linked.ios.associatedDomains, ['applinks:app.tapp.so']);
  assert.equal(linked.android.intentFilters[0].data[0].host, 'app.tapp.so');
});
