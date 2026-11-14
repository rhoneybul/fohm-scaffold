import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { APP } from '@/lib/brand';
import { C, R, S, sans } from '@/lib/theme';

/**
 * The public landing page: what the app is, why sign up, and the way in.
 * Shown on the web to anyone signed out; the iOS and Android apps go straight
 * to sign-in. Edit the words in src/lib/brand.ts.
 */
export function Landing() {
  const wide = useWindowDimensions().width >= 768;
  const link = (label: string, href: string) => (
    <Pressable key={href} onPress={() => router.push(href as any)} accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ fontFamily: sans, fontSize: 14, color: C.inkMid }}>{label}</Text>
    </Pressable>
  );
  const cta = (label: string, primary: boolean, href: string) => (
    <Pressable
      onPress={() => router.push(href as any)}
      accessibilityRole="link"
      style={({ hovered }: any) => [
        { minHeight: 52, paddingHorizontal: 28, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
        primary ? { backgroundColor: C.accent } : { borderWidth: 1, borderColor: C.border, backgroundColor: C.surface },
        hovered && { opacity: 0.9 },
      ]}>
      <Text style={{ fontFamily: sans, fontSize: 16, fontWeight: '600', color: primary ? C.onAccent : C.ink }}>{label}</Text>
    </Pressable>
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ minHeight: '100%' }}>
      <View style={{ width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: wide ? 40 : 16, flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 }}>
          <Text style={{ fontFamily: sans, fontSize: 20, fontWeight: '700', color: C.ink }}>{APP.name}</Text>
          {link('Sign in', '/sign-in')}
        </View>
        <View style={{ paddingVertical: wide ? 96 : 56, gap: S.xl, maxWidth: 720 }}>
          <Text accessibilityRole="header" style={{ fontFamily: sans, fontSize: wide ? 56 : 38, lineHeight: wide ? 62 : 44, fontWeight: '800', color: C.ink }}>
            {APP.tagline}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>
            {cta('Get started', true, '/sign-in?mode=up')}
            {cta('Sign in', false, '/sign-in')}
          </View>
        </View>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: S.lg }}>
          {APP.features.map((f) => (
            <View key={f.title} style={{ flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, padding: S.xl, gap: S.sm }}>
              <Text style={{ fontFamily: sans, fontSize: 18, fontWeight: '600', color: C.ink }}>{f.title}</Text>
              <Text style={{ fontFamily: sans, fontSize: 15, lineHeight: 22, color: C.inkMid }}>{f.body}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, minHeight: 48 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.xl, paddingVertical: S.xl, borderTopWidth: 1, borderColor: C.border, marginTop: 64 }}>
          <Text style={{ fontFamily: sans, fontSize: 14, color: C.inkFaint, alignSelf: 'center' }}>© {APP.operator}</Text>
          {link('Privacy', '/privacy')}
          {link('Terms', '/terms')}
        </View>
      </View>
    </ScrollView>
  );
}
