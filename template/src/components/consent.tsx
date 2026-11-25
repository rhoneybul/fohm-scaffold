import { Pressable, Text, View, type LayoutChangeEvent } from 'react-native';

import { setConsent, track } from '@/lib/analytics';
import { APP } from '@/lib/brand';
import { CONSENT_ANSWERS, CONSENT_NOW, CONSENT_TITLE, consentText, type Consent } from '@/lib/consent';
import { C, F, R, S, T, shadowFloat } from '@/lib/theme';

/**
 * Naz's cookie banner, on the landing page at its foot until it's answered:
 * counting only, or allow all (src/lib/consent.ts). Drawn only on the web
 * while analytics is on; Cookie settings in the footer opens it again, with
 * the answer as it stands pressed. `onLayout` tells the page how much room to
 * keep at its foot, so nothing is ever under it.
 */
export function ConsentBanner({ now, onAnswer, onLayout }: { now: Consent | 'pending'; onAnswer: (c: Consent) => void; onLayout?: (e: LayoutChangeEvent) => void }) {
  const answer = (c: Consent) => {
    setConsent(c).finally(() => {
      track('consent_chosen', { choice: c });
      onAnswer(c);
    });
  };
  return (
    <View onLayout={onLayout} pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: S.lg, paddingBottom: S.lg }}>
      <View accessibilityRole="summary" accessibilityLabel={CONSENT_TITLE} style={[{ width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: C.surface, borderRadius: R.xxl, borderWidth: 1, borderColor: C.line, padding: S.lg, gap: S.xs }, shadowFloat]}>
        <Text accessibilityRole="header" style={T.heading}>
          {CONSENT_TITLE}
        </Text>
        {now !== 'pending' ? <Text style={[T.small, { color: C.ink }]}>{CONSENT_NOW[now]}</Text> : null}
        <Text style={T.small}>{consentText(APP.name)}</Text>
        <View style={{ flexDirection: 'row', gap: S.sm, marginTop: S.sm }}>
          {CONSENT_ANSWERS.map((a) => {
            const on = now === a.choice;
            return (
              <Pressable
                key={a.choice}
                onPress={() => answer(a.choice)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => ({ flex: 1, minHeight: 44, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.ink : C.raised, opacity: pressed ? 0.75 : 1 })}>
                <Text style={{ fontFamily: F.display, fontSize: 15, color: on ? C.onInk : C.ink }}>{a.title}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
