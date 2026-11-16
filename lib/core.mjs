/** What the CLI and the MCP server both do. Every function returns plain JSON-able data. */
import path from 'node:path';

import { generate } from './generate.mjs';
import { PAGE, rememberArtifact, writePage } from './manual.mjs';
import { QUESTIONS, cleanDomain, isDomain, resolveOptions } from './options.mjs';
import { loadState, saveState } from './state.mjs';
import { createGithubRepo } from './github.mjs';
import { checkNames } from './names.mjs';
import { addReferences } from './references.mjs';
import { STEPS, linesFor, nextForAgent, nextStep, runCheck, status, stepById, stepsFor, whoDoes, yourLines } from './steps.mjs';

const describe = (s, state) => ({
  id: s.id,
  phase: s.phase,
  title: s.title,
  why: s.why,
  do: linesFor(s, state),
  how: s.manual ? 'manual' : 'checked',
  who: whoDoes(s),
  yours: yourLines(s, state),
  optional: !!s.optional,
  takes: s.takes ?? null,
  done: !!state?.steps[s.id]?.done,
});

export const questions = () => QUESTIONS.map(({ key, ask, example, default: d, choices, required }) => ({ key, ask, example, default: d, choices, required: !!required }));

export function newApp(input, { dir, git = true } = {}) {
  const r = resolveOptions(input);
  if (r.errors) return { ok: false, errors: r.errors };
  const target = generate(dir || r.options.slug, r.options, { git });
  return { ok: true, dir: target, options: r.options, ...updated(target) };
}

export function overview(dir) {
  const state = loadState(dir);
  const steps = status(state);
  const next = nextStep(state);
  const agent = nextForAgent(state);
  return {
    app: state.options.name,
    kind: state.options.kind,
    done: steps.filter((s) => s.done).length,
    skipped: steps.filter((s) => s.skipped).length,
    total: steps.length,
    steps,
    next: next ? describe(next, state) : null,
    nextForAgent: agent ? describe(agent, state) : null,
    manual: { file: path.join(path.resolve(dir), PAGE), artifact: state.values.artifact ?? null, waiting: steps.filter((s) => s.who !== 'agent' && !s.done && !s.skipped).length },
  };
}

/** The overview, after rewriting the manual-work page so it matches what just changed. */
function updated(dir) {
  writePage(dir);
  return overview(dir);
}

export function explain(id, dir) {
  const s = stepById(id);
  if (!s) throw new Error(`No step "${id}". Steps: ${STEPS.map((x) => x.id).join(', ')}`);
  return describe(s, dir ? loadState(dir) : null);
}

/** Checks one step, or every checkable step not yet done. */
export async function check(dir, id) {
  const state = loadState(dir);
  const ids = id ? [id] : stepsFor(state).filter((s) => s.check && !s.manual && !state.steps[s.id]?.done && !state.steps[s.id]?.skipped).map((s) => s.id);
  const results = [];
  for (const i of ids) results.push(await runCheck(dir, state, i));
  saveState(dir, state);
  return { results, ...updated(dir) };
}

/** A step's recorded value, checked: the live site is an https URL, the domain is a domain. */
function stepValue(id, value) {
  if (value === undefined) return undefined;
  if (id === 'vercel' && !/^https:\/\//.test(value)) throw new Error('The vercel value is the live URL, starting https://');
  if (id === 'domain') {
    const domain = cleanDomain(value);
    if (!isDomain(domain)) throw new Error('The domain value is the domain itself, like tidepool.app');
    return domain;
  }
  return value;
}

export function markDone(dir, id, value, undo = false, skip = false) {
  const s = stepById(id);
  if (!s) throw new Error(`No step "${id}". Steps: ${STEPS.map((x) => x.id).join(', ')}`);
  const state = loadState(dir);
  if (skip && !s.optional) throw new Error(`"${id}" isn't optional. Optional steps: ${STEPS.filter((x) => x.optional).map((x) => x.id).join(', ')}`);
  if (undo) state.steps[id] = { done: false };
  else if (skip) state.steps[id] = { done: false, skipped: true, at: new Date().toISOString() };
  else {
    const recorded = stepValue(id, value);
    state.steps[id] = { done: true, at: new Date().toISOString() };
    if (recorded !== undefined) state.values[id] = recorded;
  }
  saveState(dir, state);
  return updated(dir);
}

/**
 * The manual-work page: writes it and says where, with what's waiting on the
 * person. `artifact` remembers the link it was published to, so every update
 * after goes to the same page.
 */
export function manual(dir, { artifact } = {}) {
  if (artifact !== undefined) rememberArtifact(dir, artifact);
  const { file, work } = writePage(dir);
  return {
    file,
    ...work,
    publish: work.artifact
      ? `Republish ${file} to ${work.artifact} whenever a step changes.`
      : `Publish ${file} as an Artifact (icon "checklist", description: "${work.description}"), give the person the link, then remember it: manual --artifact <link> (scaffold_manual_work with artifactUrl).`,
  };
}

export const resolveDir = (d) => path.resolve(d || '.');

export const names = (list, opts) => checkNames(list, opts);

export function github(dir, opts) {
  const r = createGithubRepo(dir, opts);
  return { ...r, ...updated(dir) };
}

export function references(dir, refs) {
  const r = addReferences(dir, refs);
  return { ...r, ...updated(dir) };
}
