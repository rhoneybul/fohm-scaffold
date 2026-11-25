/**
 * The member app's kit (DESIGN.md), in the house style shared with Naz and
 * Etapa: Screen, the type (Display, Title, Heading, Body, Strong, Small,
 * Label), Section, the buttons (the primary ink pill with its accent disc,
 * secondary, ghost, danger, TextLink, IconButton), Field, Card with Rows, Row
 * and RowDivider, Thumb, Chip, Note, Photo, Empty and ErrorText. Screens
 * compose from these so they can't drift. The board's pieces (photo cards,
 * stat tiles, the week, numerals, chips in a row) are in board.tsx.
 * Touch-first: 44pt targets, safe areas, nothing that needs hover.
 */
import { Feather } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP } from '@/lib/brand';
import { letterboxCrop } from '@/lib/stills';
import { useStore } from '@/lib/store';
import { showsTabBar } from '@/lib/tabs';
import { C, F, GUTTER, MAX_W, R, S, T, TAB_BAR_ROOM, alpha, tabular } from '@/lib/theme';

export type IconName = React.ComponentProps<typeof Feather>['name'];

/** Room at the foot of a screen: clear of the floating tab bar where it shows, else a comfortable margin. */
export function useFootRoom(extra = 0) {
  const pathname = usePathname();
  const { me } = useStore();
  const insets = useSafeAreaInsets();
  return (showsTabBar(APP.kind, pathname, me?.role === 'member') ? TAB_BAR_ROOM + insets.bottom : 64) + extra;
}

