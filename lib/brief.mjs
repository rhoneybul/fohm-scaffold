/**
 * A brief from the app builder (fohm's site, /app-builder): what a visitor answered,
 * as `new`'s options and the markdown brief Claude carries on from. `new --from`
 * reads one from a file or a link and makes the app from it, so nothing is retyped.
 *
 * The contract, version 1 (the builder's `briefJson` writes it):
 *   { fohm: 'app-builder-brief', version: 1, source?, options: { name, idea, ... }, answers?: {...}, brief?: '# markdown' }
 * `options` holds only keys `new` takes (lib/options.mjs QUESTIONS); anything else is ignored.
 */
import fs from 'node:fs';

import { QUESTIONS } from './options.mjs';

export const BRIEF_KIND = 'app-builder-brief';
export const BRIEF_VERSION = 1;
const KEYS = new Set(QUESTIONS.map((q) => q.key));

/** Checks a parsed brief and returns `{ input, brief, answers, source }`; throws with what's wrong. */
export function parseBrief(data, source = '') {
  if (!data || typeof data !== 'object' || data.fohm !== BRIEF_KIND) throw new Error(`${source || 'That'} isn't an app builder brief (no "fohm": "${BRIEF_KIND}").`);
  if (data.version !== BRIEF_VERSION) throw new Error(`The brief is version ${data.version}; this fohm-scaffold reads version ${BRIEF_VERSION}. Run the latest: npx github:rhoneybul/fohm-scaffold.`);
  const input = {};
  for (const [k, v] of Object.entries(data.options ?? {})) if (KEYS.has(k) && v !== null && v !== undefined && v !== '') input[k] = String(v);
  return { input, brief: typeof data.brief === 'string' ? data.brief : '', answers: data.answers ?? {}, source: data.source || source };
}

/** Reads a brief from an https link or a file. */
export async function readBrief(from) {
  if (/^https?:\/\//.test(from)) {
    const res = await fetch(from, { headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Couldn't fetch the brief (${res.status}) from ${from}.`);
    return parseBrief(await res.json(), from);
  }
  if (!fs.existsSync(from)) throw new Error(`No brief at ${from}.`);
  return parseBrief(JSON.parse(fs.readFileSync(from, 'utf8')), from);
}

/** The brief as the app keeps it, docs/BRIEF.md: a line on where it came from, then the builder's markdown. */
export function briefMarkdown({ brief }, o) {
  // Not the link it came from: that link is the only key to the submission, and this file is committed.
  const head = `# ${o.name}: the brief\n\nFrom the app builder, and made with \`fohm-scaffold new --from\`.\nThe new-app skill takes these answers as said and asks only what's still open below.\n`;
  return `${head}\n${brief.trim()}\n`;
}
