/**
 * The board's pieces (DESIGN.md), for Home and any screen that shows things
 * rather than asks: segmented filter chips and a segmented control, a photo
 * card with a scrim, a row with a square photo, stat tiles, the week as seven
 * circles, a giant numeral, and a first-steps checklist. Touch-first: 44pt
 * targets, nothing hover-only. Photos carry their licence and credit
 * (src/lib/photos.ts).
 */
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, ScrollView, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { Photo, type IconName } from '@/components/ui';
import { C, F, R, S, T, shadow } from '@/lib/theme';

/**
 * One choice of several as segmented blocks: a grid, or one row that
 * scrolls sideways. Ink when chosen.
 */
export function Chips<T extends string>({ label, value, options, onChange, layout = 'grid', hideLabel, columns = 3 }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void; layout?: 'grid' | 'row'; hideLabel?: boolean; columns?: number }) {
  const blocks = options.map((o) => {
    const on = o.id === value;
    return (
      <Pressable
        key={o.id}
        onPress={() => onChange(o.id)}
        accessibilityRole="radio"
        accessibilityLabel={o.label}
        accessibilityState={{ checked: on }}
        style={({ pressed }) => ({
          minHeight: 48,
          paddingHorizontal: S.md,
          borderRadius: R.sm,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: on ? C.ink : C.surface,
          borderWidth: 1,
          borderColor: on ? C.ink : C.line,
          opacity: pressed ? 0.85 : 1,
          ...(layout === 'grid' ? { flexBasis: `${Math.floor(100 / columns) - 3}%` as `${number}%`, flexGrow: 1 } : { minWidth: 76 }),
        })}>
        <Text numberOfLines={1} style={{ fontFamily: on ? F.bold : F.medium, fontSize: 15, color: on ? C.onInk : C.ink }}>
          {o.label}
        </Text>
      </Pressable>
    );
  });
  return (
    <View style={{ gap: S.md }}>
      {hideLabel ? null : <Text style={[T.heading, { fontSize: 17 }]}>{label}</Text>}
      {layout === 'grid' ? (
        <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
          {blocks}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -S.lg }} contentContainerStyle={{ gap: S.sm, paddingHorizontal: S.lg }} accessibilityRole="radiogroup" accessibilityLabel={label}>
          {blocks}
        </ScrollView>
      )}
    </View>
  );
}

/** Two or three views of one place: a grey track with the chosen one a white pill. 48 tall. */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View accessibilityRole="tablist" accessibilityLabel={label} style={{ flexDirection: 'row', backgroundColor: C.panel, borderRadius: R.pill, padding: 4, gap: 4 }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => (on ? undefined : onChange(o.id))}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            accessibilityLabel={o.label}
            style={({ pressed }) => [{ flex: 1, minHeight: 44, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? C.surface : 'transparent', opacity: pressed ? 0.8 : 1 }, on ? shadow : null]}>
            <Text style={{ fontFamily: on ? F.bold : F.semibold, fontSize: 15, color: on ? C.ink : C.inkMid }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The dark fade under white type on a photo: a gradient on the web, stacked bands in the apps. */
export function Scrim({ from = 0.35, depth = 0.78 }: { from?: number; depth?: number }) {
  if (Platform.OS === 'web')
    return <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: 0, backgroundImage: `linear-gradient(180deg, rgba(10,11,12,0) ${Math.round(from * 100)}%, rgba(10,11,12,${depth}) 100%)` } as ViewStyle} />;
  const bands = 8;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, top: `${from * 100}%` }}>
      {Array.from({ length: bands }, (_, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: `rgba(10,11,12,${((i + 1) / bands) * depth})` }} />
      ))}
    </View>
  );
}

/**
 * A photo card: the photo full bleed, a scrim, white type at its foot, and
 * what's under it (a Start pill). `lettered` is for a photo that may carry
 * its own lettering (a video still, a poster): the scrim starts higher and
 * goes deeper, and `blur` can soften the photo too, so the title always reads.
 * `badge` sits top left; `live` paints it in the accent (today, now).
 */
