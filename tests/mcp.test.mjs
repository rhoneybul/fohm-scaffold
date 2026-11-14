/** The MCP server over stdio: initialize, list tools, create an app and read its status. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { test } from 'node:test';

test('an MCP client can create an app and walk its steps', async () => {
  const server = spawn('node', [path.join(import.meta.dirname, '..', 'bin', 'fohm-scaffold.mjs'), 'mcp'], { stdio: ['pipe', 'pipe', 'inherit'] });
  const lines = readline.createInterface({ input: server.stdout });
  const waiting = new Map();
  lines.on('line', (l) => {
    const m = JSON.parse(l);
    waiting.get(m.id)?.(m);
  });
  let n = 0;
  const call = (method, params) =>
    new Promise((resolve) => {
      const id = ++n;
      waiting.set(id, resolve);
      server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    });
  try {
    const init = await call('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
    assert.equal(init.result.serverInfo.name, 'fohm-scaffold');
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
    const { result } = await call('tools/list', {});
    assert.deepEqual(result.tools.map((t) => t.name).sort(), ['scaffold_add_references', 'scaffold_check', 'scaffold_check_names', 'scaffold_create_github_repo', 'scaffold_explain', 'scaffold_mark_done', 'scaffold_new_app', 'scaffold_questions', 'scaffold_status']);

    const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'fohm-mcp-')), 'app');
    const made = await call('tools/call', { name: 'scaffold_new_app', arguments: { dir, name: 'Mcp App', kind: 'app', git: false } });
    assert.equal(made.result.isError, false);
    assert.equal(JSON.parse(made.result.content[0].text).next.id, 'research');

    const bad = await call('tools/call', { name: 'scaffold_new_app', arguments: { dir: dir + '2', name: 'X', accent: 'red' } });
    assert.equal(bad.result.isError, true);

    const refs = await call('tools/call', { name: 'scaffold_add_references', arguments: { dir, references: [{ app: 'Speak', screen: 'Onboarding', url: 'https://mobbin.com/screens/abc', take: 'one question per screen' }] } });
    assert.equal(refs.result.isError, false);
    assert.match(fs.readFileSync(path.join(dir, 'DESIGN.md'), 'utf8'), /\*\*Speak, Onboarding\*\* \(\[Mobbin\]\(https:\/\/mobbin\.com\/screens\/abc\)\): one question per screen/);
    const done = await call('tools/call', { name: 'scaffold_mark_done', arguments: { dir, step: 'review' } });
    assert.equal(JSON.parse(done.result.content[0].text).steps.find((s) => s.id === 'review').done, true);
  } finally {
    server.kill();
  }
});
