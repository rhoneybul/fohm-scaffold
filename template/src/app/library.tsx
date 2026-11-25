import { Linking } from 'react-native';

import { Display, Row, Rows, Screen, Thumb } from '@/components/ui';
import { LIBRARY } from '@/lib/progression';
import { stillOf } from '@/lib/stills';

const KIND = { video: 'Video', drill: 'Drill', note: 'Note' } as const;
const ICON = { video: 'play-circle', drill: 'activity', note: 'file-text' } as const;

/**
 * Drills, videos and notes, in order, as rows on one card. A video shows a
 * still from its middle, cropped clear of any lettering (src/lib/stills.ts).
 * Free to everyone.
 */
export default function Library() {
  return (
    <Screen>
      <Display>Library</Display>
      <Rows>
        {LIBRARY.map((item) => {
          const still = item.kind === 'video' ? stillOf(item.url) : undefined;
          const meta = [KIND[item.kind], item.url ? `opens ${new URL(item.url).hostname}` : ''].filter(Boolean).join(' · ');
          return (
            <Row
              key={item.id}
              strong
              title={item.title}
              line={`${item.body}\n${meta}`}
              lines={6}
              thumb={still ? <Thumb uri={still} letterboxed icon={ICON[item.kind]} /> : undefined}
              icon={ICON[item.kind]}
              onPress={item.url ? () => Linking.openURL(item.url!) : undefined}
              chevron={item.url ? 'external-link' : false}
            />
          );
        })}
      </Rows>
    </Screen>
  );
}
