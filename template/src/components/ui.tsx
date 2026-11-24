/**
 * The member app's kit (DESIGN.md): Screen, the type (Display, Title, Heading,
 * Body, Small, Label), Section, the pill Button, IconButton, Field, Card,
 * Note, Photo, LinkRow and ErrorText. A white ground, heavy ink type in the
 * faces from src/lib/fonts.ts, ink pills, white cards with a soft shadow and
 * no border. Touch-first: 44pt targets, safe areas, nothing that needs hover.
 * The board's pieces (photo cards, stat tiles, chips) are in board.tsx.
 */
import { Feather } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { APP } from '@/lib/brand';
import { useStore } from '@/lib/store';
import { showsTabBar } from '@/lib/tabs';
import { C, F, MAX_W, R, S, T, TAB_BAR_ROOM, shadow } from '@/lib/theme';

export type IconName = React.ComponentProps<typeof Feather>['name'];

/** Room at the foot of a screen: clear of the floating tab bar where it shows, else a comfortable margin. */
export function useFootRoom(extra = 0) {
  const pathname = usePathname();
  const { me } = useStore();
  const insets = useSafeAreaInsets();
  return (showsTabBar(APP.kind, pathname, me?.role === 'member') ? TAB_BAR_ROOM + insets.bottom : 64) + extra;
}

