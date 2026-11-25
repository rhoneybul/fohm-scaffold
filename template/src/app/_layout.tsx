import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import { TabBar } from '@/components/tab-bar';
import { screen } from '@/lib/analytics';
import { onNotificationTap } from '@/lib/push';
import { FONT_FILES, FONT_WAIT_MS } from '@/lib/fonts';
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

/** The faces the app draws in (src/lib/fonts.ts: Space Grotesk and DM Sans, as Naz and Etapa) and the icon set, loaded once. */
const FONTS = { ...FONT_FILES, ...Feather.font };

/** True once the fonts are in, failed, or the wait is over. */
function useFontsOrTimeout() {
  const [loaded, error] = useFonts(FONTS);
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), FONT_WAIT_MS);
    return () => clearTimeout(t);
  }, []);
  return loaded || !!error || waited;
}

export default function Layout() {
  const fontsReady = useFontsOrTimeout();
  if (!fontsReady) return <View style={{ flex: 1, backgroundColor: C.bg }} />;
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StoreProvider>
          <Watchers />
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
          <TabBar />
        </StoreProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
