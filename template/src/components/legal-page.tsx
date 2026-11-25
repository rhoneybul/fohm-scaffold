import { router } from 'expo-router';
import { View } from 'react-native';

import { Body, Display, Heading, Small, Screen, TextLink } from '@/components/ui';
import { LEGAL_VERSION } from '@/lib/legal';
import { S } from '@/lib/theme';

export function LegalPage({ title, sections }: { title: string; sections: { heading: string; body: string }[] }) {
  return (
    <Screen>
      <Display>{title}</Display>
      <Small>Version {LEGAL_VERSION}</Small>
      {sections.map((s) => (
        <View key={s.heading} style={{ gap: S.xs, marginTop: S.sm }}>
          <Heading>{s.heading}</Heading>
          <Body>{s.body}</Body>
        </View>
      ))}
      <TextLink label="Back" icon="chevron-left" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}
