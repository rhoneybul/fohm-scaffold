import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import { screen } from '@/lib/analytics';
import { onNotificationTap } from '@/lib/push';
import { StoreProvider, useStore } from '@/lib/store';
import { C } from '@/lib/theme';

/** Screen views to analytics, and a tapped notification opens its screen. */
function Watchers() {
  const pathname = usePathname();
  const { ready } = useStore();
  useEffect(() => {
    if (ready) screen(pathname);
  }, [pathname, ready]);
  useEffect(() => onNotificationTap((path) => router.push(path as any)), []);
  return null;
}

export default function Layout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StoreProvider>
          <Watchers />
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
        </StoreProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
