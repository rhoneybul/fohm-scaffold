/**
 * The board's pieces (DESIGN.md), for Home and any screen that shows things
 * rather than asks, in the house style shared with Naz and Etapa: chips in a
 * row or a wrap, the segmented control, a photo card sinking into its card, a
 * page's photo hero, a photo's credit, stat tiles, the week as seven day
 * tiles, the big numeral, a new member's first steps, and the pinned
 * primary. Touch-first: 44pt targets, nothing hover-only. Photos carry their
 * licence and credit (src/lib/photos.ts).
 */
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Linking, Platform, Pressable, ScrollView, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Chip, Photo, Row, Rows, type IconName } from '@/components/ui';
import { creditLine, type CreditedPhoto } from '@/lib/photos';
import { C, F, GUTTER, MAX_W, R, S, T, alpha } from '@/lib/theme';

/**
 * One choice of several as chips: a row that scrolls sideways (`row`, filter
 * chips), a wrap of them (`grid`), or one even row (`even`, a scale such as
 * how it felt). Neutral until chosen, then solid ink.
 */
export function Chips<T extends string>({ label, value, options, onChange, layout = 'grid', hideLabel }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; layout?: 'grid' | 'row' | 'even'; hideLabel?: boolean }) {
  const chips = options.map((o) => <Chip key={o.id} label={o.label} active={o.id === value} grow={layout === 'even'} numeric={layout === 'even' && /^\d+$/.test(o.label)} onPress={() => onChange(o.id)} />);
  return (
    <View style={{ gap: S.md }}>
      {hideLabel ? null : <Text style={T.heading}>{label}</Text>}
      {layout === 'row' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -GUTTER }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: GUTTER, paddingVertical: S.xs }} accessibilityRole="radiogroup" accessibilityLabel={label}>
          {chips}
        </ScrollView>
      ) : (
        <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: layout === 'even' ? 'nowrap' : 'wrap', gap: S.sm }}>
          {chips}
        </View>
      )}
    </View>
  );
}

/** Two or three views of one place as a segmented control: a track-grey pill, the chosen one white with a Space Grotesk label. No shadow. */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={{ flexDirection: 'row', backgroundColor: C.track, borderRadius: R.pill, padding: 3, gap: 3 }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => (on ? undefined : onChange(o.id))}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            style={({ pressed }) => ({ flex: 1, minHeight: 38, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.surface : 'transparent', opacity: pressed ? 0.8 : 1 })}>
            <Text style={on ? [T.title, { fontSize: 15 }] : { fontFamily: F.medium, fontSize: 15, color: C.inkMid }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * The fade a photo sinks into its card or the canvas through (Naz's): clear
 * from `from` down, then the colour, solid at the foot. A gradient on the
 * web, stacked bands in the apps. Never a dark scrim under white type.
 */
export function Sink({ to = C.surface, from = 0.45 }: { to?: string; from?: number }) {
  if (Platform.OS === 'web')
    return <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundImage: `linear-gradient(180deg, ${alpha(to, 0)} ${Math.round(from * 100)}%, ${alpha(to, 0.55)} ${Math.round((from + (1 - from) * 0.45) * 100)}%, ${alpha(to, 0.94)} 88%, ${to} 100%)` } as ViewStyle} />;
  const bands = 12;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: `${from * 100}%` }}>
      {Array.from({ length: bands }, (_, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: alpha(to, Math.min(1, ((i + 1) / bands) ** 0.8)) }} />
      ))}
    </View>
  );
}

/** A light shade at a photo's top, so white buttons and the phone's clock stay clear over a bright photo. */
export function TopShade() {
  if (Platform.OS === 'web') return <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '30%', backgroundImage: 'linear-gradient(180deg, rgba(17,17,19,0.35), rgba(17,17,19,0))' } as ViewStyle} />;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '24%' }}>
      {[0.3, 0.2, 0.1, 0.04].map((a) => (
        <View key={a} style={{ flex: 1, backgroundColor: `rgba(17,17,19,${a})` }} />
      ))}
    </View>
  );
}

/** A badge on a photo: the accent with a dot when it's live, else white. */
export function PhotoBadge({ text, live }: { text: string; live?: boolean }) {
  return (
    <View style={{ position: 'absolute', top: S.md, left: S.md, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: S.md, height: 28, borderRadius: R.pill, backgroundColor: live ? C.accent : 'rgba(255,255,255,0.94)' }}>
      {live ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.onAccent }} /> : null}
      <Text style={{ fontFamily: F.semibold, fontSize: 12, color: live ? C.onAccent : C.ink }}>{text}</Text>
    </View>
  );
}