export function PhotoCard({ uri, ratio = 4 / 5, title, line, badge, icon = 'image', onPress, label, children, radius = R.lg, style, flat, compact, lettered, blur }: { uri?: string; ratio?: number; title: string; line?: string; badge?: { text: string; live?: boolean }; icon?: IconName; onPress?: () => void; label?: string; children?: React.ReactNode; radius?: number; style?: StyleProp<ViewStyle>; flat?: boolean; compact?: boolean; lettered?: boolean; blur?: number }) {
  const body = (
    <Photo uri={uri} ratio={ratio} radius={radius} icon={icon} blur={blur} style={{ backgroundColor: C.photoGround }}>
      <Scrim from={lettered ? 0.1 : 0.35} depth={lettered ? 0.9 : 0.78} />
      {badge ? (
        <View style={{ position: 'absolute', top: S.lg, left: S.lg, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: S.md, height: 30, borderRadius: R.pill, backgroundColor: badge.live ? C.accent : 'rgba(255,255,255,0.92)' }}>
          {badge.live ? <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.onAccent }} /> : null}
          <Text style={{ fontFamily: F.bold, fontSize: 13, color: badge.live ? C.onAccent : C.ink }}>{badge.text}</Text>
        </View>
      ) : null}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: compact ? S.lg : S.lg + 4, gap: compact ? 6 : S.sm }}>
        <Text accessibilityRole="header" style={[T.cardTitle, compact && { fontSize: 21, lineHeight: 25, letterSpacing: -0.4 }]}>
          {title}
        </Text>
        {line ? <Text style={{ fontFamily: F.medium, fontSize: compact ? 13 : 15, lineHeight: compact ? 18 : 20, color: C.onInkMid }}>{line}</Text> : null}
        {children ? <View style={{ marginTop: S.sm }}>{children}</View> : null}
      </View>
    </Photo>
  );
  const wrap: StyleProp<ViewStyle> = [{ borderRadius: radius }, flat ? null : shadow, style];
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label ?? title} style={({ pressed }) => [wrap, pressed && { opacity: 0.94, transform: [{ scale: 0.99 }] }]}>
      {body}
    </Pressable>
  ) : (
    <View style={wrap}>{body}</View>
  );
}

