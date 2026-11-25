import { router } from 'expo-router';

import { IconButton } from '@/components/ui';

/** Back to where the member came from, or `fallback` when they landed here directly. Etapa's header button: a 44pt white disc (`glass` over a photo). */
export function BackLink({ label = 'Back', fallback = '/home', tone = 'surface' }: { label?: string; fallback?: string; tone?: 'surface' | 'glass' }) {
  return <IconButton icon="chevron-left" label={label} tone={tone} onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback as any))} />;
}
