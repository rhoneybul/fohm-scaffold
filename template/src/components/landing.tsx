import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';

import { CreditLink, FirstSteps, PhotoCard, Sink, TopShade, WeekCircles } from '@/components/board';
import { Choice, ChoiceGroup } from '@/components/choice';
import { ConsentBanner } from '@/components/consent';
import { Button, Card, IconWell, Photo, Row, RowDivider, Rows, type IconName } from '@/components/ui';
import { storedConsent, track } from '@/lib/analytics';
import { APP, hasCoach, isCoaching } from '@/lib/brand';
import type { Consent } from '@/lib/consent';
import { firstSteps, weekdayIndex } from '@/lib/home';
import { landingGoals, landingWays, priceLine, proofScreens, type LiveScreen, type ProofScreen, type StoreButton } from '@/lib/landing';
import { ASSESSMENT, LEVELS, LIBRARY } from '@/lib/progression';
import { useStore } from '@/lib/store';
import { C, F, GUTTER, R, S, T } from '@/lib/theme';

const REASON_ICONS: IconName[] = ['zap', 'smartphone', 'message-circle'];
const PAGE_W = 1080;

/**
 * The public landing page, a good one from the first deploy, built on Naz's
 * landing page and Etapa's website in the house style: a full-bleed photo
 * (`APP.heroPhoto`) sinking into the canvas with the promise in Space
 * Grotesk and one clear way in (a pill to each store once the apps are in
 * one, the web app a quiet link); the app's real screens in phone frames;
 * how it works in three steps; the catalogue's photos; the price once
 * payments are on; and a footer with who runs it. Naz's cookie banner asks
 * about counting while analytics is on. Every word comes from
 * src/lib/brand.ts or the app's own data (src/lib/landing.ts). Shown on the
 * web to anyone signed out; the iOS and Android apps go straight to sign-in.
 */
export function Landing() {
  const { width, height } = useWindowDimensions();
  const { integrations } = useStore();
  const wide = width >= 768;
  const gutter = wide ? 40 : GUTTER;
  const heroHeight = Math.max(440, Math.min(height * 0.72, 720));
  const ways = landingWays(APP.stores, isCoaching());
  const price = priceLine(integrations.billing);
  const goals = landingGoals();
  const proof = proofScreens(APP.kind, APP.screens, { owner: APP.ownerWord });

  const [consent, setConsentState] = useState<Consent | 'pending' | null>(null);
  const [asking, setAsking] = useState(false);
  const [room, setRoom] = useState(0);
  const counts = !!integrations.posthog;
  useEffect(() => {
    if (!counts) return;
    storedConsent().then((c) => {
      setConsentState(c);
      setAsking(c === 'pending');
    });
  }, [counts]);

  const page = { width: '100%', maxWidth: PAGE_W, alignSelf: 'center', paddingHorizontal: gutter } as const;
  const go = (href: string) => router.push(href as any);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ minHeight: '100%', paddingBottom: asking ? room : 0 }}>
        <View>
          <Photo uri={APP.heroPhoto?.url} ratio={width / heroHeight} radius={0} icon="image" iconHigh label={APP.heroPhoto?.caption}>
            <TopShade />
            <Sink to={C.bg} from={0.4} />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: S.lg }}>
              <View style={{ ...page, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={[T.h3, { color: APP.heroPhoto ? C.onInk : C.ink }]}>{APP.name}</Text>
                <FooterLink label="Sign in" onPress={() => go('/sign-in')} color={APP.heroPhoto ? C.onInk : C.ink} />
              </View>
            </View>
          </Photo>
          <View style={{ marginTop: wide ? -150 : -104, ...page }}>
            <Text accessibilityRole="header" aria-level={1} style={[wide ? T.heroWide : T.hero, { maxWidth: 820 }]}>
              {APP.tagline}
            </Text>
          </View>
        </View>

        <View style={page}>
          <View style={{ paddingTop: S.lg, gap: S.xl, maxWidth: 640 }}>
            <Text style={T.bodyLarge}>{APP.description}</Text>
            <Ways ways={ways} wide={wide} />
            {APP.heroPhoto ? <CreditLink photo={APP.heroPhoto} /> : null}
          </View>

          <Block title="Inside the app" line={`What you get the day you sign up to ${APP.name}.`} />
        </View>
        <ProofRail proof={proof} wide={wide} gutter={gutter} />

        <View style={page}>
          <Block title="How it works" />
          <Card flush style={{ flexDirection: wide ? 'row' : 'column' }}>
            {APP.steps.slice(0, 3).map((step, i) => (
              <View key={step.title} style={{ flex: wide ? 1 : undefined, flexDirection: wide ? 'row' : 'column' }}>
                {i > 0 ? wide ? <View style={{ width: 1, backgroundColor: C.line, marginVertical: S.lg }} /> : <RowDivider /> : null}
                <View style={{ flex: 1, padding: S.xl, gap: S.sm }}>
                  <View style={{ width: 40, height: 40, borderRadius: R.pill, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={[T.title, { color: C.onInk }]}>{i + 1}</Text>
                  </View>
                  <Text style={T.h3}>{step.title}</Text>
                  <Text style={T.body}>{step.body}</Text>
                </View>
              </View>
            ))}
          </Card>
        </View>

        {goals.length ? (
          <>
            <View style={page}>
              <Block title="What you train for" />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: S.md, paddingHorizontal: Math.max(gutter, (width - PAGE_W) / 2 + gutter) }}>
              {goals.map((g) => (
                <PhotoCard key={g.id} uri={g.photo?.url} ratio={4 / 5} title={g.title} line={g.line} credit={g.photo} compact style={{ width: wide ? 300 : 248 }} to={C.surface} />
              ))}
            </ScrollView>
          </>
        ) : null}

        <View style={page}>
          <Block title={`Why ${APP.name}`} />
          <Card flush style={{ flexDirection: wide ? 'row' : 'column' }}>
            {APP.features.map((f, i) => (
              <View key={f.title} style={{ flex: wide ? 1 : undefined, flexDirection: wide ? 'row' : 'column' }}>
                {i > 0 ? wide ? <View style={{ width: 1, backgroundColor: C.line, marginVertical: S.lg }} /> : <RowDivider /> : null}
                <View style={{ flex: 1, padding: S.xl, gap: S.md }}>
                  <IconWell icon={REASON_ICONS[i] ?? 'check'} size={40} tone="accent" />
                  <Text style={T.h3}>{f.title}</Text>
                  <Text style={T.body}>{f.body}</Text>
                </View>
              </View>
            ))}
          </Card>

          <View style={{ paddingTop: S.xxxl * 2, gap: S.lg, maxWidth: 640 }}>
            <Text accessibilityRole="header" style={wide ? T.hero : T.display}>
              Start with {APP.name}
            </Text>
            {price ? <Text style={T.bodyLarge}>{price}</Text> : null}
            <Ways ways={ways} wide={wide} />
          </View>

          <Footer onCookies={counts ? () => setAsking(true) : undefined} />
        </View>
      </ScrollView>
      {counts && asking && consent !== null ? (
        <ConsentBanner
          now={consent}
          onLayout={(e) => setRoom(e.nativeEvent.layout.height)}
          onAnswer={(c) => {
            setConsentState(c);
            setAsking(false);
          }}
        />
      ) : null}
    </View>
  );
}

