import { Feather } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components/error-boundary';
import { hideNativeSplash, keepNativeSplash, LoadingSplash } from '@/components/logo-loader';
import { TabBar } from '@/components/tab-bar';
import { screen } from '@/lib/analytics';
import { isWeb } from '@/lib/config';
import { canonicalFor } from '@/lib/landing';
import { onNotificationTap } from '@/lib/push';
import { BOOT_WAIT_MS } from '@/lib/splash';
import { FONT_FILES, FONT_WAIT_MS } from '@/lib/fonts';
import { StoreProvider, useStore } from '@/lib/store';
import { C } from '@/lib/theme';

// The phone's splash stays up until LoadingSplash has drawn under it (src/components/logo-loader.tsx).
keepNativeSplash();

/** Screen views to analytics, and a tapped notification opens its screen. */
function Watchers() {
  const pathname = usePathname();
  const { ready } = useStore();
  useEffect(() => {
    if (ready) screen(pathname);
  }, [pathname, ready]);
  useEffect(() => onNotificationTap((path) => router.push(path as any)), []);
  // Every route is the same exported page (scripts/seo.ts writes its tags), so each names its own address as canonical.
  useEffect(() => {
    if (!isWeb || typeof document === 'undefined') return;
    const link = document.querySelector('link[rel="canonical"]');
    if (link) link.setAttribute('href', canonicalFor(window.location.origin, pathname));
  }, [pathname]);
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

/** True once `ms` have passed since the app opened. */
function useWaited(ms: number) {
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), ms);
    return () => clearTimeout(t);
  }, [ms]);
  return waited;
}

/**
 * The launch screen over the app until the session is known (or BOOT_WAIT_MS
 * has passed: it never holds the app up longer), then a short fade.
 */
function BootSplash() {
  const { ready } = useStore();
  const waited = useWaited(BOOT_WAIT_MS);
  const [gone, setGone] = useState(false);
  const onGone = useCallback(() => setGone(true), []);
  if (gone) return null;
  return <LoadingSplash leaving={ready || waited} onGone={onGone} />;
}

export default function Layout() {
  const fontsReady = useFontsOrTimeout();
  // Should the JS never draw (an early crash), the phone's splash still goes.
  useEffect(() => {
    const t = setTimeout(hideNativeSplash, BOOT_WAIT_MS);
    return () => clearTimeout(t);
  }, []);
  if (!fontsReady) return <LoadingSplash />;
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <StoreProvider>
          <Watchers />
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }} />
          <TabBar />
          <BootSplash />
        </StoreProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
