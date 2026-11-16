/**
 * The manual work: every step an agent can't do for the person (their
 * accounts, payments, the domain, registering the business, keys), on one
 * page, the ones that take days first. Written to .fohm/manual-work.html
 * after every change. In Claude it's published as an Artifact, and
 * republished to the same link as steps get done; the link is kept in
 * state (values.artifact) so a later session updates the same page.
 *
 * The page follows claude.ai's Artifact contract: no document skeleton (the
 * host adds it), a <title> that names it, colours as tokens with a dark
 * theme, and a 16px safe-area gutter.
 */
import fs from 'node:fs';
import path from 'node:path';

import { loadState, saveState } from './state.mjs';
import { stepsFor, whoDoes, yourLines } from './steps.mjs';

export const PAGE = path.join('.fohm', 'manual-work.html');

/** The person's steps for this app: what can't wait, the rest by phase, and what's finished. */
export function manualWork(state) {
  const record = (s) => state.steps[s.id] ?? {};
  const theirs = stepsFor(state).filter((s) => whoDoes(s) !== 'agent');
  const open = theirs.filter((s) => !record(s).done && !record(s).skipped).map((s) => item(s, state));
  const finished = theirs.filter((s) => record(s).done || record(s).skipped).map((s) => ({ id: s.id, title: s.title, skipped: !!record(s).skipped, value: state.values[s.id] ?? null }));
  const name = state.options.name;
  return {
    app: name,
    slug: state.options.slug,
    accent: state.options.accent,
    title: `${name} checklist`,
    description: `What only you can do to get ${name} live: the domain, the business, accounts, payments and keys.`,
    total: theirs.length,
    done: finished.filter((f) => !f.skipped).length,
    skipped: finished.filter((f) => f.skipped).length,
    early: open.filter((i) => i.early),
    phases: byPhase(open.filter((i) => !i.early)),
    finished,
    artifact: state.values.artifact ?? null,
    updated: lastChange(state),
  };
}

const item = (s, state) => ({
  id: s.id,
  phase: s.phase,
  title: s.title,
  why: s.why,
  lines: yourLines(s, state),
  whole: whoDoes(s) === 'you',
  how: s.check && !s.manual ? 'checked' : 'manual',
  optional: !!s.optional,
  early: !!s.early,
  takes: s.takes ?? null,
});

function byPhase(items) {
  const phases = [];
  for (const i of items) {
    const last = phases.at(-1);
    if (last?.phase === i.phase) last.items.push(i);
    else phases.push({ phase: i.phase, items: [i] });
  }
  return phases;
}

const lastChange = (state) => [state.createdAt, ...Object.values(state.steps).map((r) => r.at)].filter(Boolean).sort().at(-1) ?? null;

/** Writes the page for the app in `dir`; returns where, and what's on it. */
export function writePage(dir) {
  const work = manualWork(loadState(dir));
  const file = path.join(path.resolve(dir), PAGE);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, renderPage(work));
  return { file, work };
}

/** Keeps the published Artifact's link, so every later update goes to the same page. */
export function rememberArtifact(dir, url) {
  if (!/^https:\/\/\S+$/.test(url ?? '')) throw new Error('The artifact is its https link, like https://claude.ai/artifact/...');
  const state = loadState(dir);
  state.values.artifact = url;
  saveState(dir, state);
}

// ---- The page ----

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

/** Sites the steps name without a link (supabase.com → New project). */
const SITES = ['supabase.com', 'vercel.com', 'stripe.com', 'posthog.com', 'sentry.io', 'resend.com', 'platform.claude.com', 'expo.dev', 'mobbin.com', 'github.com'];
const reEscape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TOKEN = new RegExp(
  [
    String.raw`(?<cmd>\b(?:fohm-scaffold|npx|npm|gh) (?:[^,;()\s]|\s(?!\s))+)`,
    String.raw`(?<url>https:\/\/(?:<[a-z ]+>|[^\s,;()<>"])+)`,
    String.raw`(?<site>\b(?:${SITES.map(reEscape).join('|')})\b)`,
    String.raw`(?<env>\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b)`,
    String.raw`(?<file>\b(?:src|api|assets|docs|supabase)\/[\w./-]*\w|\b(?:app\.json|PRODUCT\.md|DESIGN\.md|AGENTS\.md)\b)`,
    String.raw`(?<placeholder><[a-z][a-z ]*>)`,
  ].join('|'),
  'g',
);

