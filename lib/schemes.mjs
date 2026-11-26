/**
 * Colour schemes: a whole palette for a new app, not one colour. Each is the
 * house style's structure (a tinted canvas, white cards, the ink ramp, one
 * accent) with an accent and a family of neutrals that belong together, so a
 * surf app sits on a misty blue-grey with an ocean accent and a running app on
 * warm sand with an ember one. Suggested from what the app is about and the
 * apps the owner likes; the owner picks the one they like most.
 */

/** The neutral families a scheme sits on. Ink stays the house's; the greys around it lean warm or cool. Every text colour keeps 4.5:1 on its canvas and on white. */
export const NEUTRALS = {
  cool: { label: 'cool grey', bg: '#F2F2F6', raised: '#F4F4F7', track: '#E6E6EB', line: '#E3E3E9', inkMid: '#4A4A52', inkFaint: '#5F6672' },
  warm: { label: 'warm sand', bg: '#F4F2EE', raised: '#F7F5F1', track: '#E9E5DE', line: '#E5E0D8', inkMid: '#4D4943', inkFaint: '#655F58' },
  sage: { label: 'sage grey', bg: '#F1F3F1', raised: '#F4F6F4', track: '#E4E8E4', line: '#E0E5E0', inkMid: '#474D49', inkFaint: '#5B645E' },
  mist: { label: 'misty blue-grey', bg: '#EFF2F6', raised: '#F3F5F8', track: '#E2E7EE', line: '#DEE3EA', inkMid: '#464C56', inkFaint: '#5A6370' },
};

/**
 * The schemes, in the order they're offered when nothing else decides. `words`
 * are what an app's idea or business says when the scheme suits it; `apps`
 * are apps whose own colours the scheme is close to.
 */
