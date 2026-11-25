/**
 * A video's still, for a row's thumbnail or a card: a frame from the middle
 * of the video, never its thumbnail. YouTube keeps three frames of every
 * video (`hq1`, `hq2` and `hq3`, a quarter, half and three quarters in, the
 * 480x360 cuts of `1.jpg` to `3.jpg`); `hqdefault` is the uploader's chosen
 * thumbnail, often a title card with lettering baked in ("HOW TO...") that
 * fights the app's own type. So a still is `hq2`, the middle frame, unless
 * that one was checked by eye and found to carry a caption or a watermark,
 * when `STILL_FRAME_FOR` names the frame that doesn't.
 *
 * Each frame is 4:3 with the 16:9 picture letterboxed; `letterboxCrop`
 * draws it so the bars and the picture's outer edges (where a channel's
 * corner badge sits) fall outside the box: `Photo`'s `letterboxed`. Never
 * blur a still to hide its lettering: pick another frame. Plain, tested in
 * tests/stills.test.ts.
 */

/** The frames, in the order they're preferred: the middle first. */
export const STILL_FRAMES = ['hq2', 'hq1', 'hq3'] as const;
export type StillFrame = (typeof STILL_FRAMES)[number];

/**
 * Videos whose middle frame carries a caption or a watermark, checked by eye:
 * the frame that doesn't. Add one as you check each video's still.
 */
export const STILL_FRAME_FOR: Record<string, StillFrame> = {};

/** A YouTube video's id from its watch, short, embed or shorts link; undefined for anything else. */
export function youtubeId(url?: string): string | undefined {
  if (!url) return undefined;
  const m = /^https?:\/\/(?:www\.|m\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/.exec(url.trim());
  return m?.[1];
}

/** The frame a video's still is taken from: its checked one, else the middle. */
export const stillFrameOf = (id: string, checked: Record<string, StillFrame> = STILL_FRAME_FOR): StillFrame => checked[id] ?? STILL_FRAMES[0];

/** A video's still frame from mid-video, clear of any title card. */
export const videoStill = (id: string, frame: StillFrame = stillFrameOf(id)) => `https://i.ytimg.com/vi/${id}/${frame}.jpg`;

/** The still for a video link, or undefined when it isn't a YouTube video (show the row's icon instead). */
export function stillOf(url?: string): string | undefined {
  const id = youtubeId(url);
  return id ? videoStill(id) : undefined;
}

/** How far the 16:9 picture is zoomed past the box: at least a seventh of it goes each side, where corner labels sit. */
const STILL_ZOOM = 1.4;
const PICTURE = 16 / 9;

/**
 * Where a 4:3 frame is drawn so its letterboxed 16:9 picture, zoomed by
 * STILL_ZOOM and centred, covers a box of `ratio` (width over height): the
 * bars and the picture's edges fall outside. Percentages of the box.
 */
export function letterboxCrop(ratio: number) {
  const height = 1 / ratio; // in box widths
  const pictureWidth = STILL_ZOOM * Math.max(1, height * PICTURE);
  const pictureHeight = pictureWidth / PICTURE;
  const imageHeight = (pictureWidth * 3) / 4;
  const imageTop = (height - pictureHeight) / 2 - imageHeight / 8;
  const pc = (n: number) => `${Math.round(n * 10000) / 100}%` as const;
  return { position: 'absolute', left: pc((1 - pictureWidth) / 2), width: pc(pictureWidth), top: pc(imageTop / height), height: pc(imageHeight / height) } as const;
}
