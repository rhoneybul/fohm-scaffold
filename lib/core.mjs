/** What the CLI and the MCP server both do. Every function returns plain JSON-able data. */
import path from 'node:path';

import { generate } from './generate.mjs';
import { PAGE, rememberArtifact, writePage } from './manual.mjs';
import { QUESTIONS, cleanDomain, isDomain, resolveOptions } from './options.mjs';
import { hasState, loadState, saveState } from './state.mjs';
import { createGithubRepo } from './github.mjs';
import { checkNames } from './names.mjs';
import { addReferences } from './references.mjs';
import { STEPS, linesFor, nextForAgent, nextStep, runCheck, status as stepStatus, stepById, stepsFor, whoDoes, yourLines } from './steps.mjs';

/** A step in full, in this app's words when there's an app (state and its folder). */
const describe = (s, state, dir) => ({
  id: s.id,
  phase: s.phase,
  title: s.title,
  why: s.why,
  do: linesFor(s, state, dir),
  how: s.manual ? 'manual' : 'checked',
  who: whoDoes(s),
  yours: yourLines(s, state, dir),
  optional: !!s.optional,
  takes: s.takes ?? null,
  done: !!state?.steps[s.id]?.done,
});

export const questions = () => QUESTIONS.map(({ key, ask, example, default: d, choices, required }) => ({ key, ask, example, default: d, choices, required: !!required }));

export function newApp(input, { dir, git = true, inRepo } = {}) {
  const r = resolveOptions(input);
  if (r.errors) return { ok: false, errors: r.errors };
  const target = generate(dir || r.options.slug, r.options, { git, inRepo });
  const repo = loadState(target).values.repo;
  return { ok: true, dir: target, options: r.options, ...(repo ? { repo: { root: path.resolve(target, ...repo.folder.split('/').map(() => '..')), ...repo } } : {}), ...updated(target) };
}

export function overview(dir) {
  const state = loadState(dir);
  const steps = stepStatus(state);
  const next = nextStep(state);
  const agent = nextForAgent(state);
  return {
    app: state.options.name,
    kind: state.options.kind,
    done: steps.filter((s) => s.done).length,
    skipped: steps.filter((s) => s.skipped).length,
    total: steps.length,
    steps,
    next: next ? describe(next, state, dir) : null,
    nextForAgent: agent ? describe(agent, state, dir) : null,
    manual: { file: path.join(path.resolve(dir), PAGE), artifact: state.values.artifact ?? null, waiting: steps.filter((s) => s.who !== 'agent' && !s.done && !s.skipped).length },
  };
}

/** The overview, after rewriting the manual-work page so it matches what just changed. */
function updated(dir) {
  writePage(dir);
  return overview(dir);
}

/** Where every step stands, with the manual-work page brought up to date (an app made before it had one gets it here). */
export const status = (dir) => updated(dir);

/** A step in full: for this app when `dir` is one (its country, its domain), else the general version. */
export function explain(id, dir) {
  const s = stepById(id);
  if (!s) throw new Error(`No step "${id}". Steps: ${STEPS.map((x) => x.id).join(', ')}`);
  return dir && hasState(dir) ? describe(s, loadState(dir), dir) : describe(s, null);
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

/** What else changes with a new domain: the app was made for another one, or for none. */
function domainNote(state, domain) {
  const made = state.options.domain;
  if (domain === undefined || domain === made) return undefined;
  return `${state.options.name} was made ${made ? `for ${made}` : 'without a domain'}: point it at ${domain}. supportEmail in src/lib/brand.ts (hello@${domain}?) and extra.apiUrl in app.json (https://${domain}) still say the old one; your agent can change them.`;
}

/** Marks a step done (with its value), skipped, or open again (forgetting its value). */
export function markDone(dir, id, value, undo = false, skip = false) {
  const s = stepById(id);
  if (!s) throw new Error(`No step "${id}". Steps: ${STEPS.map((x) => x.id).join(', ')}`);
  const state = loadState(dir);
  if (skip && !s.optional) throw new Error(`"${id}" isn't optional. Optional steps: ${STEPS.filter((x) => x.optional).map((x) => x.id).join(', ')}`);
  let note;
  if (undo) {
    state.steps[id] = { done: false };
    delete state.values[id];
  } else if (skip) state.steps[id] = { done: false, skipped: true, at: new Date().toISOString() };
  else {
    const recorded = stepValue(id, value);
    state.steps[id] = { done: true, at: new Date().toISOString() };
    if (recorded !== undefined) state.values[id] = recorded;
    if (id === 'domain') note = domainNote(state, recorded);
  }
  saveState(dir, state);
  return note ? { note, ...updated(dir) } : updated(dir);
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
