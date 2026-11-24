/** The profile photo's sums (src/lib/photo.ts), plain so Node can test them (tests/photo.test.ts). */

/** Sharp on a 72pt avatar at three times the pixels, and small to store. */
export const PHOTO_PX = 256;
/** Each canvas step at most halves (one long jump aliases); iOS Safari draws no canvas past about 16.7M pixels. */
const LARGEST_STEP_PX = 2048;

/** The largest square in the middle of a picture. */
export function centreSquare(width: number, height: number) {
  const side = Math.min(width, height);
  return { x: Math.floor((width - side) / 2), y: Math.floor((height - side) / 2), side };
}

/** The sizes a square is drawn at on its way down to PHOTO_PX, each half the one before. */
export function scaleSteps(side: number): number[] {
  const steps = [PHOTO_PX];
  while (steps[0] * 2 < side && steps[0] * 2 <= LARGEST_STEP_PX) steps.unshift(steps[0] * 2);
  return steps;
}

/** A photo kept on the device (demo mode, or a picture not yet uploaded) is shown as it is; anything else is a path in the bucket. */
export const isLocalPhoto = (path: string) => /^(data|blob|file):/.test(path);
