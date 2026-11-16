/** Progress through the steps, kept in the app at .fohm/state.json (commit it; it holds no secrets). */
import fs from 'node:fs';
import path from 'node:path';

const file = (dir) => path.join(path.resolve(dir), '.fohm', 'state.json');

/** Version 2 added the domain, business, inbox and store-accounts steps (Nov 2026). */
const VERSION = 2;

/** A new app's progress: created, and its business already registered when it was given. */
export function initialState(options) {
  const at = new Date().toISOString();
  const state = { version: VERSION, createdAt: at, options, steps: { create: { done: true, at } }, values: {} };
  if (options.registration) {
    state.steps.business = { done: true, at };
    state.values.business = options.registration;
  }
  return state;
}

/**
 * An app made before a step existed: what its finished steps already settle.
 * Built for the stores, so it has its developer accounts; selling in them, so
 * someone is the seller; live on its own domain, so it owns one. The rest are
 * left open, and say so. Saved the next time anything is.
 */
function upgrade(state) {
  if ((state.version ?? 1) >= VERSION) return state;
  const at = new Date().toISOString();
  const steps = state.steps;
  const settledBy = (step) => ({ done: true, at, inferred: `from ${step}` });
  if (!steps['store-accounts'] && (steps['mobile-build']?.done || steps.stores?.done)) steps['store-accounts'] = settledBy(steps.stores?.done ? 'stores' : 'mobile-build');
  if (!steps.business && steps.stores?.done) steps.business = settledBy('stores');
  const host = liveHost(state.values.vercel);
  if (!steps.domain && host && !host.endsWith('.vercel.app')) {
    steps.domain = settledBy('vercel');
    state.values.domain ??= host.replace(/^www\./, '');
  }
  state.version = VERSION;
  return state;
}

function liveHost(url) {
  try {
    return url ? new URL(url).host : '';
  } catch {
    return '';
  }
}

export const hasState = (dir) => fs.existsSync(file(dir));

export function loadState(dir) {
  const f = file(dir);
  if (!fs.existsSync(f)) throw new Error(`${path.resolve(dir)} isn't an app made by fohm-scaffold (no .fohm/state.json). Run \`fohm-scaffold new <folder>\` first, or pass --dir.`);
  return upgrade(JSON.parse(fs.readFileSync(f, 'utf8')));
}

export function saveState(dir, state) {
  const f = file(dir);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(state, null, 2) + '\n');
}
