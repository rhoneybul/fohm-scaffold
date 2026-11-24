import { router } from 'expo-router';

import { IconButton } from '@/components/ui';

/** Back to where the member came from, or `fallback` when they landed here directly. A 44pt round button. */
export function BackLink({ label = 'Back', fallback = '/home' }: { label?: string; fallback?: string }) {
  return <IconButton icon="chevron-left" label={label} onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback as any))} />;
}