/** A step's line as HTML: links for links, code for commands, settings and files, placeholders marked. */
export function inline(text) {
  let html = '';
  let at = 0;
  for (const m of String(text).matchAll(TOKEN)) {
    html += esc(text.slice(at, m.index));
    html += token(m.groups, m[0]);
    at = m.index + m[0].length;
  }
  return html + esc(text.slice(at));
}

function token(g, whole) {
  if (g.cmd) {
    const cmd = whole.trimEnd();
    return `<code>${esc(cmd)}</code>${esc(whole.slice(cmd.length))}`;
  }
  if (g.url) {
    const url = whole.replace(/[.:]+$/, '');
    const rest = esc(whole.slice(url.length));
    if (url.includes('<')) return `<code>${esc(url)}</code>${rest}`;
    const shown = url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '');
    return `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(shown)}</a>${rest}`;
  }
  if (g.site) return `<a href="https://${esc(whole)}" target="_blank" rel="noopener">${esc(whole)}</a>`;
  if (g.placeholder) return `<var>${esc(whole)}</var>`;
  return `<code>${esc(whole)}</code>`;
}

// Colour: the app's own accent, with neutrals leaning toward it, every text colour held to 4.5:1.
const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a, b, t) => toHex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t));
const luminance = (hex) =>
  rgb(hex)
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
/** The colour, moved toward `toward` only as far as it takes to read at `min` on `bg`. */
function readable(color, bg, toward, min = 4.5) {
  for (let t = 0; t <= 1; t += 0.05) {
    const c = mix(color, toward, t);
    if (contrast(c, bg) >= min) return c;
  }
  return toward;
}

export function palette(accent) {
  const a = /^#[0-9a-f]{6}$/i.test(accent ?? '') ? accent.toUpperCase() : '#2F6B4F';
  const theme = (bg, surface, ink, toward) => {
    const soft = mix(bg, a, toward === '#000000' ? 0.12 : 0.2);
    return {
      bg,
      surface,
      ink,
      'ink-mid': readable(mix(ink, bg, 0.36), soft, ink),
      line: mix(bg, ink, 0.15),
      accent: readable(a, bg, toward, 3),
      'accent-ink': readable(a, soft, toward),
      'accent-soft': soft,
      'code-bg': mix(bg, ink, 0.07),
    };
  };
  const lightBg = mix('#FFFFFF', a, 0.05);
  const darkBg = mix('#0F1211', a, 0.07);
  return {
    light: theme(lightBg, '#FFFFFF', mix('#141716', a, 0.1), '#000000'),
    dark: theme(darkBg, mix(darkBg, '#FFFFFF', 0.04), mix('#F1F3F2', a, 0.05), '#FFFFFF'),
  };
}

const tokens = (t) =>
  Object.entries(t)
    .map(([k, v]) => `--${k}: ${v};`)
    .join(' ');

const date = (iso) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');

/** A step's closing "Then: fohm-scaffold ..." line: on the page it's how to tell Claude, not a box to tick. */
const isThen = (line) => /^Then: fohm-scaffold /.test(line);

