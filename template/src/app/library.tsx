import { router } from 'expo-router';
import { Linking } from 'react-native';

import { Body, Button, Card, Heading, Small, Title, Screen } from '@/components/ui';
import { LIBRARY } from '@/lib/progression';

/** Drills, videos and notes from the coach, in their order. Free to everyone. */
export default function Library() {
  return (
    <Screen>
      <Title style={{ marginTop: 16 }}>Library</Title>
      {LIBRARY.map((item) => (
        <Card key={item.id} onPress={item.url ? () => Linking.openURL(item.url!) : undefined}>
          <Small>{item.kind === 'video' ? 'Video' : item.kind === 'drill' ? 'Drill' : 'Note'}</Small>
          <Heading>{item.title}</Heading>
          <Body>{item.body}</Body>
          {item.url ? <Small>Opens {new URL(item.url).hostname}</Small> : null}
        </Card>
      ))}
      <Button label="Back" kind="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
    </Screen>
  );
}
