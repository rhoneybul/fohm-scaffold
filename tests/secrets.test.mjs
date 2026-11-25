import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SHARED_SECRETS, copySecrets, reposFor } from '../lib/secrets.mjs';

/** A fake gh that records each call and the value it was handed on stdin. */
function fakeGh(answers = {}) {
  const calls = [];
  const gh = (args, input) => {
    calls.push({ args, input });
    const key = args.slice(0, 2).join(' ');
    if (answers[key] instanceof Error) throw answers[key];
    return answers[key] ?? '';
  };
  return { gh, calls };
}

test('each value goes to gh on stdin, never in its arguments, for every repository', () => {
  const { gh, calls } = fakeGh();
  const r = copySecrets({ repos: ['me/a', 'me/b'], env: { EXPO_TOKEN: 'tok-1', VERCEL_TOKEN: 'tok-2' } }, gh);
  assert.deepEqual(r.set, { 'me/a': ['EXPO_TOKEN', 'VERCEL_TOKEN'], 'me/b': ['EXPO_TOKEN', 'VERCEL_TOKEN'] });
  assert.deepEqual(calls[0], { args: ['secret', 'set', 'EXPO_TOKEN', '--repo', 'me/a'], input: 'tok-1' });
  assert.ok(calls.every((c) => !c.args.some((a) => a.startsWith('tok-'))), 'no value on a command line');
  assert.ok(r.missing.includes('SUPABASE_ACCESS_TOKEN'));
});

test('a repository that refuses is reported and the rest carry on', () => {
  const calls = [];
  const gh = (args, input) => { calls.push(args); if (args.includes('me/locked')) throw Object.assign(new Error('x'), { stderr: 'HTTP 403: Resource not accessible' }); return ''; };
  const r = copySecrets({ repos: ['me/locked', 'me/open'], env: { EXPO_TOKEN: 't' } }, gh);
  assert.equal(r.ok, false);
  assert.match(r.failed['me/locked'], /403/);
  assert.deepEqual(r.set['me/open'], ['EXPO_TOKEN']);
});

test('nothing in the environment is an error, not a silent no-op', () => {
  assert.throws(() => copySecrets({ repos: ['me/a'], env: {} }, () => ''), /export them first/);
});

test('--all lists every repository of the signed-in owner; --repo takes a list', () => {
  const { gh } = fakeGh({ 'api user': 'me\n', 'repo list': 'me/a\nme/b\n' });
  assert.deepEqual(reposFor({ all: true }, gh), ['me/a', 'me/b']);
  assert.deepEqual(reposFor({ repo: 'me/a, me/c' }), ['me/a', 'me/c']);
  assert.ok(SHARED_SECRETS.includes('EXPO_TOKEN'));
});
