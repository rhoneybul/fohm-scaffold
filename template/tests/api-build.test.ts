/**
 * The API as Vercel runs it: compiled to ES modules and loaded by plain Node.
 * Vercel doesn't run the TypeScript as the tests do (tsx forgives what Node
 * won't): a relative import needs its `.js` ending, an `@/` alias never
 * resolves, and a JSON import needs `with { type: 'json' }`. Each would pass
 * the typecheck and every other test, then fail every request in production.
 * This compiles api/ (and whatever in src/ it imports) with tsc, then imports
 * each route. No database or keys needed: a route only reads them when called.
 * Skipped when tsc isn't installed.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';

const ROOT = path.join(import.meta.dirname, '..');
const TSC = path.join(ROOT, 'node_modules', '.bin', 'tsc');
// Inside node_modules, so the compiled routes find their packages as they do on Vercel.
const OUT = path.join(ROOT, 'node_modules', '.cache', 'api-build');

const files = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith('.ts') ? [path.join(dir, e.name)] : []));

test('every API route compiles to ES modules and loads in plain Node', { skip: !fs.existsSync(TSC) && 'tsc is not installed' }, async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  const api = files(path.join(ROOT, 'api'));
  const r = spawnSync(
    TSC,
    ['--ignoreConfig', '--module', 'nodenext', '--moduleResolution', 'nodenext', '--target', 'es2022', '--resolveJsonModule', '--esModuleInterop', '--skipLibCheck', '--noCheck', '--rootDir', ROOT, '--outDir', OUT, ...api],
    { cwd: ROOT, encoding: 'utf8', timeout: 120_000 },
  );
  assert.equal(r.status, 0, `tsc failed:\n${r.stdout}${r.stderr}`);
  // Each compiled folder is ES modules, as api/package.json says on Vercel.
  for (const dir of new Set(fs.readdirSync(OUT))) if (fs.statSync(path.join(OUT, dir)).isDirectory()) fs.writeFileSync(path.join(OUT, dir, 'package.json'), '{ "type": "module" }\n');
  const routes = fs.readdirSync(path.join(OUT, 'api')).filter((f) => f.endsWith('.js'));
  assert.ok(routes.length >= 5, 'the routes were compiled');
  for (const route of routes) {
    const mod = await import(pathToFileURL(path.join(OUT, 'api', route)).href).catch((e: Error) => assert.fail(`api/${route} doesn't load as Vercel runs it: ${e.message}`));
    const handlers = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter((m) => typeof mod[m] === 'function');
    assert.ok(handlers.length, `api/${route} exports a handler for at least one method`);
  }
});
