import { router } from 'expo-router';
import { View } from 'react-native';

import { Body, Button, Heading, Small, Title, Screen } from '@/components/ui';
import { LEGAL_VERSION } from '@/lib/legal';

export function LegalPage({ title, sections }: { title: string; sections: { heading: string; body: string }[] }) {
  return (
    <Screen>
      <Title style={{ marginTop: 16 }}>{title}</Title>
      <Small>Version {LEGAL_VERSION}</Small>
      {sections.map((s) => (
        <View key={s.heading} style={{ gap: 4 }}>
          <Heading>{s.heading}</Heading>
          <Body>{s.body}</Body>
        </View>
      ))}
      <Button label="Back" kind="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}
