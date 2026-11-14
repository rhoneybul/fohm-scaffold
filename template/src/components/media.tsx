/**
 * Playing and attaching videos, photos and voice notes, on the web, iOS and
 * Android. The file plays through a link that lasts an hour, fetched when the
 * player appears; the server's storage rules decide who may get one.
 */
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { isWeb } from '@/lib/config';
import { MAX_MB, pickMedia, type PickedMedia } from '@/lib/media';
import { useStore } from '@/lib/store';
import { C, R, S, sans } from '@/lib/theme';
import type { MediaType } from '@/lib/types';

function Video({ url }: { url: string }) {
  const player = useVideoPlayer(url);
  return <VideoView player={player} nativeControls contentFit="contain" style={{ width: '100%', maxWidth: 520, aspectRatio: 16 / 9, borderRadius: R.md, backgroundColor: '#000' }} />;
}

/** Plays an uploaded file by its path. */
export function MediaPlayer({ path, type }: { path: string; type?: MediaType }) {
  const { mediaUrl } = useStore();
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    mediaUrl(path)
      .then((u) => live && setUrl(u))
      .catch((e) => live && setError(e?.message ?? 'That file can’t be played.'));
    return () => {
      live = false;
    };
  }, [path, mediaUrl]);
  if (error) return <Text style={{ fontFamily: sans, fontSize: 13, color: C.danger }}>{error}</Text>;
  if (!url) return <View style={{ width: '100%', maxWidth: 520, aspectRatio: 16 / 9, borderRadius: R.md, backgroundColor: C.border }} accessibilityLabel="Loading" />;
  if (type === 'image') return <Image source={{ uri: url }} style={{ width: '100%', maxWidth: 520, aspectRatio: 4 / 3, borderRadius: R.md }} resizeMode="contain" accessibilityLabel="Photo" />;
  return <Video url={url} />;
}

/** Choose a video or photo, or record one (in the apps), to send with a message. */
export function MediaAttach({ value, onChange, dark }: { value: PickedMedia | null; onChange: (m: PickedMedia | null) => void; dark?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const ink = dark ? '#F1EEE6' : C.ink;
  const pick = (source: 'library' | 'camera') =>
    pickMedia(source)
      .then((m) => {
        setError(null);
        if (m) onChange(m);
      })
      .catch((e) => setError(e?.message ?? 'That didn’t work.'));
  const button = (label: string, onPress: () => void) => (
    <Pressable key={label} onPress={onPress} accessibilityRole="button" style={{ minHeight: 44, paddingHorizontal: S.lg, borderRadius: R.pill, borderWidth: 1, borderColor: dark ? '#2E4539' : C.border, justifyContent: 'center' }}>
      <Text style={{ fontFamily: sans, fontSize: 14, fontWeight: '600', color: ink }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ gap: S.sm }}>
      {value ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, flexWrap: 'wrap' }}>
          <Text style={{ fontFamily: sans, fontSize: 14, color: ink }}>
            {value.type === 'image' ? 'Photo' : 'Video'} attached{value.bytes ? ` (${(value.bytes / 1048576).toFixed(1)} MB)` : ''}
          </Text>
          {button('Remove', () => onChange(null))}
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: S.sm, flexWrap: 'wrap' }}>
          {button(isWeb ? 'Attach a video or photo' : 'Choose a video', () => pick('library'))}
          {!isWeb && button('Record', () => pick('camera'))}
        </View>
      )}
      <Text style={{ fontFamily: sans, fontSize: 12, color: dark ? '#9DAAA2' : C.inkFaint }}>Up to {MAX_MB} MB, about a minute of video.</Text>
      {error ? <Text style={{ fontFamily: sans, fontSize: 13, color: dark ? '#F3A3B5' : C.danger }}>{error}</Text> : null}
    </View>
  );
}