/** An item in a list: a square photo, a bold title, a grey line; `done` ticks the photo, `right` sits beside (a bookmark). */
export function PhotoRow({ uri, title, line, onPress, done, icon = 'image', right }: { uri?: string; title: string; line?: string; onPress: () => void; done?: boolean; icon?: IconName; right?: React.ReactNode }) {
  const row = (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}${line ? `. ${line}` : ''}${done ? '. Done' : ''}`}
      style={({ pressed }) => ({ flex: 1, flexDirection: 'row', gap: S.lg, alignItems: 'center', minHeight: 96, paddingVertical: S.xs, opacity: pressed ? 0.75 : 1 })}>
      <View style={{ width: 92 }}>
        <Photo uri={uri} ratio={1} radius={R.sm} icon={icon} />
        {done ? (
          <View style={{ position: 'absolute', top: 6, left: 6, width: 24, height: 24, borderRadius: R.pill, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="check" size={14} color={C.onInk} />
          </View>
        ) : null}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={T.rowTitle} numberOfLines={2}>
          {title}
        </Text>
        {line ? (
          <Text style={T.small} numberOfLines={2}>
            {line}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
  if (!right) return row;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.xs }}>
      {row}
      {right}
    </View>
  );
}

/** A stat tile: a small grey label over a bold value, one value size in every grid; `line` compares it. Two to a row. */
export function StatTile({ label, value, line, style }: { label: string; value: string; line?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${line ? `. ${line}` : ''}`} style={[{ flexGrow: 1, flexBasis: '45%', backgroundColor: C.panel, borderRadius: R.md, paddingHorizontal: S.lg, paddingVertical: S.md + 2, gap: 4 }, style]}>
      <Text style={T.label}>{label}</Text>
      <Text style={T.statValue}>{value}</Text>
      {line ? <Text style={[T.small, { fontSize: 13, lineHeight: 17 }]}>{line}</Text> : null}
    </View>
  );
}

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** This week as seven circles, Monday first: a done day filled ink with a check, today ringed in the accent. */
export function WeekCircles({ done, today }: { done: boolean[]; today: number }) {
  const count = done.filter(Boolean).length;
  return (
    <View accessible accessibilityLabel={`This week: ${count} ${count === 1 ? 'day' : 'days'} done`} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {DAY_LETTERS.map((d, i) => {
        const isToday = i === today;
        return (
          <View key={i} style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontFamily: isToday ? F.extrabold : F.semibold, fontSize: 13, color: isToday ? C.accent : C.inkMid }}>{d}</Text>
            <View style={{ width: 38, height: 38, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: done[i] ? C.ink : C.panel, borderWidth: isToday ? 2 : 0, borderColor: C.accent }}>
              {done[i] ? <Feather name="check" size={18} color={C.onInk} /> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** A giant number with its label under it. In the accent only when it counts down to something live. */
export function Numeral({ value, label, live, size = 88 }: { value: string | number; label: string; live?: boolean; size?: number }) {
  return (
    <View accessible accessibilityLabel={`${value} ${label}`}>
      <Text style={[T.numeral, { fontSize: size, lineHeight: Math.round(size * 1.09), letterSpacing: -size * 0.03, color: live ? C.accent : C.ink }]}>{value}</Text>
      <Text style={{ fontFamily: F.bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2, color: C.ink, marginTop: -4 }}>{label}</Text>
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
 * A new member's first steps, as a checklist in a card: what this is, then
 * each step with a tick once it's done. Hide it once every step is.
 */
export function FirstSteps({ title, line, steps, mark }: { title: string; line: string; steps: FirstStep[]; mark?: React.ReactNode }) {
  return (
    <View style={[{ backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg, gap: S.md }, shadow]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingBottom: S.xs }}>
        <View style={{ width: 48, height: 48, borderRadius: R.pill, backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center' }}>{mark ?? <Feather name="flag" size={20} color={C.ink} />}</View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={T.rowTitle}>{title}</Text>
          <Text style={T.small}>{line}</Text>
        </View>
      </View>
      <View>
        {steps.map((s, i) => (
          <Pressable
            key={s.title}
            onPress={() => router.push(s.href as any)}
            accessibilityRole="button"
            accessibilityLabel={`${s.title}. ${s.line}${s.done ? '. Done' : ''}`}
            style={({ pressed }) => ({ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: S.md, borderTopWidth: i === 0 ? 0 : 1, borderTopColor: C.line, opacity: pressed ? 0.6 : 1 })}>
            <View style={{ width: 28, height: 28, borderRadius: R.pill, borderWidth: s.done ? 0 : 1.5, borderColor: C.line, backgroundColor: s.done ? C.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
              {s.done ? <Feather name="check" size={16} color={C.onInk} /> : null}
            </View>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={[T.rowTitle, { fontSize: 16 }, s.done && { color: C.inkMid, textDecorationLine: 'line-through' }]}>{s.title}</Text>
              <Text style={T.small}>{s.line}</Text>
            </View>
            <Feather name="chevron-right" size={18} color={C.inkFaint} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** An ink card for when there's no photo to show: a title, a line and one white pill. */
export function InkCard({ title, line, children }: { title: string; line: string; children?: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: C.ink, borderRadius: R.lg, padding: S.xl, gap: S.md }}>
      <Text accessibilityRole="header" style={T.cardTitle}>
        {title}
      </Text>
      <Text style={{ fontFamily: F.regular, fontSize: 16, lineHeight: 23, color: C.onInkMid }}>{line}</Text>
      {children ? <View style={{ marginTop: S.sm }}>{children}</View> : null}
    </View>
  );
}