export const SCHEMES = [
  {
    id: 'forest',
    name: 'Forest',
    mood: 'Deep green on sage: grounded, outdoors, steady.',
    accent: '#2F6B4F',
    neutrals: 'sage',
    words: ['outdoor', 'nature', 'hike', 'hiking', 'trail', 'garden', 'plant', 'golf', 'farm', 'forest', 'camp', 'walk', 'habit'],
    apps: ['duolingo', 'spotify', 'robinhood', 'komoot', 'alltrails', 'whatsapp'],
  },
  {
    id: 'ocean',
    name: 'Ocean',
    mood: 'Sea blue on misty grey: open water, calm, clear.',
    accent: '#1F5F8B',
    neutrals: 'mist',
    words: ['surf', 'swim', 'sail', 'ocean', 'sea', 'water', 'dive', 'diving', 'freedive', 'beach', 'wave', 'boat', 'paddle', 'kite', 'breath', 'travel'],
    apps: ['calm', 'surfline', 'windy', 'booking', 'paypal', 'facebook'],
  },
  {
    id: 'ember',
    name: 'Ember',
    mood: 'Burnt orange on warm sand: energy, effort, sport.',
    accent: '#C2410C',
    neutrals: 'warm',
    words: ['run', 'running', 'cycle', 'cycling', 'bike', 'ride', 'fitness', 'strength', 'gym', 'train', 'training', 'workout', 'race', 'marathon', 'triathlon', 'sport', 'energy'],
    apps: ['strava', 'headspace', 'runna', 'garmin', 'nike run club', 'trainingpeaks', 'zwift'],
  },
  {
    id: 'clay',
    name: 'Clay',
    mood: 'Terracotta on warm sand: made by hand, earthy, warm.',
    accent: '#A14B2B',
    neutrals: 'warm',
    words: ['pottery', 'ceramic', 'craft', 'cook', 'cooking', 'food', 'recipe', 'bake', 'baking', 'coffee', 'yoga', 'pilates', 'retreat', 'home', 'family'],
    apps: ['insight timer', 'airbnb', 'etsy', 'mob', 'deliciously ella'],
  },
  {
    id: 'alpine',
    name: 'Alpine',
    mood: 'Navy on misty grey: cold air, mountains, precision.',
    accent: '#24467A',
    neutrals: 'mist',
    words: ['ski', 'skiing', 'snow', 'snowboard', 'mountain', 'alpine', 'climb', 'climbing', 'backcountry', 'avalanche', 'expedition', 'peak', 'finance', 'money'],
    apps: ['fatmap', 'linkedin', 'monzo', 'revolut', 'ahead'],
  },
  {
    id: 'tide',
    name: 'Tide',
    mood: 'Deep teal on misty grey: health, care, quiet focus.',
    accent: '#0F6E68',
    neutrals: 'mist',
    words: ['health', 'mindful', 'mindfulness', 'meditation', 'sleep', 'calm', 'therapy', 'physio', 'rehab', 'recovery', 'care', 'nutrition', 'clinic', 'wellbeing'],
    apps: ['oura', 'whoop', 'bevel', 'flo', 'balance', 'waking up'],
  },
  {
    id: 'indigo',
    name: 'Indigo',
    mood: 'Ink-blue violet on cool grey: learning, thinking, craft of the mind.',
    accent: '#4338CA',
    neutrals: 'cool',
    words: ['learn', 'learning', 'study', 'school', 'course', 'tutor', 'exam', 'code', 'coding', 'theory', 'chess', 'focus', 'read', 'reading', 'write', 'writing'],
    apps: ['speak', 'linear', 'stripe', 'brilliant', 'notion', 'elevate', 'discord'],
  },
  {
    id: 'plum',
    name: 'Plum',
    mood: 'Plum on cool grey: music, art, a little night.',
    accent: '#7B2D6E',
    neutrals: 'cool',
    words: ['music', 'guitar', 'song', 'sing', 'singing', 'piano', 'drum', 'dance', 'art', 'paint', 'draw', 'photo', 'film', 'fashion', 'style', 'game', 'play', 'party'],
    apps: ['slack', 'twitch', 'yousician', 'simply piano', 'fender play', 'apple music', 'instagram'],
  },
  {
    id: 'crimson',
    name: 'Crimson',
    mood: 'Crimson on cool grey: intensity, competition, fight.',
    accent: '#B4232F',
    neutrals: 'cool',
    words: ['box', 'boxing', 'martial', 'jiu', 'jitsu', 'bjj', 'mma', 'fight', 'combat', 'compete', 'competition', 'motorsport', 'hiit', 'crossfit', 'tennis', 'football'],
    apps: ['peloton', 'netflix', 'youtube', 'whoop', 'ladder', 'f45', 'pinterest'],
  },
  {
    id: 'brass',
    name: 'Brass',
    mood: 'Old gold on warm sand: considered, premium, crafted.',
    accent: '#8A5A00',
    neutrals: 'warm',
    words: ['wine', 'whisky', 'luxury', 'premium', 'golf', 'heritage', 'antique', 'jewellery', 'watch', 'barber', 'tailor', 'hotel'],
    apps: ['mr porter', 'aesop', 'soho house', 'masterclass'],
  },
];

/** The house's ink, which every scheme keeps: the primary pill, titles, the splash and the icon's ground. */
export const INK = '#111113';
export const DEFAULT_SCHEME = 'forest';

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const toHex = (cs) => `#${cs.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('')}`.toUpperCase();

