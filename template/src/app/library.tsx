import { Linking } from 'react-native';

import { Body, Card, Heading, Small, Title, Screen } from '@/components/ui';
import { LIBRARY } from '@/lib/progression';

/** Drills, videos and notes from the coach, in their order. Free to everyone. */
export default function Library() {
  return (
    <Screen>
      <Title style={{ marginTop: 8 }}>Library</Title>
      {LIBRARY.map((item) => (
        <Card key={item.id} onPress={item.url ? () => Linking.openURL(item.url!) : undefined}>
          <Heading>{item.title}</Heading>
          <Body>{item.body}</Body>
          <Small>{[item.kind === 'video' ? 'Video' : item.kind === 'drill' ? 'Drill' : 'Note', item.url ? `opens ${new URL(item.url).hostname}` : ''].filter(Boolean).join(' · ')}</Small>
        </Card>
      ))}
    </Screen>
  );
}
