import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { APP } from '@/lib/brand';
import { Button, TextLink } from '@/components/ui';
import { C, F, R, S, T } from '@/lib/theme';

/**
 * The public landing page: what the app is, why sign up, and the way in.
 * Shown on the web to anyone signed out; the iOS and Android apps go straight
 * to sign-in. Edit the words in src/lib/brand.ts.
 */
export function Landing() {
  const wide = useWindowDimensions().width >= 768;
  const link = (label: string, href: string) => (
    <Pressable key={href} onPress={() => router.push(href as any)} accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ fontFamily: F.semibold, fontSize: 14, color: C.ink }}>{label}</Text>
    </Pressable>
  );
  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ minHeight: '100%' }}>
      <View style={{ width: '100%', maxWidth: 1080, alignSelf: 'center', paddingHorizontal: wide ? 40 : S.xl, flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 }}>
          <Text style={T.h3}>{APP.name}</Text>
          {link('Sign in', '/sign-in')}
        </View>
        <View style={{ paddingVertical: wide ? 96 : 48, gap: S.xl, maxWidth: 720 }}>
          <Text accessibilityRole="header" style={wide ? T.heroWide : T.hero}>
            {APP.tagline}
          </Text>
          <View style={{ gap: S.sm, alignItems: 'flex-start' }}>
            <Button label="Get started" onPress={() => router.push('/sign-in?mode=up' as any)} style={{ minWidth: 240 }} />
            <TextLink label="I already have an account" onPress={() => router.push('/sign-in')} />
          </View>
        </View>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: S.lg }}>
          {APP.features.map((f) => (
            <View key={f.title} style={{ flex: 1, backgroundColor: C.surface, borderRadius: R.xxl, padding: S.xl, gap: S.sm }}>
              <Text style={T.heading}>{f.title}</Text>
              <Text style={T.body}>{f.body}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1, minHeight: 48 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.xl, paddingVertical: S.xl, borderTopWidth: 1, borderColor: C.line, marginTop: 64 }}>
          <Text style={{ fontFamily: F.regular, fontSize: 13, color: C.inkFaint, alignSelf: 'center' }}>© {APP.operator}</Text>
          {link('Privacy', '/privacy')}
          {link('Terms', '/terms')}
        </View>
      </View>
    </ScrollView>
  );
}