function stepHtml(i) {
  const chips = [i.takes && `<span class="chip takes">Takes ${esc(i.takes)}</span>`, i.optional && '<span class="chip">Optional</span>'].filter(Boolean).join('');
  const lines = i.lines
    .filter((l) => !isThen(l))
    .map((l, n) => `<li><input type="checkbox" id="${esc(i.id)}-${n + 1}"><label for="${esc(i.id)}-${n + 1}">${inline(l)}</label></li>`)
    .join('\n');
  const then = i.lines.find(isThen);
  const tell = !i.whole ? 'Claude does the rest of this step once you have.' : i.how === 'checked' ? 'Done? Tell Claude, and it checks for itself.' : 'Done? Tell Claude, and it ticks it off.';
  const when = then ? `${tell} In a terminal: ${inline(then.replace(/^Then: /, ''))}` : tell;
  return `<li class="step" id="step-${esc(i.id)}">
<div class="step-head"><h3>${esc(i.title)}</h3>${chips ? `<p class="chips">${chips}</p>` : ''}</div>
<p class="why">${esc(i.why)}</p>
<ul class="todo">
${lines}
</ul>
<p class="when">${when}</p>
</li>`;
}

const finishedHtml = (f) => `<li><span>${esc(f.title)}</span><span class="value">${f.skipped ? 'Skipped' : f.value && typeof f.value === 'string' ? esc(f.value) : 'Done'}</span></li>`;

