/** Progress through the steps, kept in the app at .fohm/state.json (commit it; it holds no secrets). */
import fs from 'node:fs';
import path from 'node:path';

const file = (dir) => path.join(path.resolve(dir), '.fohm', 'state.json');

export const initialState = (options) => ({ version: 1, createdAt: new Date().toISOString(), options, steps: { create: { done: true, at: new Date().toISOString() } }, values: {} });

export function loadState(dir) {
  const f = file(dir);
  if (!fs.existsSync(f)) throw new Error(`${path.resolve(dir)} isn't an app made by fohm-scaffold (no .fohm/state.json). Run \`fohm-scaffold new <folder>\` first, or pass --dir.`);
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}

export function saveState(dir, state) {
  const f = file(dir);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(state, null, 2) + '\n');
}