/** A photo's provenance in one quiet line ("Jane Doe / Wikimedia Commons · CC BY-SA 4.0"), linked to its file page. Inside its card or hero, never floating between blocks. */
export function CreditLink({ photo, style }: { photo: CreditedPhoto; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable onPress={() => Linking.openURL(photo.page)} accessibilityRole="link" accessibilityLabel={`Photo: ${photo.caption}. ${creditLine(photo)}. Opens its page.`} hitSlop={{ top: 12, bottom: 12 }} style={[{ minHeight: 28, justifyContent: 'center', alignSelf: 'flex-start' }, style]}>
      <Text numberOfLines={1} style={{ fontFamily: F.regular, fontSize: 12, lineHeight: 16, color: C.inkFaint }}>
        {creditLine(photo)}
      </Text>
    </Pressable>
  );
}

/**
 * A photo card (Naz's): the photo full bleed under a gradient that sinks to
 * the card's white, its Space Grotesk title and line in ink on the card
 * under it, the photo's credit inside, and what's under that (a Start pill).
 * Borderless and flat at 22pt corners. For a single object; a list is rows.
 * The photo is sharp: never blurred, never a still with lettering on it.
 */
export function PhotoCard({ uri, ratio = 4 / 5, title, line, badge, icon = 'image', onPress, label, children, style, compact, letterboxed, credit, to = C.surface }: { uri?: string; ratio?: number; title: string; line?: string; badge?: { text: string; live?: boolean }; icon?: IconName; onPress?: () => void; label?: string; children?: React.ReactNode; style?: StyleProp<ViewStyle>; compact?: boolean; /** A video still, cropped to its middle (src/lib/stills.ts). */ letterboxed?: boolean; /** The photo's provenance, inside the card under its line. */ credit?: CreditedPhoto; /** What it sinks to: the card's white, or the canvas. */ to?: string }) {
  const body = (
    <>
      <Photo uri={uri} ratio={ratio} radius={0} icon={icon} letterboxed={letterboxed} iconHigh>
        <Sink to={to} from={0.4} />
        {badge ? <PhotoBadge text={badge.text} live={badge.live} /> : null}
      </Photo>
      <View style={{ marginTop: compact ? -44 : -64, paddingHorizontal: compact ? S.lg : S.xl, paddingBottom: compact ? S.lg : S.xl, gap: compact ? S.xs : S.sm }}>
        <Text accessibilityRole="header" style={compact ? T.h3 : T.cardTitle}>
          {title}
        </Text>
        {line ? <Text style={[T.small, { color: C.inkMid }]}>{line}</Text> : null}
        {credit ? <CreditLink photo={credit} style={{ marginTop: -S.xs }} /> : null}
        {children ? <View style={{ marginTop: S.sm }}>{children}</View> : null}
      </View>
    </>
  );
  const wrap: StyleProp<ViewStyle> = [{ borderRadius: R.xxl, overflow: 'hidden', backgroundColor: to }, style];
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label ?? title} style={({ pressed }) => [wrap, pressed && { opacity: 0.9 }]}>
      {body}
    </Pressable>
  ) : (
    <View style={wrap}>{body}</View>
  );
}

/**
 * A page's photo hero (Naz's): full bleed, a light shade at its top for the
 * buttons over it (`over`: Back, Save), sinking into the canvas at its foot,
 * where its Display title, line and credit sit in ink. Put it first in a
 * `Screen` with `top={false}`, and give it the gutter back with a negative
 * margin if the screen pads it.
 */
export function PhotoHero({ uri, ratio = 4 / 3, title, line, icon = 'image', label, letterboxed, over, children, credit }: { uri?: string; ratio?: number; title: string; line?: string; icon?: IconName; label?: string; letterboxed?: boolean; over?: React.ReactNode; children?: React.ReactNode; credit?: CreditedPhoto }) {
  return (
    <View>
      <View style={{ width: '100%', aspectRatio: ratio, backgroundColor: C.track }}>
        <Photo uri={uri} ratio={ratio} radius={0} icon={icon} iconHigh label={label} letterboxed={letterboxed} />
        <TopShade />
        <Sink to={C.bg} from={0.5} />
        {over}
      </View>
      <View style={{ marginTop: -56, paddingHorizontal: GUTTER, gap: S.xs }}>
        <Text accessibilityRole="header" style={T.display}>
          {title}
        </Text>
        {line ? <Text style={T.body}>{line}</Text> : null}
        {credit ? <CreditLink photo={credit} /> : null}
        {children}
      </View>
    </View>
  );
}