/** A section's heading, Naz's: Space Grotesk over one line of DM Sans. */
function Block({ title, line }: { title: string; line?: string }) {
  const wide = useWindowDimensions().width >= 768;
  return (
    <View style={{ paddingTop: wide ? 88 : 56, paddingBottom: S.lg, gap: S.sm }}>
      <Text accessibilityRole="header" aria-level={2} style={wide ? T.hero : T.display}>
        {title}
      </Text>
      {line ? <Text style={[T.body, { maxWidth: 560 }]}>{line}</Text> : null}
    </View>
  );
}

/** The way in: a pill to each store, the web app a quiet link; or the one ink pill and sign-in. */
function Ways({ ways, wide }: { ways: ReturnType<typeof landingWays>; wide: boolean }) {
  return (
    <View style={{ gap: S.sm, maxWidth: wide ? 420 : undefined }}>
      {ways.stores.map((s, i) => (
        <StorePill key={s.store} store={s} primary={i === 0} />
      ))}
      {ways.primary ? (
        <Button
          label={ways.primary.label}
          onPress={() => {
            track('landing_way_tapped', { way: 'web' });
            router.push(ways.primary!.href as any);
          }}
        />
      ) : null}
      <Pressable
        onPress={() => {
          track('landing_way_tapped', { way: ways.stores.length ? 'web' : 'sign-in' });
          router.push(ways.quiet.href as any);
        }} accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' }}>
        <Text style={{ fontFamily: F.medium, fontSize: 14, color: C.inkMid, textDecorationLine: 'underline' }}>{ways.quiet.label}</Text>
      </Pressable>
    </View>
  );
}

/** A store's pill, as the stores' badges word it (Naz's): the first ink, the second raised. The stores' own marks, which Feather doesn't draw. */
function StorePill({ store, primary }: { store: StoreButton; primary: boolean }) {
  const ink = primary ? C.onInk : C.ink;
  return (
    <Pressable
      onPress={() => {
        track('landing_way_tapped', { way: store.store });
        Linking.openURL(store.url);
      }}
      accessibilityRole="link"
      accessibilityLabel={store.label}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: S.md, height: 56, paddingLeft: S.xl, paddingRight: S.xxl, borderRadius: R.pill, backgroundColor: primary ? C.ink : C.surface, borderWidth: primary ? 0 : 1, borderColor: C.line, opacity: pressed ? 0.8 : 1 })}>
      <MaterialCommunityIcons name={store.icon} size={26} color={ink} />
      <View>
        <Text style={{ fontFamily: F.displayMedium, fontSize: 12, lineHeight: 14, color: ink, opacity: 0.8 }}>{store.lead}</Text>
        <Text style={{ fontFamily: F.display, fontSize: 18, lineHeight: 22, color: ink }}>{store.name}</Text>
      </View>
    </Pressable>
  );
}

