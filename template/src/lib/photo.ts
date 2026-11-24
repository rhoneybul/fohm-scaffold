/**
 * A member's profile photo: chosen on Account with the image picker
 * (expo-image-picker), cut square and scaled to 256px on the device, then
 * uploaded into the member's own folder of the private media bucket
 * (backend.uploadMedia) and kept as accounts.photo_path.
 *
 * In a browser the picture is cut and scaled on a canvas here. In the iOS and
 * Android apps the phone's own picker crops it square (allowsEditing, 1:1)
 * and it's sent at the picker's quality: scaling there too would need
 * expo-image-manipulator, a native package (a store build to add).
 * The sums are in src/lib/photoSize.ts, tested in Node.
 */
import * as ImagePicker from 'expo-image-picker';

import { isWeb } from './config';
import type { PickedMedia } from './media';
import { centreSquare, scaleSteps } from './photoSize';

/** Opens the library for a photo; null if they cancel. The square JPEG to upload. */
export async function pickProfilePhoto(): Promise<PickedMedia | null> {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: !isWeb, aspect: [1, 1], quality: 0.8 });
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  if (!isWeb) {
    const mimeType = a.mimeType ?? 'image/jpeg';
    return { uri: a.uri, mimeType, type: 'image', ext: mimeType.includes('png') ? 'png' : 'jpg', bytes: a.fileSize };
  }
  const blob = await squareJpeg(a.uri);
  return { uri: URL.createObjectURL(blob), file: blob, mimeType: 'image/jpeg', type: 'image', ext: 'jpg', bytes: blob.size };
}

/** Web only: the picture cut square and scaled to PHOTO_PX on a canvas, as a JPEG. */
async function squareJpeg(uri: string): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('That photo couldn’t be opened. Try another one.'));
    img.src = uri;
  });
  let square: { source: CanvasImageSource; x: number; y: number; side: number } = { source: image, ...centreSquare(image.naturalWidth, image.naturalHeight) };
  for (const size of scaleSteps(square.side)) {
    const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size });
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser can’t make the photo. Try another one.');
    // A transparent picture shows white, not black, as a JPEG.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(square.source, square.x, square.y, square.side, square.side, 0, 0, size, size);
    square = { source: canvas, x: 0, y: 0, side: size };
  }
  const canvas = square.source as HTMLCanvasElement;
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('That photo couldn’t be made. Try another one.'))), 'image/jpeg', 0.82));
}

/** Demo mode keeps the photo on the device: the picture itself, as a data: URL on the web. */
export async function localPhoto(m: PickedMedia): Promise<string> {
  if (!isWeb || !m.file) return m.uri;
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('That photo couldn’t be kept.'));
    reader.readAsDataURL(m.file!);
  });
}
