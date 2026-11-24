/**
 * The owner's dashboard kit: a sidebar on a laptop that becomes a tab row on
 * a phone, a DataTable that turns into cards below 768px, Badges, and pages
 * kept simple on purpose (AGENTS.md).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { A, sans } from '@/lib/theme';

type TP = { children: React.ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };
const t = (base: TextStyle) =>
  function T({ children, style, numberOfLines }: TP) {
    return (
      <Text numberOfLines={numberOfLines} style={[{ fontFamily: sans, color: A.text }, base, style]}>
        {children}
      </Text>
    );
  };
export const AH1 = t({ fontSize: 28, lineHeight: 34, fontWeight: '700' });
export const AH2 = t({ fontSize: 15, fontWeight: '600' });
export const AText = t({ fontSize: 14, lineHeight: 20, color: A.textMid });
export const AMuted = t({ fontSize: 12, lineHeight: 17, color: A.textFaint });

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24 }}>
      <View style={{ flexShrink: 1, gap: 6, minWidth: 220 }}>
        <AH1>{title}</AH1>
        {subtitle ? <AText style={{ maxWidth: 640 }}>{subtitle}</AText> : null}
      </View>
      {right}
    </View>
  );
}

export function Panel({ children, style, onPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const base: StyleProp<ViewStyle> = [{ backgroundColor: A.surface, borderColor: A.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 8 }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ hovered, pressed }: any) => [base, (hovered || pressed) && { backgroundColor: A.surfaceLight }]}>
      {children}
    </Pressable>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 12, marginTop: 28 }}>
      <AH2>{title}</AH2>
      {children}
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'highlight' | 'good' }) {
  const color = tone === 'highlight' ? A.highlight : tone === 'good' ? A.good : A.textMid;
  return (
    <View style={{ alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1, borderColor: color }}>
      <Text style={{ fontFamily: sans, fontSize: 12, fontWeight: '500', color }}>{label}</Text>
    </View>
  );
}

export function AButton({ label, onPress, kind = 'primary' }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' }) {
  const primary = kind === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ hovered }: any) => [
        { minHeight: 40, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
        primary ? { backgroundColor: A.primary } : { borderWidth: 1, borderColor: A.border },
        hovered && { opacity: 0.9 },
      ]}>
      <Text style={{ fontFamily: sans, fontSize: 14, fontWeight: '600', color: primary ? A.onPrimary : A.text }}>{label}</Text>
    </Pressable>
  );
}

export function AInput({ label, style, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 6 }}>
      <AMuted>{label}</AMuted>
      <TextInput
        placeholderTextColor={A.textFaint}
        accessibilityLabel={label}
        {...props}
        style={[{ fontFamily: sans, fontSize: 14, color: A.text, backgroundColor: A.bg, borderWidth: 1, borderColor: A.border, borderRadius: 8, padding: 10, minHeight: 40 }, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, style]}
      />
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <Panel style={{ alignItems: 'center', padding: 32 }}>
      <AMuted>{text}</AMuted>
    </Panel>
  );
}

export function Pills<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ minHeight: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: on ? A.primarySoft : 'transparent', borderWidth: 1, borderColor: on ? A.primary : A.border }}>
            <Text style={{ fontFamily: sans, fontSize: 13, color: on ? A.primary : A.textMid }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface Column<T> {
  key: string;
  label: string;
  flex?: number;
  text: (row: T) => string;
}

/** A table on a laptop; a card per row on a phone. */
/** `lead` draws something before the first column (a person's avatar). */
export function DataTable<T extends { id: string }>({ columns, data, onRowPress, emptyText = 'Nothing here yet.', search, lead }: { columns: Column<T>[]; data: T[]; onRowPress?: (row: T) => void; emptyText?: string; search?: (row: T) => string; lead?: (row: T) => React.ReactNode }) {
  const desktop = useWindowDimensions().width >= 768;
  const [q, setQ] = useState('');
  const rows = search && q.trim() ? data.filter((r) => search(r).toLowerCase().includes(q.trim().toLowerCase())) : data;
  return (
    <View style={{ gap: 12 }}>
      {search ? <AInput label="Search" value={q} onChangeText={setQ} placeholder="Name or email" /> : null}
      {rows.length === 0 ? (
        <Empty text={q ? 'No matches.' : emptyText} />
      ) : desktop ? (
        <View style={{ borderWidth: 1, borderColor: A.border, borderRadius: 14, overflow: 'hidden', backgroundColor: A.surface }}>
          <View style={{ flexDirection: 'row', backgroundColor: A.surfaceLight }}>
            {columns.map((c) => (
              <View key={c.key} style={{ flex: c.flex ?? 1, padding: 12 }}>
                <AMuted>{c.label}</AMuted>
              </View>
            ))}
          </View>
          {rows.map((r) => (
            <Pressable key={r.id} onPress={onRowPress && (() => onRowPress(r))} style={({ hovered }: any) => [{ flexDirection: 'row', borderTopWidth: 1, borderColor: A.border, minHeight: 52, alignItems: 'center' }, hovered && onRowPress && { backgroundColor: A.surfaceLight }]}>
              {columns.map((c, i) => (
                <View key={c.key} style={{ flex: c.flex ?? 1, padding: 12, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {i === 0 && lead ? lead(r) : null}
                  <AText numberOfLines={2} style={{ flexShrink: 1 }}>
                    {c.text(r)}
                  </AText>
                </View>
              ))}
            </Pressable>
          ))}
        </View>
      ) : (
        rows.map((r) => (
          <Panel key={r.id} onPress={onRowPress && (() => onRowPress(r))}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {lead ? lead(r) : null}
              <AH2>{columns[0].text(r)}</AH2>
            </View>
            {columns.slice(1).map((c) => (
              <View key={c.key} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <AMuted>{c.label}</AMuted>
                <AText style={{ flexShrink: 1, textAlign: 'right' }}>{c.text(r)}</AText>
              </View>
            ))}
          </Panel>
        ))
      )}
    </View>
  );
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];
export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  /** Other paths that belong to this page (a member's page belongs to People). */
  match?: string[];
}

export function AdminShell({ items, user, onSignOut, children }: { items: NavItem[]; user: { name: string; email?: string }; onSignOut: () => void; children: React.ReactNode }) {
  const desktop = useWindowDimensions().width >= 1024;
  const pathname = usePathname();
  const active = (it: NavItem) => pathname === it.href || (it.match ?? []).some((p) => pathname.startsWith(p));
  const content = (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: desktop ? 32 : 16, paddingBottom: 64 }} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: 1080, alignSelf: 'center' }}>{children}</View>
    </ScrollView>
  );
  const link = (it: NavItem, tab: boolean) => {
    const on = active(it);
    return (
      <Pressable
        key={it.href}
        onPress={() => router.push(it.href as any)}
        accessibilityRole={tab ? 'tab' : 'link'}
        accessibilityState={{ selected: on }}
        style={({ hovered }: any) =>
          tab
            ? { flex: 1, minHeight: 46, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderColor: on ? A.primary : 'transparent' }
            : [{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, minHeight: 44, borderRadius: 8 }, on ? { backgroundColor: A.primarySoft } : hovered ? { backgroundColor: A.surfaceLight } : null]
        }>
        {!tab && <Ionicons name={it.icon} size={18} color={on ? A.primary : A.textMid} />}
        <Text style={{ flex: tab ? undefined : 1, fontFamily: sans, fontSize: 14, fontWeight: on ? '600' : '400', color: on ? (tab ? A.text : A.primary) : A.textMid }}>{it.label}</Text>
        {it.badge ? <Text style={{ fontFamily: sans, fontSize: 12, fontWeight: '700', color: A.onPrimary, backgroundColor: A.highlight, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>{it.badge}</Text> : null}
      </Pressable>
    );
  };
  if (!desktop)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: A.bg }}>
        <View style={{ backgroundColor: A.surface, borderBottomWidth: 1, borderColor: A.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 10 }}>
            <AH2>Dashboard</AH2>
            <Pressable onPress={onSignOut} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
              <AMuted>Sign out</AMuted>
            </Pressable>
          </View>
          <View accessibilityRole="tablist" style={{ flexDirection: 'row', paddingHorizontal: 8 }}>
            {items.map((it) => link(it, true))}
          </View>
        </View>
        {content}
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: A.bg, flexDirection: 'row' }}>
      <View style={{ width: 232, backgroundColor: A.sidebar, borderRightWidth: 1, borderColor: A.border, padding: 12 }}>
        <AH2 style={{ padding: 12, paddingBottom: 20 }}>Dashboard</AH2>
        <View style={{ gap: 2 }}>{items.map((it) => link(it, false))}</View>
        <View style={{ flex: 1 }} />
        <View style={{ borderTopWidth: 1, borderColor: A.border, paddingTop: 12, gap: 4, paddingHorizontal: 12 }}>
          <AText numberOfLines={1}>{user.name}</AText>
          {user.email ? <AMuted numberOfLines={1}>{user.email}</AMuted> : null}
          <Pressable onPress={onSignOut} accessibilityRole="button" style={{ minHeight: 40, justifyContent: 'center' }}>
            <AMuted>Sign out</AMuted>
          </Pressable>
        </View>
      </View>
      {content}
    </SafeAreaView>
  );
}

/** "3 days ago", for when something happened. */
export function relative(iso?: string | null) {
  if (!iso) return 'Never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
}
