import { Linking, Pressable, Text, View } from 'react-native';

import { BackLink } from '@/components/back';
import { Body, Photo, Screen, Section, Small, Title } from '@/components/ui';
import { APP } from '@/lib/brand';
import { creditSections } from '@/lib/credits';
import { creditLine, type CreditedPhoto } from '@/lib/photos';
import { C, R, S, T } from '@/lib/theme';

/**
 * Every photo the app shows, with who took it, its licence and its page, as
 * the licences ask. Only photos the app may use are shown (src/lib/photos.ts).
 */
export default function Credits() {
  const sections = creditSections();
  return (
    <Screen>
      <BackLink fallback="/account" />
      <Title>Photo credits</Title>
      <Body>
        {sections.length
          ? `The photos in ${APP.name} are each shown under their own open licence, or with the photographer’s permission. Tap one to see its page and licence. Your own photo is yours, and only you and the people who run ${APP.name} see it.`
          : `${APP.name} shows no one else’s photos yet. Your own photo is yours, and only you and the people who run ${APP.name} see it.`}
      </Body>
      {sections.map((section) => (
        <Section key={section.title} title={section.title}>
          <View>
            {section.photos.map(({ label, photo }, i) => (
              <CreditRow key={`${label}-${photo.url}`} photo={photo} label={label} first={i === 0} />
            ))}
          </View>
        </Section>
      ))}
    </Screen>
  );
}

function CreditRow({ photo, label, first }: { photo: CreditedPhoto; label: string; first: boolean }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(photo.page)}
      accessibilityRole="link"
      accessibilityLabel={`${photo.caption}. ${label}. ${creditLine(photo)}. Opens its page.`}
      style={({ pressed }) => ({ minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.sm, borderTopWidth: first ? 0 : 1, borderTopColor: C.line, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 60 }}>
        <Photo uri={photo.url} ratio={1} radius={R.sm} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[T.rowTitle, { fontSize: 15 }]} numberOfLines={2}>
          {photo.caption}
        </Text>
        <Small>
          {label} · {creditLine(photo)}
        </Small>
      </View>
    </Pressable>
  );
}