/**
 * A stat tile: a label over a Space Grotesk value with tabular figures, on a
 * white tile at 18pt, two to a row, for short values only (a number, a
 * word). A longer fact is a row on one card, not a tile.
 */
export function StatTile({ label, value, line, style, valueStyle }: { label: string; value: string; line?: string; style?: StyleProp<ViewStyle>; valueStyle?: StyleProp<TextStyle> }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${line ? `. ${line}` : ''}`} style={[{ flexGrow: 1, flexBasis: '45%', backgroundColor: C.surface, borderRadius: R.xl, paddingHorizontal: S.lg, paddingVertical: S.md + 2, gap: S.xs }, style]}>
      <Text style={T.label}>{label}</Text>
      <Text style={[T.statValue, valueStyle]}>{value}</Text>
      {line ? <Text style={T.small}>{line}</Text> : null}
    </View>
  );
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** This week as seven 36pt day tiles, Monday first: done ink with a white tick, undone raised with a hairline, today ringed in the accent. Put it in a Card. */
export function WeekCircles({ done, today }: { done: boolean[]; today: number }) {
  const count = done.filter(Boolean).length;
  return (
    <View accessible accessibilityLabel={`This week: ${count} ${count === 1 ? 'day' : 'days'} done`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {DAY_LETTERS.map((d, i) => {
        const isToday = i === today;
        return (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: isToday ? F.semibold : F.medium, fontSize: 12, color: isToday ? C.accent : C.inkFaint }}>{d}</Text>
            <View style={{ width: 36, height: 36, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: done[i] ? C.ink : C.raised, borderWidth: isToday ? 2 : done[i] ? 0 : 1, borderColor: isToday ? C.accent : C.line }}>
              {done[i] ? <Feather name="check" size={16} color={C.onInk} /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * A big number in Space Grotesk 600 with tabular figures (64; 96 for a
 * clock), its label in DM Sans under it. The accent only when it counts down
 * to something live.
 */
export function Numeral({ value, label, live, size = 64 }: { value: string | number; label: string; live?: boolean; size?: 64 | 96 }) {
  return (
    <View accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={[size === 96 ? T.clock : T.statLarge, { color: live ? C.accent : C.ink }]}>{value}</Text>
      <Text style={{ fontFamily: F.medium, fontSize: 15, lineHeight: 20, color: C.inkMid, marginTop: S.xs }}>{label}</Text>
    </View>
  );
}

export interface FirstStep {
  title: string;
  line: string;
  done: boolean;
  href: string;
}

/**
 * A new member's first steps, as rows on one card: what this is, then each
 * step with a ring that fills ink with a tick once it's done. Hide it once
 * every step is.
 */
export function FirstSteps({ title, line, steps }: { title: string; line: string; steps: FirstStep[] }) {
  return (
    <Rows>
      <Row icon="flag" strong title={title} line={line} />
      {steps.map((s) => (
        <Row
          key={s.title}
          title={s.title}
          line={s.line}
          done={s.done}
          label={`${s.title}. ${s.line}${s.done ? '. Done' : ''}`}
          onPress={() => router.push(s.href as any)}
          thumb={
            <View style={{ width: 32, alignItems: 'center' }}>
              <View style={{ width: 24, height: 24, borderRadius: R.pill, borderWidth: s.done ? 0 : 1.5, borderColor: C.line, backgroundColor: s.done ? C.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {s.done ? <Feather name="check" size={14} color={C.onInk} /> : null}
              </View>
            </View>
          }
        />
      ))}
    </Rows>
  );
}

/** Etapa's StickyBottomBar: the one thing to press, pinned at the foot on white over a hairline, above the safe area. For a screen with no tab bar. */
export function PinnedPill({ label, onPress, busy, disabled, icon }: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean; icon?: IconName }) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: GUTTER, paddingTop: S.md, paddingBottom: Math.max(insets.bottom, S.lg), backgroundColor: C.surface, borderTopWidth: 1, borderTopColor: C.line }}>
      <View style={{ width: '100%', maxWidth: MAX_W - S.xxxl, alignSelf: 'center' }}>
        <Button label={label} onPress={onPress} busy={busy} disabled={disabled} icon={icon} />
      </View>
    </View>
  );
}