export function Screen({ children, scroll = true, gap = S.lg, top = true }: { children: React.ReactNode; scroll?: boolean; gap?: number; top?: boolean }) {
  const foot = useFootRoom();
  const inner = <View style={{ width: '100%', maxWidth: MAX_W, alignSelf: 'center', paddingHorizontal: S.lg, paddingTop: top ? S.lg : 0, gap }}>{children}</View>;
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
export const Display = text(T.display, 'header');
export const Title = text(T.title, 'header');
export const Heading = text(T.heading, 'header');
export const Body = text(T.body);
export const Strong = text(T.bodyStrong);
export const Small = text(T.small);
/** A field's or a tile's label: sentence case, never uppercase or letter-spaced (DESIGN.md). */
export const Label = text(T.label);

/** A section's heading, with generous room above it, an optional line under, and an optional action beside it. */
export function Section({ title, line, children, action }: { title: string; line?: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <View style={{ marginTop: S.xl, gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: S.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Heading>{title}</Heading>
          {line ? <Small>{line}</Small> : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

type Kind = 'primary' | 'accent' | 'secondary' | 'outline' | 'danger';

/**
 * The pill, 56 tall: `primary` (ink) for the one thing to press, `accent`
 * only for what's live now, `secondary` (white, lifted) or `outline` beside
 * them. `small` is 44 tall, for a row of them.
 */
export function Button({ label, onPress, kind = 'primary', busy, disabled, icon, small }: { label: string; onPress: () => void; kind?: Kind; busy?: boolean; disabled?: boolean; icon?: IconName; small?: boolean }) {
  const off = disabled || busy;
  const fill: Record<Kind, ViewStyle> = {
    primary: { backgroundColor: C.ink },
    accent: { backgroundColor: C.accent },
    secondary: { backgroundColor: C.surface, ...shadow },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.ink },
    danger: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: C.danger },
  };
  const fg = kind === 'primary' ? C.onInk : kind === 'accent' ? C.onAccent : kind === 'danger' ? C.danger : C.ink;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      style={({ pressed }) => [
        { minHeight: small ? 44 : 56, borderRadius: R.pill, paddingHorizontal: small ? S.lg : S.xl, flexDirection: 'row', gap: S.sm, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.45 : pressed ? 0.88 : 1, transform: [{ scale: pressed && !off ? 0.985 : 1 }] },
        fill[kind],
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Feather name={icon} size={18} color={fg} /> : null}
          <Text style={[T.button, small && { fontSize: 15 }, { color: fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

/** A round icon button, 44pt: Back, close, the account. `glass` sits over a photo. */
export function IconButton({ icon, label, onPress, tone = 'panel', size = 44 }: { icon: IconName; label: string; onPress: () => void; tone?: 'panel' | 'ink' | 'clear' | 'glass'; size?: number }) {
  const bg = { panel: C.panel, ink: C.ink, clear: 'transparent', glass: 'rgba(255,255,255,0.92)' }[tone];
  const fg = tone === 'ink' ? C.onInk : C.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => ({ width: size, height: size, borderRadius: R.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      <Feather name={icon} size={Math.round(size * 0.45)} color={fg} />
    </Pressable>
  );
}

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
        style={[
          { fontFamily: F.medium, fontSize: 17, color: C.ink, backgroundColor: C.panel, borderWidth: 1.5, borderColor: focus ? C.ink : C.panel, borderRadius: R.md, paddingHorizontal: S.lg, minHeight: 56, paddingVertical: S.md },
          props.multiline && { minHeight: 128, textAlignVertical: 'top' },
          style,
        ]}
      />
    </View>
  );
}

/** A white card lifted by a soft shadow, no border. */
export function Card({ children, onPress, style, label }: { children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; label?: string }) {
  const base: StyleProp<ViewStyle> = [{ backgroundColor: C.surface, borderRadius: R.lg, padding: S.lg + 4, gap: S.sm }, shadow, style];
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => [base, pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  ) : (
    <View style={base}>{children}</View>
  );
}

/** A grey-panel note with an icon: a reply, a safety line, small print that matters. Never a coloured left border. */
export function Note({ icon = 'info', title, children }: { icon?: IconName; title?: string; children: React.ReactNode }) {
  return (
    <View accessibilityRole="summary" style={{ backgroundColor: C.panel, borderRadius: R.lg, padding: S.lg, flexDirection: 'row', gap: S.md }}>
      <View style={{ width: 32, height: 32, borderRadius: R.pill, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}>
        <Feather name={icon} size={16} color={C.ink} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        {title ? <Text style={[T.bodyStrong, { fontFamily: F.bold }]}>{title}</Text> : null}
        {typeof children === 'string' ? <Text style={[T.small, { color: C.ink, lineHeight: 20 }]}>{children}</Text> : children}
      </View>
    </View>
  );
}

/**
 * A photo with a fixed shape and a grey ground, so the page lays out before
 * it loads and still reads if it never does (the icon stays). `blur` softens
 * a still whose own lettering would fight type laid over it.
 */
export function Photo({ uri, ratio = 1, radius = R.md, label, icon = 'image', style, children, blur }: { uri?: string; ratio?: number; radius?: number; label?: string; icon?: IconName; style?: StyleProp<ViewStyle>; children?: React.ReactNode; blur?: number }) {
  return (
    <View style={[{ width: '100%', aspectRatio: ratio, borderRadius: radius, overflow: 'hidden', backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Feather name={icon} size={22} color={C.inkFaint} accessibilityElementsHidden importantForAccessibility="no" />
      {uri ? (
        <Image
          source={{ uri }}
          resizeMode="cover"
          blurRadius={blur}
          accessible={!!label}
          accessibilityLabel={label}
          accessibilityIgnoresInvertColors
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
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

/** A row to another screen: an icon in a grey circle, a bold title and a grey line, a chevron. 64pt. */
export function LinkRow({ icon, title, line, onPress }: { icon?: IconName; title: string; line?: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link" accessibilityLabel={line ? `${title}. ${line}` : title} style={({ pressed }) => ({ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: S.md, paddingVertical: S.sm, opacity: pressed ? 0.6 : 1 })}>
      {icon ? (
        <View style={{ width: 44, height: 44, borderRadius: R.pill, backgroundColor: C.panel, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={19} color={C.ink} />
        </View>
      ) : null}
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={T.rowTitle}>{title}</Text>
        {line ? <Text style={T.small}>{line}</Text> : null}
      </View>
      <Feather name="chevron-right" size={20} color={C.inkFaint} />
    </Pressable>
  );
}