/** A screen: the canvas, one column inside the 20pt gutter, its foot clear of the tab bar. */
export function Screen({ children, scroll = true, gap = S.lg, top = true }: { children: React.ReactNode; scroll?: boolean; gap?: number; top?: boolean }) {
  const foot = useFootRoom();
  const inner = <View style={{ width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: GUTTER, paddingTop: top ? S.lg : 0, gap }}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={top ? ['top', 'left', 'right'] : ['left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: foot }} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const text = (base: TextStyle, role?: 'header') =>
  function Typed({ children, style, lines }: { children: React.ReactNode; style?: StyleProp<TextStyle>; lines?: number }) {
    return (
      <Text accessibilityRole={role} numberOfLines={lines} style={[base, style]}>
        {children}
      </Text>
    );
  };
/** A screen's title. */
export const Display = text(T.hero, 'header');
/** A page's second-level title: a greeting, a name. */
export const Title = text(T.h1, 'header');
/** A section's heading, or a card's. */
export const Heading = text(T.heading, 'header');
export const Body = text(T.body);
export const Strong = text(T.bodyStrong);
export const Small = text(T.small);
/** A field's or a tile's label: sentence case, never uppercase or letter-spaced (DESIGN.md). */
export const Label = text(T.label);

/**
 * A section: a Space Grotesk heading about 28pt below what's above it (12
 * here on the screen's 16pt gap), an optional line under it, its content
 * 12pt under that, and an optional action at its right.
 */
export function Section({ title, line, children, action }: { title: string; line?: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View style={{ marginTop: S.md, gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: S.md }}>
        <View style={{ flex: 1, gap: S.xs }}>
          <Text accessibilityRole="header" style={T.h2}>
            {title}
          </Text>
          {line ? <Small>{line}</Small> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'accent';

const BUTTON_HEIGHT = 56;
const DISC = 44;
const DISC_INSET = (BUTTON_HEIGHT - DISC) / 2;

/**
 * The buttons (Etapa's CTAs). `primary`: the ink pill, its Space Grotesk
 * label set left and a 44pt accent disc inset 6pt from its right end holding
 * an arrow (or the button's own icon: play on Start, a tick on Done); one to a
 * screen. Small, it's a plain ink pill. `secondary` (and `outline`): a
 * transparent pill with a hairline at ink 0.28 and a centred label. `ghost`:
 * words only. `danger`: the secondary's shape in red. `accent` draws as the
 * primary: the accent lives on its disc, never as a button's fill.
 */
export function Button({ label, onPress, kind = 'primary', busy, disabled, icon, small, style }: { label: string; onPress: () => void; kind?: Kind; busy?: boolean; disabled?: boolean; icon?: IconName; small?: boolean; style?: StyleProp<ViewStyle> }) {
  const off = disabled || busy;
  const k = kind === 'accent' ? 'primary' : kind === 'outline' ? 'secondary' : kind;
  const disc = k === 'primary' && !small;
  const fg = k === 'primary' ? (disabled ? C.inkFaint : C.onInk) : k === 'danger' ? C.danger : k === 'ghost' ? C.inkFaint : C.ink;
  const shape: Record<typeof k, ViewStyle> = {
    primary: { backgroundColor: disabled ? C.track : C.ink },
    secondary: { borderWidth: 1, borderColor: alpha(C.ink, 0.28) },
    ghost: {},
    danger: { borderWidth: 1, borderColor: alpha(C.danger, 0.5) },
  };
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      style={({ pressed }) => [
        { minHeight: small ? 44 : BUTTON_HEIGHT, borderRadius: R.pill, flexDirection: 'row', gap: S.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: small ? S.lg : S.xl, opacity: pressed && !off ? 0.85 : disabled && k !== 'primary' ? 0.45 : 1 },
        disc && !busy ? { justifyContent: 'space-between', paddingLeft: S.xxl, paddingRight: DISC_INSET } : null,
        k === 'ghost' ? { minHeight: 44, paddingHorizontal: S.lg } : null,
        shape[k],
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : disc ? (
        <>
          <Text numberOfLines={1} style={[T.button, { color: fg, flexShrink: 1 }]}>
            {label}
          </Text>
          <View style={{ width: DISC, height: DISC, borderRadius: R.pill, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : 1 }}>
            <Feather name={icon ?? 'arrow-right'} size={20} color={C.onAccent} />
          </View>
        </>
      ) : (
        <>
          {icon ? <Feather name={icon} size={small ? 16 : 18} color={fg} /> : null}
          <Text style={k === 'ghost' ? { fontFamily: F.medium, fontSize: 14, color: fg } : [T.button, small && { fontSize: 15 }, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/**
 * A quiet action set in the text (Etapa's TextLink): DM Sans semibold at 14
 * in ink, with an arrow when it takes the member somewhere; a 44pt target.
 * `muted` for an action that undoes something. Never in the accent.
 */
export function TextLink({ label, onPress, arrow = true, icon, tone = 'text', align = 'start', accessibilityLabel }: { label: string; onPress: () => void; arrow?: boolean; icon?: IconName; tone?: 'text' | 'muted'; align?: 'start' | 'center'; accessibilityLabel?: string }) {
  const color = tone === 'muted' ? C.inkMid : C.ink;
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={accessibilityLabel ?? label} hitSlop={{ left: S.sm, right: S.sm }} style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: S.sm, alignSelf: align === 'center' ? 'center' : 'flex-start', opacity: pressed ? 0.6 : 1 })}>
      {icon ? <Feather name={icon} size={16} color={color} /> : null}
      <Text style={{ fontFamily: F.semibold, fontSize: 14, color }}>{label}</Text>
      {arrow && !icon ? <Feather name="arrow-right" size={16} color={color} /> : null}
    </Pressable>
  );
}

/**
 * A round icon button. `line` (the default): Etapa's IconCTA, a 52pt circle
 * with a hairline, for a row of them (a player's controls). `surface`: a 44pt
 * white disc, Etapa's header button (Back). `glass`: a white disc over a
 * photo. `ink`: filled.
 */
export function IconButton({ icon, label, onPress, tone = 'line', size }: { icon: IconName; label: string; onPress: () => void; tone?: 'line' | 'surface' | 'ink' | 'glass' | 'clear'; size?: number }) {
  const d = size ?? (tone === 'line' ? 52 : 44);
  const bg = { line: 'transparent', surface: C.surface, ink: C.ink, glass: 'rgba(255,255,255,0.94)', clear: 'transparent' }[tone];
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({ width: d, height: d, borderRadius: R.pill, backgroundColor: bg, borderWidth: tone === 'line' ? 1 : 0, borderColor: C.line, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      <Feather name={icon} size={tone === 'line' ? 22 : 20} color={tone === 'ink' ? C.onInk : C.ink} />
    </Pressable>
  );
}

/** The style a typed field takes: white on the canvas, a hairline that turns ink on focus, 12pt corners, 52pt tall. */
export const fieldStyle = (focus = false): TextStyle => ({ fontFamily: F.medium, fontSize: 16, color: C.ink, backgroundColor: C.surface, borderWidth: 1, borderColor: focus ? C.ink : C.line, borderRadius: R.md, paddingHorizontal: S.lg, minHeight: 52, paddingVertical: S.md });

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  const [focus, setFocus] = React.useState(false);
  return (
    <View style={{ gap: S.sm }}>
      <Label style={{ color: C.ink }}>{label}</Label>
      <TextInput
        placeholderTextColor={C.inkFaint}
        accessibilityLabel={label}
        {...props}
        onFocus={(e) => (setFocus(true), props.onFocus?.(e))}
        onBlur={(e) => (setFocus(false), props.onBlur?.(e))}
        style={[fieldStyle(focus), props.keyboardType === 'number-pad' && { fontFamily: F.display, ...tabular }, props.multiline && { minHeight: 128, textAlignVertical: 'top' }, style]}
      />
    </View>
  );
}

/**
 * Etapa's Card: white on the canvas at 22pt corners, borderless, no shadow:
 * the step in tone is its edge. Padded 20pt by default; `flush` for rows,
 * which carry their own padding. A list is rows on one card, never a stack of
 * cards, and never a card in a card.
 */
export function Card({ children, onPress, style, label, flush }: { children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; label?: string; flush?: boolean }) {
  const base: StyleProp<ViewStyle> = [{ backgroundColor: C.surface, borderRadius: R.xxl, overflow: 'hidden' }, flush ? null : { padding: S.xl, gap: S.sm }, style];
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [base, pressed && { opacity: 0.85 }]}>
      {children}
    </Pressable>
  ) : (
    <View style={base}>{children}</View>
  );
}

/** Etapa's RowDivider: a hairline inset 16pt each side. */
export function RowDivider() {
  return <View style={{ height: 1, backgroundColor: C.line, marginHorizontal: S.lg }} />;
}

/** Rows on one card, a hairline between each. Nulls and falses are skipped. */
export function Rows({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return (
    <Card flush style={style}>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <RowDivider /> : null}
          {child}
        </React.Fragment>
      ))}
    </Card>
  );
}

/** An icon in a round well, Etapa's Row's: raised, the icon in ink (`accent` for what's live). */
export function IconWell({ icon, size = 32, tone = 'raised' }: { icon: IconName; size?: number; tone?: 'raised' | 'accent' }) {
  return (
    <View style={{ width: size, height: size, borderRadius: R.pill, backgroundColor: tone === 'accent' ? alpha(C.accent, 0.12) : C.raised, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name={icon} size={Math.round(size * 0.5)} color={tone === 'accent' ? C.accent : C.ink} />
    </View>
  );
}

/**
 * Etapa's Row, inside `Rows`: an icon well or a square photo (`thumb`), a
 * title (DM Sans 500 at 15, or Space Grotesk where it names a thing:
 * `strong`), a second line in the faint tier, and a chevron or something of
 * its own at the right. 16pt padding; a screen reader hears the line with the
 * title.
 */
export function Row({ icon, thumb, title, line, onPress, right, chevron = true, strong, lines = 2, role = 'button', label, children, selected, done }: { icon?: IconName; thumb?: React.ReactNode; title: string; line?: string; onPress?: () => void; right?: React.ReactNode; chevron?: boolean | IconName; strong?: boolean; lines?: number; role?: 'button' | 'link' | 'radio' | 'checkbox'; label?: string; children?: React.ReactNode; selected?: boolean; /** Struck through and quieter: a step that's done. */ done?: boolean }) {
  const body = (
    <>
      {thumb ?? (icon ? <IconWell icon={icon} /> : null)}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <Text style={[strong ? T.title : T.lead, done && { color: C.inkMid, textDecorationLine: 'line-through' }]} numberOfLines={2}>
          {title}
        </Text>
        {line ? (
          <Text style={T.small} numberOfLines={lines}>
            {line}
          </Text>
        ) : null}
        {children}
      </View>
      {right !== undefined ? right : onPress && chevron ? <Feather name={chevron === true ? 'chevron-right' : chevron} size={18} color={C.inkFaint} /> : null}
    </>
  );
  const style: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, minHeight: 56 };
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityLabel={label ?? (line ? `${title}, ${line}` : title)}
      accessibilityState={role === 'radio' || role === 'checkbox' ? { checked: !!selected } : undefined}
      style={({ pressed }) => [style, pressed && { backgroundColor: C.raised }]}>
      {body}
    </Pressable>
  );
}

/** A square photo for the head of a row: 56pt at 12pt corners, ticked when `done`. `letterboxed` for a video still (src/lib/stills.ts). */
export function Thumb({ uri, icon = 'image', size = 56, letterboxed, done }: { uri?: string; icon?: IconName; size?: number; letterboxed?: boolean; done?: boolean }) {
  return (
    <View style={{ width: size }}>
      <Photo uri={uri} ratio={1} radius={R.md} icon={icon} letterboxed={letterboxed} />
      {done ? (
        <View style={{ position: 'absolute', top: -4, right: -4, width: 22, height: 22, borderRadius: R.pill, backgroundColor: C.ink, borderWidth: 2, borderColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name="check" size={12} color={C.onInk} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * A chip (Etapa's shape): a 36pt pill, 44pt to touch. Unchosen, neutral:
 * white with a hairline and an ink-mid label. Chosen, solid ink with a white
 * semibold label, the same everywhere. The accent never marks a chip: it
 * stays for the primary's disc and what's live now. `numeric` for a number
 * on a scale (Space Grotesk, tabular, 44pt tall).
 */
export function Chip({ label, active, onPress, icon, role = 'radio', grow, accessibilityLabel, numeric }: { label: string; active?: boolean; onPress: () => void; icon?: IconName; role?: 'radio' | 'button'; grow?: boolean; accessibilityLabel?: string; numeric?: boolean }) {
  const fg = active ? C.onInk : C.inkMid;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={role === 'radio' ? { checked: !!active } : { expanded: active }}
      hitSlop={{ top: 4, bottom: 4 }}
      style={({ pressed }) => [{ minHeight: numeric ? 44 : 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: S.md, borderRadius: R.pill, borderWidth: 1, borderColor: active ? C.ink : C.line, backgroundColor: active ? C.ink : C.surface, opacity: pressed ? 0.7 : 1 }, grow ? { flexGrow: 1, flexBasis: 0 } : null]}>
      {icon ? <Feather name={icon} size={14} color={fg} /> : null}
      <Text numberOfLines={1} style={numeric ? { fontFamily: F.display, fontSize: 16, color: active ? C.onInk : C.ink, ...tabular } : { fontFamily: active ? F.semibold : F.medium, fontSize: 13, color: fg }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A note on a card with an icon in its well: a reply, a safety line, small print that matters. No coloured edge. */
export function Note({ icon = 'info', title, children }: { icon?: IconName; title?: string; children: React.ReactNode }) {
  return (
    <View accessibilityRole="summary" style={{ backgroundColor: C.surface, borderRadius: R.xxl, padding: S.lg, flexDirection: 'row', gap: S.md }}>
      <IconWell icon={icon} />
      <View style={{ flex: 1, gap: S.xs, paddingTop: title ? 5 : 6 }}>
        {title ? <Text style={T.title}>{title}</Text> : null}
        {typeof children === 'string' ? <Text style={[T.body, { fontSize: 14, lineHeight: 20 }]}>{children}</Text> : children}
      </View>
    </View>
  );
}

/**
 * A photo with a fixed shape and the track grey under it, so the page lays
 * out before it loads and still reads if it never does (the icon stays).
 * `letterboxed` crops a 4:3 video still to its middle (src/lib/stills.ts).
 * Never blurred: a still whose lettering would fight type is the wrong still.
 */
export function Photo({ uri, ratio = 1, radius = R.md, label, icon = 'image', style, children, letterboxed, iconHigh }: { uri?: string; ratio?: number; radius?: number; label?: string; icon?: IconName; style?: StyleProp<ViewStyle>; children?: React.ReactNode; letterboxed?: boolean; /** The stand-in icon in the top half, clear of a title laid over the foot. */ iconHigh?: boolean }) {
  return (
    <View style={[{ width: '100%', aspectRatio: ratio, borderRadius: radius, overflow: 'hidden', backgroundColor: C.track, alignItems: 'center', justifyContent: 'center' }, style]}>
      <View style={iconHigh ? { position: 'absolute', top: '24%', left: 0, right: 0, alignItems: 'center' } : undefined}>
        <Feather name={icon} size={22} color={C.inkFaint} accessibilityElementsHidden importantForAccessibility="no" />
      </View>
      {uri ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          accessible={!!label}
          accessibilityLabel={label}
          accessibilityIgnoresInvertColors
          style={letterboxed ? letterboxCrop(ratio) : { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        />
      ) : null}
      {children}
    </View>
  );
}

export function ErrorText({ text }: { text?: string | null }) {
  return text ? (
    <View style={{ flexDirection: 'row', gap: S.sm, alignItems: 'flex-start' }} accessibilityLiveRegion="polite">
      <Feather name="alert-circle" size={16} color={C.danger} style={{ marginTop: 2 }} />
      <Text style={[T.small, { color: C.danger, flex: 1 }]}>{text}</Text>
    </View>
  ) : null;
}

/** An empty state, or a card with nothing to picture: an icon in its well, a heading, a line and one action. */
export function Empty({ icon, title, line, action }: { icon: IconName; title: string; line?: string; action?: React.ReactNode }) {
  return (
    <Card style={{ gap: S.md, alignItems: 'flex-start' }}>
      <IconWell icon={icon} size={40} />
      <View style={{ gap: S.xs }}>
        <Text accessibilityRole="header" style={T.heading}>
          {title}
        </Text>
        {line ? <Body>{line}</Body> : null}
      </View>
      {action ? <View style={{ alignSelf: 'stretch' }}>{action}</View> : null}
    </Card>
  );
}