/** Inside the app: each screen in a phone frame, a rail on a phone, three across on a laptop. */
function ProofRail({ proof, wide, gutter }: { proof: ProofScreen[]; wide: boolean; gutter: number }) {
  const { width } = useWindowDimensions();
  const frameW = wide ? 300 : 264;
  const items = proof.map((p) => (
    <View key={p.title} style={{ width: frameW, gap: S.md }}>
      <PhoneFrame width={frameW} label={`${p.title}: ${p.line}`}>
        {p.kind === 'shot' ? <Image source={{ uri: `/landing/${p.file}` }} resizeMode="cover" style={{ width: '100%', height: '100%' }} /> : <LivePreview screen={p.screen} />}
      </PhoneFrame>
      <View style={{ gap: 2 }}>
        <Text style={T.title}>{p.title}</Text>
        <Text style={T.small}>{p.line}</Text>
      </View>
    </View>
  ));
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: wide ? S.xxl : S.lg, paddingHorizontal: Math.max(gutter, (width - PAGE_W) / 2 + gutter) }}>
      {items}
    </ScrollView>
  );
}

/** A phone's outline round a screen: ink at 10pt, 40pt corners, the canvas inside. */
function PhoneFrame({ width, label, children }: { width: number; label: string; children: React.ReactNode }) {
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={{ width, height: Math.round(width * 2.05), borderRadius: 40, borderWidth: 10, borderColor: C.ink, backgroundColor: C.bg, overflow: 'hidden' }}>
      <View pointerEvents="none" style={{ flex: 1 }}>
        {children}
      </View>
    </View>
  );
}

const noop = () => {};

/** The app's own screens, drawn with the kit from its real content: what a member sees. */
function LivePreview({ screen }: { screen: LiveScreen }) {
  const pad = { padding: S.md, paddingTop: S.xl, gap: S.md };
  if (screen === 'assessment') {
    const q = ASSESSMENT[0];
    return (
      <View style={pad}>
        <Text style={T.small}>Question 1 of {ASSESSMENT.length}</Text>
        <Text style={T.h1}>{q?.question}</Text>
        <ChoiceGroup label={q?.question}>
          {q?.answers.map((a, i) => <Choice key={a.label} label={a.label} selected={i === 0} onPress={noop} />)}
        </ChoiceGroup>
      </View>
    );
  }
  if (screen === 'path')
    return (
      <View style={pad}>
        <Text style={T.h1}>Your path</Text>
        {LEVELS.slice(0, 2).map((l, li) => (
          <View key={l.id} style={{ gap: S.sm }}>
            <Text style={T.heading}>{l.title}</Text>
            <Rows>
              {l.skills.map((s, si) => (
                <Row key={s.id} title={s.title} line={s.why} strong icon={li === 0 && si === 0 ? 'check' : 'circle'} done={li === 0 && si === 0} onPress={noop} />
              ))}
            </Rows>
          </View>
        ))}
      </View>
    );
  if (screen === 'library')
    return (
      <View style={pad}>
        <Text style={T.h1}>Library</Text>
        <Rows>
          {LIBRARY.map((l) => (
            <Row key={l.id} title={l.title} line={l.body} icon={l.kind === 'video' ? 'play' : l.kind === 'drill' ? 'repeat' : 'file-text'} onPress={noop} />
          ))}
        </Rows>
      </View>
    );
  const today = weekdayIndex(new Date());
  const steps = firstSteps({ kind: APP.kind, placed: false, checkins: 0, entries: 0, scores: 0, photo: false, coach: hasCoach(), ownerWord: APP.ownerWord });
  return (
    <View style={pad}>
      <Text style={T.h1}>Good to see you</Text>
      <Card>
        <WeekCircles done={Array.from({ length: 7 }, (_, i) => i < today)} today={today} />
      </Card>
      <FirstSteps title="Your first steps" line="Three things to get going" steps={steps.map((s) => ({ ...s, href: '/' }))} />
    </View>
  );
}

/** The footer: who runs it and their registered details, the legal pages, the credits and the cookie settings. */
function Footer({ onCookies }: { onCookies?: () => void }) {
  return (
    <View style={{ marginTop: S.xxxl * 2, paddingVertical: S.xl, borderTopWidth: 1, borderColor: C.line, gap: S.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: S.xl }}>
        <FooterLink label="Privacy" onPress={() => router.push('/privacy')} />
        <FooterLink label="Terms" onPress={() => router.push('/terms')} />
        <FooterLink label="Photo credits" onPress={() => router.push('/credits' as any)} />
        <FooterLink label={APP.supportEmail} onPress={() => Linking.openURL(`mailto:${APP.supportEmail}`)} />
        {onCookies ? <FooterLink label="Cookie settings" onPress={onCookies} /> : null}
      </View>
      <Text style={T.small}>
        © {new Date().getFullYear()} {APP.operator}
        {APP.registration ? `, ${APP.registration}` : ''}
      </Text>
    </View>
  );
}

function FooterLink({ label, onPress, color = C.inkMid }: { label: string; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Text style={{ fontFamily: F.semibold, fontSize: 14, color }}>{label}</Text>
    </Pressable>
  );
}