/** WCAG's contrast ratio between two `#RRGGBB` colours, 1 to 21. */
export function contrast(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = rgb(hex).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** A colour's hue, 0 to 360 degrees, and how coloured it is, 0 to 1. */
function hueOf(hex) {
  const [r, g, b] = rgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (!d) return { hue: 0, chroma: 0 };
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { hue: (h * 60 + 360) % 360, chroma: d };
}

/** The accent's pale ground: 85% of the way to white. */
export const soften = (hex) => toHex(rgb(hex).map((c) => c + (255 - c) * 0.85));

/** `hex` darkened toward the ink, as little as it takes, until it keeps 4.5:1 on white. */
function darkenedForText(hex) {
  let cs = rgb(hex);
  for (let i = 0; i < 50 && contrast(toHex(cs), '#FFFFFF') < 4.5; i++) cs = cs.map((c) => c * 0.95);
  return toHex(cs);
}

/** The neutral family that sits best under an accent: warm under reds, oranges and golds, sage under greens, mist under blues, cool otherwise. */
export function neutralsFor(accent) {
  const { hue, chroma } = hueOf(accent);
  if (chroma < 0.12) return 'cool';
  if (hue < 55 || hue >= 345) return 'warm';
  if (hue < 165) return 'sage';
  if (hue < 235) return 'mist';
  return 'cool';
}

/**
 * A scheme's tokens, as `src/lib/theme.ts` names them. A custom accent gets
 * the neutrals that suit it, and is darkened to keep 4.5:1 on white when it's
 * too light to be read.
 */
export function tokensOf(scheme) {
  const n = NEUTRALS[scheme.neutrals] ?? NEUTRALS.cool;
  const accent = darkenedForText(scheme.accent.toUpperCase());
  return {
    bg: n.bg,
    raised: n.raised,
    panel: n.raised,
    track: n.track,
    line: n.line,
    border: n.line,
    inkMid: n.inkMid,
    inkFaint: n.inkFaint,
    accent,
    accentSoft: soften(accent),
  };
}

/** A scheme by its id, or one built around a hex colour (the owner's own brand colour). */
export function schemeFrom({ scheme, accent } = {}) {
  const named = scheme ? SCHEMES.find((s) => s.id === String(scheme).toLowerCase()) : undefined;
  if (scheme && !named && !accent) return undefined;
  if (named && !accent) return named;
  if (!accent) return SCHEMES.find((s) => s.id === DEFAULT_SCHEME);
  const hex = accent.startsWith('#') ? accent : `#${accent}`;
  const neutrals = named?.neutrals ?? neutralsFor(hex);
  return {
    id: named ? named.id : 'custom',
    name: named ? named.name : 'Custom',
    mood: `Your colour, ${hex.toUpperCase()}, on ${NEUTRALS[neutrals].label}.`,
    accent: hex,
    neutrals,
    words: [],
    apps: [],
  };
}

const wordsIn = (text) =>
  String(text ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

/**
 * The schemes that suit an app best, with why: what it's about (its idea and
 * business: each word a scheme knows counts 2) and the apps the owner likes
 * (each one whose colours a scheme is close to counts 3). Ties keep the
 * offered order, so an app nothing is known about gets the first `count`.
 */
export function suggestSchemes({ idea = '', business = '', inspiration = '', kind = '' } = {}, count = 4) {
  const words = new Set(wordsIn(`${idea} ${business}`));
  const liked = String(inspiration)
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean);
  const scored = SCHEMES.map((s, order) => {
    const about = s.words.filter((w) => words.has(w));
    const like = liked.filter((name) => {
      const a = name.toLowerCase();
      return s.apps.some((app) => a === app || a.startsWith(`${app} `) || app.startsWith(`${a} `));
    });
    if (kind === 'game' && s.id === 'plum' && !about.includes('game')) about.push('game');
    const why = [about.length && `it's about ${about.slice(0, 3).join(', ')}`, like.length && `close to ${like.join(', ')}`].filter(Boolean).join('; ');
    return { ...s, score: about.length * 2 + like.length * 3, why, order };
  });
  return scored
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, count)
    .map(({ order, ...s }) => ({ ...s, tokens: tokensOf(s) }));
}

/** The scheme an answer picks from a list offered: its number, a name, or blank for the first. */
export function pickedScheme(answer, offered) {
  const a = String(answer ?? '').trim().toLowerCase();
  if (!a) return offered[0].id;
  const n = Number(a);
  if (Number.isInteger(n) && offered[n - 1]) return offered[n - 1].id;
  return SCHEMES.find((s) => s.id === a || s.name.toLowerCase() === a)?.id ?? a;
}
