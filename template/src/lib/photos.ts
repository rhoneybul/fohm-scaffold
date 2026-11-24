/**
 * Photos the app may show, and their credits. Photos make it personal (the
 * member's own, the place or goal they train for, the content's own stills),
 * but only ones the app may use: public domain, CC0, or CC BY or CC BY-SA at
 * any version (a country's port too), never NC or ND, because the app may be
 * sold and crops photos to fit. An attribution licence needs a named author.
 * A photo the owner was given permission for says so in `permission`.
 * Every photo shown is listed on /credits (src/lib/credits.ts). Plain, tested
 * in tests/photos.test.ts.
 */
export interface CreditedPhoto {
  /** The image itself (a Wikimedia Commons upload URL, say). */
  url: string;
  /** Its file page, where the licence is (opened from /credits). */
  page: string;
  /** What it shows, for screen readers and the credits. */
  caption: string;
  /** Who took it, as the licence asks: "Jane Doe / Wikimedia Commons". */
  credit: string;
  /** As written on the file page: "CC BY-SA 4.0", "CC0 1.0", "Public domain". */
  licence: string;
  /** Where the owner was given permission to use a photo under no open licence: who said yes, and when. */
  permission?: string;
}

export const OPEN_LICENCE = /^(public domain( \(.+\))?|cc0( 1\.0)?|cc by(-sa)? \d\.\d( [a-z]{2,3})?)$/i;

/** A credit that names nobody (the research didn't find the author). */
const UNNAMED = /^(unknown|anonymous|not (yet )?recorded|n\/?a|-)?$/i;

/** Whether the app may show a photo: an open licence (with a named author where it asks for one), or the owner's permission. */
export function canShow(p: Pick<CreditedPhoto, 'licence' | 'credit' | 'permission'>): boolean {
  if (p.permission?.trim()) return !UNNAMED.test(p.credit?.trim() ?? '');
  if (!OPEN_LICENCE.test(p.licence?.trim() ?? '')) return false;
  return /^(public domain|cc0)/i.test(p.licence.trim()) || !UNNAMED.test(p.credit?.trim() ?? '');
}

/** The photos of a list the app may show, in order. */
export const showable = <P extends Pick<CreditedPhoto, 'licence' | 'credit' | 'permission'>>(photos: P[]): P[] => photos.filter(canShow);

/** The first photo that may be shown, or undefined (the card then shows its icon on a dark ground). */
export const firstShown = <P extends Pick<CreditedPhoto, 'licence' | 'credit' | 'permission'>>(photos?: P[] | P): P | undefined => showable(photos ? (Array.isArray(photos) ? photos : [photos]) : [])[0];

/** "Jane Doe / Wikimedia Commons · CC BY-SA 4.0" */
export const creditLine = (p: CreditedPhoto) => `${p.credit} · ${p.permission ? 'used with permission' : p.licence}`;
