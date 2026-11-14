/**
 * Design references: the apps the owner likes the feel of, and the screens
 * to learn from, written into the app's DESIGN.md (under "References") and
 * kept in .fohm/state.json. An agent with Mobbin's tools finds the screens
 * (search_screens / search_flows, by app and by screen: onboarding, home,
 * progress, a paywall) and passes them here with what to take from each.
 */
import fs from 'node:fs';
import path from 'node:path';

import { loadState, saveState } from './state.mjs';

const MARK = '<!-- fohm:references -->';

export function addReferences(dir, refs) {
  if (!Array.isArray(refs) || !refs.length) throw new Error('Give at least one reference: { app, screen?, url?, take? }');
  const target = path.resolve(dir);
  const file = path.join(target, 'DESIGN.md');
  let design = fs.readFileSync(file, 'utf8');
  if (!design.includes(MARK)) design = design.replace(/## References\n/, `## References\n\n${MARK}\n`);
  if (!design.includes(MARK)) design += `\n## References\n\n${MARK}\n`;
  const clean = (v) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim();
  const lines = refs.map((r) => {
    if (!clean(r.app)) throw new Error('Each reference needs an app');
    if (r.url && !/^https:\/\//.test(r.url)) throw new Error(`Not an https link: ${r.url}`);
    const what = [clean(r.app), clean(r.screen)].filter(Boolean).join(', ');
    return `- **${what}**${r.url ? ` ([Mobbin](${clean(r.url)}))` : ''}${clean(r.take) ? `: ${clean(r.take)}` : ''}`;
  });
  fs.writeFileSync(file, design.replace(MARK, `${MARK}\n${lines.join('\n')}`));
  const state = loadState(target);
  state.values.references = [...(state.values.references ?? []), ...refs];
  saveState(target, state);
  return { added: lines.length, references: state.values.references.length };
}

export const referenceCount = (dir) => (fs.readFileSync(path.join(path.resolve(dir), 'DESIGN.md'), 'utf8').match(/\]\(https:\/\/mobbin\.com\//g) ?? []).length;
