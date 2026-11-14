/**
 * The member app's kit: Screen, Title, Body, Button, Field, Card. Touch-first:
 * 44pt targets, safe areas, nothing that needs hover.
 */
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C, MAX_W, R, S, sans } from '@/lib/theme';

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const inner = <View style={{ width: '100%', maxWidth: MAX_W, alignSelf: 'center', padding: S.lg, gap: S.lg }}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 64 }} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        inner
      )}
    </SafeAreaView>
  );
}

const text = (base: TextStyle) =>
  function T({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
    return <Text style={[{ fontFamily: sans, color: C.ink }, base, style]}>{children}</Text>;
  };
export const Title = text({ fontSize: 28, lineHeight: 34, fontWeight: '700' });
export const Heading = text({ fontSize: 18, lineHeight: 24, fontWeight: '600' });
export const Body = text({ fontSize: 16, lineHeight: 24, color: C.inkMid });
export const Small = text({ fontSize: 13, lineHeight: 18, color: C.inkFaint });

export function Button({ label, onPress, kind = 'primary', busy, disabled }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; busy?: boolean; disabled?: boolean }) {
  const primary = kind === 'primary';
  const off = disabled || busy;
  return (
    <Pressable
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      style={({ pressed }) => [
        { minHeight: 48, borderRadius: R.pill, paddingHorizontal: S.xl, alignItems: 'center', justifyContent: 'center', opacity: off ? 0.5 : pressed ? 0.85 : 1 },
        primary ? { backgroundColor: C.accent } : { borderWidth: 1, borderColor: kind === 'danger' ? C.danger : C.border, backgroundColor: C.surface },
      ]}>
      {busy ? (
        <ActivityIndicator color={primary ? C.onAccent : C.accent} />
      ) : (
        <Text style={{ fontFamily: sans, fontSize: 16, fontWeight: '600', color: primary ? C.onAccent : kind === 'danger' ? C.danger : C.ink }}>{label}</Text>
      )}
    </Pressable>
  );
}

export function Field({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: S.xs }}>
      <Small style={{ color: C.inkMid, fontWeight: '500' }}>{label}</Small>
      <TextInput
        placeholderTextColor={C.inkFaint}
        accessibilityLabel={label}
        {...props}
        style={[{ fontFamily: sans, fontSize: 16, color: C.ink, backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.md, paddingHorizontal: S.md, minHeight: 48, paddingVertical: S.sm }, props.multiline && { minHeight: 120, textAlignVertical: 'top' }, style]}
      />
    </View>
  );
}

export function Card({ children, onPress, style }: { children: React.ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const base: StyleProp<ViewStyle> = [{ backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: R.lg, padding: S.lg, gap: S.sm }, style];
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [base, pressed && { opacity: 0.9 }]}>
      {children}
    </Pressable>
  ) : (
    <View style={base}>{children}</View>
  );
}

export function ErrorText({ text }: { text?: string | null }) {
  return text ? <Text style={{ fontFamily: sans, fontSize: 14, color: C.danger }}>{text}</Text> : null;
}
