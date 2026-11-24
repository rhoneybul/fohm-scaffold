/**
 * The floating tab bar: a white pill 16px above the safe area, an icon and a
 * label a tab, the one you're on in a grey pill. Only on the member's main
 * tabs (`TAB_ROUTES` in src/lib/tabs.ts). Screens pad their foot by
 * `TAB_BAR_ROOM` through `useFootRoom`.
 */
import { Feather } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP } from '@/lib/brand';
import { useStore } from '@/lib/store';
import { TAB_ROUTES, showsTabBar, tabOf } from '@/lib/tabs';
import { C, F, MAX_W, R, S, shadowFloat } from '@/lib/theme';

export function TabBar() {
  const pathname = usePathname();
  const { ready, me } = useStore();
  const insets = useSafeAreaInsets();
  if (!ready || !showsTabBar(APP.kind, pathname, me?.role === 'member')) return null;
  const current = tabOf(APP.kind, pathname);
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 16, alignItems: 'center', paddingHorizontal: S.lg }}>
      <View accessibilityRole="tablist" style={[{ width: '100%', maxWidth: MAX_W - S.xxl, height: 64, borderRadius: R.pill, backgroundColor: C.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 }, shadowFloat]}>
        {TAB_ROUTES[APP.kind].map((t) => {
          const on = current === t;
          return (
            <Pressable
              key={t.href}
              onPress={() => (on && pathname.replace(/\/+$/, '') === t.href ? undefined : router.replace(t.href as any))}
              accessibilityRole="tab"
              accessibilityLabel={t.label}
              accessibilityState={{ selected: on }}
              style={({ pressed }) => ({ flex: 1, height: 52, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: on ? C.panel : 'transparent', opacity: pressed ? 0.7 : 1 })}>
              <Feather name={t.icon} size={19} color={on ? C.ink : C.inkMid} />
              <Text numberOfLines={1} style={{ fontFamily: on ? F.bold : F.semibold, fontSize: 11, lineHeight: 13, color: on ? C.ink : C.inkMid }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
