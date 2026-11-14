/**
 * Video, photos and voice notes: choosing or recording one on the web, iOS
 * or Android (expo-image-picker), and turning it into bytes to upload. The
 * upload itself goes straight to Supabase Storage (backend.uploadMedia), into
 * the person's own folder; the database decides who may play it (migration
 * 20260101000005). Files are capped at 50 MB, the bucket's limit: about a
 * minute of phone video. Raise it in Supabase (Storage → Settings, and the
 * bucket) on a paid plan.
 */
import * as ImagePicker from 'expo-image-picker';

import type { MediaType } from './types';

export const MAX_MB = 50;
export const MAX_SECONDS = 120;

export interface PickedMedia {
  uri: string;
  /** The browser's File, on the web. */
  file?: Blob;
  mimeType: string;
  type: MediaType;
  ext: string;
  bytes?: number;
}

/** Opens the library ('library') or the camera ('camera') for a video or photo; null if they cancel. */
export async function pickMedia(source: 'library' | 'camera'): Promise<PickedMedia | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['videos', 'images'], videoMaxDuration: MAX_SECONDS, quality: 0.8, allowsEditing: false };
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) throw new Error('Allow the camera in your settings to record a video.');
  }
  const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;
  const a = result.assets[0];
  const type: MediaType = a.type === 'image' ? 'image' : 'video';
  const mimeType = a.mimeType ?? (type === 'image' ? 'image/jpeg' : 'video/mp4');
  const ext = (a.fileName?.split('.').pop() ?? mimeType.split('/')[1] ?? 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'mp4';
  if (a.fileSize && a.fileSize > MAX_MB * 1024 * 1024) throw new Error(`That file is over ${MAX_MB} MB. Try a shorter clip.`);
  return { uri: a.uri, file: (a as { file?: Blob }).file, mimeType, type, ext, bytes: a.fileSize };
}

/** The bytes to upload: the File on the web, read from the device in the apps. */
export async function mediaBody(m: PickedMedia): Promise<Blob | ArrayBuffer> {
  if (m.file) return m.file;
  return (await fetch(m.uri)).arrayBuffer();
}
