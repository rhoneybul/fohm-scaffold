/**
 * The choices a new app is made from, their defaults, and their checks. The
 * CLI asks for these one by one; the MCP tool and `--yes` take them as given.
 */
export const KINDS = ['coaching', 'app', 'game'];

export const QUESTIONS = [
  { key: 'idea', ask: 'In a sentence, what does it do, and for whom?', example: 'A pocket surf coach that tells beginners what to work on next, between lessons.' },
  { key: 'business', ask: 'Whose business is it, and what do they sell already?', example: 'A Cornwall surf school: retreats, private coaching and video analysis.' },
  {
    key: 'name',
    ask: 'What is the app called? (no name yet? leave it, and run `fohm-scaffold names <ideas...>` to check some, or ask Claude for ideas)',
    example: 'Tidepool',
    required: true,
  },
  { key: 'kind', ask: 'Coaching progression, a plain app, or a game? (coaching/app/game)', example: 'coaching', default: 'coaching', choices: KINDS },
  { key: 'inspiration', ask: 'Apps you like the look and feel of (comma-separated, e.g. from Mobbin)', example: 'Speak, Ahead, Strava', default: '' },
  { key: 'tagline', ask: 'One line on what it does for people (the landing page headline)', example: 'Practise every day, with your coach beside you.' },
  { key: 'memberWord', ask: 'What do you call the people who use it?', example: 'student', default: 'member' },
  { key: 'ownerWord', ask: 'What do you call the person who runs it? (coach for a coaching app, else owner)', example: 'coach' },
  { key: 'operator', ask: 'Who runs it (person or company, for the privacy policy)?', example: 'Tidepool Ltd' },
  { key: 'supportEmail', ask: 'Support email address', example: 'hello@tidepool.app' },
  { key: 'domain', ask: 'Domain it will live at (blank if not decided)', example: 'tidepool.app', default: '' },
  { key: 'bundleId', ask: 'iOS/Android app id (reverse domain)', example: 'app.tidepool' },
  { key: 'accent', ask: 'Brand accent colour (hex)', example: '#2F6B4F', default: '#2F6B4F' },
];

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'app';

/** Fills defaults that depend on other answers, then checks everything. Returns { options } or { errors }. */
export function resolveOptions(input = {}) {
  const o = {};
  for (const q of QUESTIONS) {
    const v = input[q.key];
    o[q.key] = typeof v === 'string' ? v.trim() : v === undefined ? undefined : String(v);
  }
  o.name = o.name || '';
  o.slug = slugify(input.slug || o.name);
  o.kind = (o.kind || 'coaching').toLowerCase();
  o.idea = o.idea || '';
  o.business = o.business || '';
  o.inspiration = (o.inspiration || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)
    .join(', ');
  o.tagline =
    o.tagline ||
    (o.kind === 'game' ? `${o.name}: a quick game to play anywhere.` : o.kind === 'coaching' ? `Your coach in your pocket, between sessions.` : `${o.name}: a short line on what it does for people.`);
  o.memberWord = (o.memberWord || 'member').toLowerCase();
  o.ownerWord = (o.ownerWord || (o.kind === 'coaching' ? 'coach' : 'owner')).toLowerCase();
  o.operator = o.operator || o.name;
  o.domain = (o.domain || '').replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  o.supportEmail = o.supportEmail || (o.domain ? `hello@${o.domain}` : 'support@example.com');
  o.bundleId = o.bundleId || (o.domain ? o.domain.split('.').reverse().join('.').replace(/-/g, '') : `com.example.${o.slug.replace(/-/g, '')}`);
  o.accent = o.accent || '#2F6B4F';
  if (!o.accent.startsWith('#')) o.accent = `#${o.accent}`;

  const errors = [];
  if (!o.name) errors.push('name is required (no name yet? check some ideas with `fohm-scaffold names <a> <b> <c>`)');
  if (!KINDS.includes(o.kind)) errors.push(`kind must be one of ${KINDS.join(', ')}`);
  if (!/^#[0-9a-fA-F]{6}$/.test(o.accent)) errors.push('accent must be a 6-digit hex colour, like #2F6B4F');
  if (!/^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/.test(o.bundleId)) errors.push('bundleId must look like com.company.app (letters and digits, dot-separated)');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(o.supportEmail)) errors.push('supportEmail must be an email address');
  if (o.domain && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(o.domain)) errors.push('domain must look like example.com');
  for (const k of ['name', 'tagline', 'operator', 'memberWord', 'ownerWord', 'idea', 'business', 'inspiration']) if (/["`\\]/.test(o[k] ?? '')) errors.push(`${k} can't contain quotes or backslashes`);
  return errors.length ? { errors } : { options: o };
}
