/**
 * A person's avatar: their profile photo (src/lib/photo.ts) through a signed
 * link, or their initial on ink until there is one. On Home's account button,
 * on Account, and on the dashboard's People list and member page (`dark`).
 */
import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';

import { isLocalPhoto } from '@/lib/photoSize';
import { useStore } from '@/lib/store';
import { A, C, F, R } from '@/lib/theme';

/** Signed links last an hour: each path's is kept for 50 minutes, so a list doesn't ask again on every refresh. */
const links = new Map<string, { url: string; until: number }>();

export function usePhotoUrl(path?: string | null): string | null {
  const { backend } = useStore();
  const fresh = (p?: string | null) => (p ? (isLocalPhoto(p) ? p : links.get(p) && links.get(p)!.until > Date.now() ? links.get(p)!.url : null) : null);
  const [url, setUrl] = useState<string | null>(fresh(path));
  useEffect(() => {
    if (!path) return setUrl(null);
    const known = fresh(path);
    if (known) return setUrl(known);
    if (!backend || backend.mode !== 'api') return setUrl(null);
    let live = true;
    backend
      .mediaUrl(path)
      .then((u) => {
        links.set(path, { url: u, until: Date.now() + 50 * 60_000 });
        if (live) setUrl(u);
      })
      .catch(() => live && setUrl(null));
    return () => {
      live = false;
    };
  }, [path, backend]);
  return url;
}

export function Avatar({ name, photoPath, size = 44, dark }: { name: string; photoPath?: string | null; size?: number; /** The dashboard's colours. */ dark?: boolean }) {
  const url = usePhotoUrl(photoPath);
  const initial = (name || '?').trim()[0]?.toUpperCase() ?? '?';
  return (
    <View style={{ width: size, height: size, borderRadius: R.pill, overflow: 'hidden', backgroundColor: dark ? A.surfaceLight : C.ink, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.black, fontSize: Math.round(size * 0.42), color: dark ? A.text : C.onInk }}>{initial}</Text>
      {url ? <Image source={{ uri: url }} accessibilityLabel={`${name}’s photo`} accessibilityIgnoresInvertColors style={{ position: 'absolute', top: 0, left: 0, width: size, height: size }} /> : null}
    </View>
  );
}
