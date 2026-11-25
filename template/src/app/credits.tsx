import { Linking } from 'react-native';

import { BackLink } from '@/components/back';
import { Body, Display, Row, Rows, Screen, Section, Thumb } from '@/components/ui';
import { APP } from '@/lib/brand';
import { creditSections } from '@/lib/credits';
import { creditLine, type CreditedPhoto } from '@/lib/photos';

/**
 * Every photo the app shows, with who took it, its licence and its page, as
 * the licences ask. Only photos the app may use are shown (src/lib/photos.ts).
 */
export default function Credits() {
  const sections = creditSections();
  return (
    <Screen>
      <BackLink fallback="/account" />
      <Display>Photo credits</Display>
      <Body>
        {sections.length
          ? `The photos in ${APP.name} are each shown under their own open licence, or with the photographer’s permission. Tap one to see its page and licence. Your own photo is yours, and only you and the people who run ${APP.name} see it.`
          : `${APP.name} shows no one else’s photos yet. Your own photo is yours, and only you and the people who run ${APP.name} see it.`}
      </Body>
      {sections.map((section) => (
        <Section key={section.title} title={section.title}>
          <Rows>
            {section.photos.map(({ label, photo }) => (
              <CreditRow key={`${label}-${photo.url}`} photo={photo} label={label} />
            ))}
          </Rows>
        </Section>
      ))}
    </Screen>
  );
}

/** A photo as a row: its thumbnail, what it shows, and who took it under which licence; it opens its file page. */
function CreditRow({ photo, label }: { photo: CreditedPhoto; label: string }) {
  return (
    <Row
      thumb={<Thumb uri={photo.url} />}
      title={photo.caption}
      line={`${label} · ${creditLine(photo)}`}
      role="link"
      label={`${photo.caption}. ${label}. ${creditLine(photo)}. Opens its page.`}
      chevron="external-link"
      onPress={() => Linking.openURL(photo.page)}
    />
  );
}
