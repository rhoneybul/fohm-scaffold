/** What the CLI and the MCP server both do. Every function returns plain JSON-able data. */
import path from 'node:path';

import { generate } from './generate.mjs';
import { QUESTIONS, resolveOptions } from './options.mjs';
import { loadState, saveState } from './state.mjs';
import { STEPS, nextStep, runCheck, status, stepById } from './steps.mjs';

const describe = (s, state) => ({ id: s.id, title: s.title, why: s.why, do: s.do, how: s.manual ? 'manual' : 'checked', optional: !!s.optional, done: !!state?.steps[s.id]?.done });

export const questions = () => QUESTIONS.map(({ key, ask, example, default: d, choices, required }) => ({ key, ask, example, default: d, choices, required: !!required }));

export function newApp(input, { dir, git = true } = {}) {
  const r = resolveOptions(input);
  if (r.errors) return { ok: false, errors: r.errors };
  const target = generate(dir || r.options.slug, r.options, { git });
  return { ok: true, dir: target, options: r.options, ...overview(target) };
}

export function overview(dir) {
  const state = loadState(dir);
  const steps = status(state);
  const next = nextStep(state);
  return { app: state.options.name, kind: state.options.kind, done: steps.filter((s) => s.done).length, skipped: steps.filter((s) => s.skipped).length, total: steps.length, steps, next: next ? describe(next, state) : null };
}

export function explain(id, dir) {
  const s = stepById(id);
  if (!s) throw new Error(`No step "${id}". Steps: ${STEPS.map((x) => x.id).join(', ')}`);
  return describe(s, dir ? loadState(dir) : null);
}

/** Checks one step, or every checkable step not yet done. */
export async function check(dir, id) {
  const state = loadState(dir);
  const ids = id ? [id] : STEPS.filter((s) => s.check && !s.manual && !state.steps[s.id]?.done && !state.steps[s.id]?.skipped).map((s) => s.id);
  const results = [];
  for (const i of ids) results.push(await runCheck(dir, state, i));
  saveState(dir, state);
  return { results, ...overview(dir) };
}

export function markDone(dir, id, value, undo = false, skip = false) {
  const s = stepById(id);
  if (!s) throw new Error(`No step "${id}". Steps: ${STEPS.map((x) => x.id).join(', ')}`);
  const state = loadState(dir);
  if (skip && !s.optional) throw new Error(`"${id}" isn't optional. Optional steps: ${STEPS.filter((x) => x.optional).map((x) => x.id).join(', ')}`);
  if (undo) state.steps[id] = { done: false };
  else if (skip) state.steps[id] = { done: false, skipped: true, at: new Date().toISOString() };
  else {
    if (id === 'vercel' && value && !/^https:\/\//.test(value)) throw new Error('The vercel value is the live URL, starting https://');
    state.steps[id] = { done: true, at: new Date().toISOString() };
    if (value !== undefined) state.values[id] = value;
  }
  saveState(dir, state);
  return overview(dir);
}

export const resolveDir = (d) => path.resolve(d || '.');