export function renderPage(m) {
  const { light, dark } = palette(m.accent);
  const settled = m.done + m.skipped;
  const percent = m.total ? Math.round((settled / m.total) * 100) : 100;
  const open = m.early.length + m.phases.reduce((n, p) => n + p.items.length, 0);
  const counts = `${m.done} of ${m.total} done${m.skipped ? `, ${m.skipped} skipped` : ''}`;
  const early = m.early.length
    ? `<section class="early" aria-labelledby="early-title">
<div class="section-head"><h2 id="early-title">Start these now</h2><p>They take days to come through, or can’t wait.</p></div>
<ol class="steps">
${m.early.map(stepHtml).join('\n')}
</ol>
</section>`
    : '';
  const phases = m.phases
    .map(
      (p) => `<section aria-labelledby="phase-${esc(p.phase.replace(/\W+/g, '-').toLowerCase())}">
<div class="section-head"><h2 id="phase-${esc(p.phase.replace(/\W+/g, '-').toLowerCase())}">${esc(p.phase)}</h2></div>
<ol class="steps">
${p.items.map(stepHtml).join('\n')}
</ol>
</section>`,
    )
    .join('\n');
  const empty = open ? '' : '<p class="empty">Nothing is waiting on you. Claude has the rest.</p>';
  const finished = m.finished.length
    ? `<details class="finished">
<summary>Done and skipped (${m.finished.length})</summary>
<ul>
${m.finished.map(finishedHtml).join('\n')}
</ul>
</details>`
    : '';

  return `<title>${esc(m.title)}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600&display=swap">
<style>
/* One column, read like a work order: what can't wait, then each phase in order, then what's finished. */
:root {
  ${tokens(light)}
  --display: "Space Grotesk", "Segoe UI", system-ui, sans-serif;
  --body: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { ${tokens(dark)} color-scheme: dark; }
}
:root[data-theme="dark"] { ${tokens(dark)} color-scheme: dark; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font: 400 15px/1.6 var(--body); -webkit-text-size-adjust: 100%; }
.page { max-width: 46rem; margin: 0 auto; padding-block: 40px 56px; padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); display: grid; gap: 44px; }
h1, h2, h3 { font-family: var(--display); font-weight: 600; text-wrap: balance; margin: 0; }
h1 { font-size: clamp(1.7rem, 1.25rem + 2vw, 2.35rem); line-height: 1.15; letter-spacing: -0.01em; }
h2 { font-size: 1.3rem; line-height: 1.3; }
h3 { font-size: 1.05rem; line-height: 1.35; }
p { margin: 0; }
a { color: var(--accent-ink); text-decoration-thickness: 1px; text-underline-offset: 2px; overflow-wrap: anywhere; }
code { font: 500 0.85em/1.4 var(--mono); background: var(--code-bg); padding: 1px 5px; border-radius: 5px; overflow-wrap: anywhere; }
var { font: 500 0.85em/1.4 var(--mono); font-style: normal; color: var(--accent-ink); }
:focus-visible { outline: 2px solid var(--accent-ink); outline-offset: 2px; }
.head { display: grid; gap: 14px; }
.lede { color: var(--ink-mid); max-width: 62ch; font-size: 1.02rem; }
.meter { display: grid; gap: 8px; margin-top: 6px; }
.bar { height: 8px; border-radius: 999px; background: var(--line); overflow: hidden; }
.bar span { display: block; height: 100%; background: var(--accent); }
.count { font-size: 0.9rem; color: var(--ink-mid); font-variant-numeric: tabular-nums; }
.keys { font-size: 0.92rem; max-width: 62ch; }
.keys strong { font-weight: 600; }
section { display: grid; gap: 18px; min-width: 0; }
.section-head { display: grid; gap: 4px; }
.section-head p { color: var(--ink-mid); font-size: 0.92rem; }
.early { background: var(--accent-soft); border-radius: 16px; padding: 22px 20px; }
.steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 22px; }
.steps > li + li { border-top: 1px solid var(--line); padding-top: 22px; }
.step { display: grid; gap: 10px; min-width: 0; }
.step-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 12px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font: 500 0.75rem/1 var(--body); padding: 5px 9px; border-radius: 999px; border: 1px solid var(--line); color: var(--ink-mid); }
.chip.takes { border-color: transparent; background: var(--accent-soft); color: var(--accent-ink); }
.early .chip.takes { background: var(--bg); }
.why { color: var(--ink-mid); font-size: 0.94rem; max-width: 65ch; }
.todo { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.todo li { display: grid; grid-template-columns: 22px minmax(0, 1fr); gap: 10px; align-items: start; }
.todo input { width: 18px; height: 18px; margin: 3px 0 0; accent-color: var(--accent); cursor: pointer; }
.todo label { min-width: 0; cursor: pointer; }
.todo input:checked + label { color: var(--ink-mid); text-decoration: line-through; text-decoration-color: var(--line); }
.when { font-size: 0.88rem; color: var(--ink-mid); }
.empty { font-size: 1.05rem; }
.finished summary { cursor: pointer; font: 600 1.05rem/1.4 var(--display); }
.finished ul { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 8px; }
.finished li { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 16px; padding-bottom: 8px; border-bottom: 1px solid var(--line); }
.finished .value { color: var(--ink-mid); overflow-wrap: anywhere; min-width: 0; }
footer { color: var(--ink-mid); font-size: 0.85rem; border-top: 1px solid var(--line); padding-top: 16px; }
</style>
<main class="page">
<header class="head">
<h1>What only you can do for ${esc(m.app)}</h1>
<p class="lede">These need your accounts, your payment details or the business’s own identity, so Claude can’t do them for you. Claude does everything else, and this page updates as steps get done.</p>
<div class="meter">
<div class="bar" role="progressbar" aria-label="Your steps done" aria-valuemin="0" aria-valuemax="${m.total}" aria-valuenow="${settled}"><span style="width: ${percent}%"></span></div>
<p class="count">${counts}</p>
</div>
<p class="keys"><strong>Keys and passwords</strong> go straight into Vercel’s environment variables or the service’s own settings. Never paste one into a chat.</p>
</header>
${[early, phases, empty, finished].filter(Boolean).join('\n')}
<footer>Made by fohm-scaffold from <code>.fohm/state.json</code> in the app’s repository${m.updated ? `, last changed ${esc(date(m.updated))}` : ''}. Ticks stay in this browser; tell Claude when a step is done.</footer>
</main>
<script>
(() => {
  const key = ${JSON.stringify(`fohm:${m.slug}:ticks`)};
  const boxes = [...document.querySelectorAll('.todo input')];
  let ticked = [];
  try { ticked = JSON.parse(localStorage.getItem(key) || '[]'); } catch {}
  for (const box of boxes) {
    box.checked = ticked.includes(box.id);
    box.addEventListener('change', () => {
      try { localStorage.setItem(key, JSON.stringify(boxes.filter((b) => b.checked).map((b) => b.id))); } catch {}
    });
  }
})();
</script>
`;
}
