/**
 * The owner's dashboard kit, in the family's language on dark (`A`): Space
 * Grotesk for what's read first and every number, DM Sans for the rest,
 * borderless cards at 22pt corners with rows on them divided by hairlines,
 * pills and chips. A sidebar on a laptop that becomes a tab row on a phone,
 * a DataTable that turns into a card per row below 768px, stat tiles and a
 * week-by-week bar chart (Naz's Overview). Pages kept few on purpose
 * (AGENTS.md).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View, useWindowDimensions, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { A, F, R, S, tabular } from '@/lib/theme';

type TP = { children: React.ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };
const t = (base: TextStyle, header?: boolean) =>
  function T({ children, style, numberOfLines }: TP) {
    return (
      <Text numberOfLines={numberOfLines} accessibilityRole={header ? 'header' : undefined} style={[{ color: A.text }, base, style]}>
        {children}
      </Text>
    );
  };
export const AH1 = t({ fontFamily: F.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.6 }, true);
export const AH2 = t({ fontFamily: F.display, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 });
export const AText = t({ fontFamily: F.regular, fontSize: 14, lineHeight: 20, color: A.textMid });
export const AStrong = t({ fontFamily: F.medium, fontSize: 15, lineHeight: 20 });
export const AMuted = t({ fontFamily: F.regular, fontSize: 13, lineHeight: 18, color: A.textFaint });

/** A card on the dark canvas: borderless, 22pt corners, the step in tone its edge. */
const card: ViewStyle = { backgroundColor: A.surface, borderRadius: R.xxl, overflow: 'hidden' };

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: S.lg, marginBottom: S.xl }}>
      <View style={{ flexShrink: 1, gap: S.sm, minWidth: 220 }}>
        <AH1>{title}</AH1>
        {subtitle ? <AText style={{ maxWidth: 640 }}>{subtitle}</AText> : null}
      </View>
      {right}
    </View>
  );
}

export function Panel({ children, style, onPress, label }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; label?: string }) {
  const base: StyleProp<ViewStyle> = [card, { padding: S.lg, gap: S.sm }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ hovered, pressed }: any) => [base, (hovered || pressed) && { backgroundColor: A.surfaceLight }]}>
      {children}
    </Pressable>
  );
}

/** Rows on one card, a hairline between each (the member app's `Rows`, on dark). Nulls and falses are skipped. */
export function ARows({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return (
    <View style={[card, style]}>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <View style={{ height: 1, backgroundColor: A.border, marginHorizontal: S.lg }} /> : null}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}

/** A row on a card: something at its head (an avatar), a title, a quieter line, and its own right slot or a chevron when it opens. */
export function ARow({ lead, title, line, right, onPress, children }: { lead?: React.ReactNode; title: string; line?: string; right?: React.ReactNode; onPress?: () => void; children?: React.ReactNode }) {
  const body = (
    <>
      {lead}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <AStrong numberOfLines={2}>{title}</AStrong>
        {line ? <AMuted numberOfLines={3}>{line}</AMuted> : null}
        {children}
      </View>
      {right !== undefined ? right : onPress ? <Ionicons name="chevron-forward" size={16} color={A.textFaint} /> : null}
    </>
  );
  const style: ViewStyle = { flexDirection: 'row', alignItems: 'center', gap: S.md, padding: S.lg, minHeight: 56 };
  if (!onPress) return <View style={style}>{body}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={line ? `${title}, ${line}` : title} style={({ hovered, pressed }: any) => [style, (hovered || pressed) && { backgroundColor: A.surfaceLight }]}>
      {body}
    </Pressable>
  );
}

export function Section({ title, line, children, right }: { title: string; line?: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={{ gap: S.md, marginTop: S.xxl + S.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: S.md, flexWrap: 'wrap' }}>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <AH2 style={{ fontSize: 20, lineHeight: 24 }}>{title}</AH2>
          {line ? <AMuted>{line}</AMuted> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

/** A pill: what needs the owner in its one colour, what's fine in green, the rest quiet. */
export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'highlight' | 'good' }) {
  const color = tone === 'highlight' ? A.highlight : tone === 'good' ? A.good : A.textMid;
  return (
    <View style={{ alignSelf: 'flex-start', borderRadius: R.pill, paddingHorizontal: 10, minHeight: 24, justifyContent: 'center', backgroundColor: tone === 'neutral' ? A.surfaceLight : 'transparent', borderWidth: tone === 'neutral' ? 0 : 1, borderColor: color }}>
      <Text style={{ fontFamily: F.semibold, fontSize: 12, color }}>{label}</Text>
    </View>
  );
}

/** A dashboard button: a pill, the action colour for the one thing to do, an outline for the rest, red outline to delete. */
export function AButton({ label, onPress, kind = 'primary', busy }: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'danger'; busy?: boolean }) {
  const primary = kind === 'primary';
  const color = primary ? A.onPrimary : kind === 'danger' ? A.highlight : A.text;
  return (
    <Pressable
      onPress={() => !busy && onPress()}
      accessibilityRole="button"
      accessibilityState={{ busy: !!busy }}
      style={({ hovered, pressed }: any) => [
        { minHeight: 44, paddingHorizontal: S.xl, borderRadius: R.pill, alignItems: 'center', justifyContent: 'center' },
        primary ? { backgroundColor: A.primary } : { borderWidth: 1, borderColor: kind === 'danger' ? A.highlight : A.border },
        (hovered || pressed || busy) && { opacity: 0.85 },
      ]}>
      <Text style={{ fontFamily: F.display, fontSize: 15, color }}>{busy ? 'Working…' : label}</Text>
    </Pressable>
  );
}

export function AInput({ label, style, ...props }: TextInputProps & { label: string }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <AMuted>{label}</AMuted>
      <TextInput
        placeholderTextColor={A.textFaint}
        accessibilityLabel={label}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        {...props}
        style={[{ fontFamily: F.medium, fontSize: 15, color: A.text, backgroundColor: A.bg, borderWidth: 1, borderColor: focus ? A.textMid : A.border, borderRadius: R.md, paddingHorizontal: S.md, paddingVertical: 10, minHeight: 44 }, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, style]}
      />
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return (
    <View style={[card, { alignItems: 'center', padding: S.xxl }]}>
      <AMuted>{text}</AMuted>
    </View>
  );
}

/** Chips: neutral until chosen, then solid in the text colour (the member app's chips, on dark), with an optional count. */
export function Pills<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; count?: number }[]; onChange: (v: T) => void }) {
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} style={({ hovered }: any) => ({ minHeight: 36, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: R.pill, backgroundColor: on ? A.text : hovered ? A.surfaceLight : A.surface })}>
            <Text style={{ fontFamily: F.medium, fontSize: 13, color: on ? A.bg : A.textMid }}>{o.label}</Text>
            {o.count !== undefined ? <Text style={[{ fontFamily: F.display, fontSize: 13, color: on ? A.bg : A.textFaint }, tabular]}>{o.count}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

/** A number the page is about, Naz's StatCard: a label over a Space Grotesk value, a line under it. */
export function AStat({ label, value, line }: { label: string; value: string | number; line?: string }) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${line ? `. ${line}` : ''}`} style={[card, { flexGrow: 1, flexBasis: 150, padding: S.lg, gap: S.xs }]}>
      <AMuted>{label}</AMuted>
      <Text style={[{ fontFamily: F.display, fontSize: 32, lineHeight: 36, letterSpacing: -0.8, color: A.text }, tabular]}>{value}</Text>
      {line ? <AMuted>{line}</AMuted> : null}
    </View>
  );
}

/** Stat tiles in a row that wraps: four across on a laptop, two on a phone (150pt each at least). */
export function AStats({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.md }}>{children}</View>;
}

/** Naz's sign-ups by week: one bar a week, the newest on the right, its count over it. */
export function WeekBars({ weeks }: { weeks: { week: string; count: number }[] }) {
  const most = Math.max(1, ...weeks.map((w) => w.count));
  const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');
  return (
    <View style={[card, { padding: S.lg, gap: S.sm }]}>
      <View accessible accessibilityRole="image" accessibilityLabel={weeks.map((w) => `Week of ${day(w.week)}: ${w.count}`).join('; ')} style={{ height: 148, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        {weeks.map((w) => (
          <View key={w.week} style={{ flex: 1, height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
            <Text style={[{ fontFamily: F.display, fontSize: 12, color: A.textMid }, tabular]}>{w.count || ''}</Text>
            <View style={{ width: '100%', height: `${(w.count / most) * 80}%`, minHeight: w.count ? 4 : 1, borderTopLeftRadius: R.xs, borderTopRightRadius: R.xs, backgroundColor: A.primary, opacity: w.count ? 1 : 0.25 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <AMuted>{day(weeks[0]?.week)}</AMuted>
        <AMuted>This week</AMuted>
      </View>
    </View>
  );
}

/** A funnel: each step's count and share of the first, as a bar across a row. */
export function Funnel({ steps }: { steps: { label: string; count: number; line?: string }[] }) {
  const first = Math.max(1, steps[0]?.count ?? 0);
  return (
    <ARows>
      {steps.map((s) => (
        <View key={s.label} accessible accessibilityLabel={`${s.label}: ${s.count}`} style={{ padding: S.lg, gap: S.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.md }}>
            <View style={{ flexShrink: 1 }}>
              <AStrong>{s.label}</AStrong>
              {s.line ? <AMuted>{s.line}</AMuted> : null}
            </View>
            <Text style={[{ fontFamily: F.display, fontSize: 20, color: A.text }, tabular]}>
              {s.count} <Text style={{ fontFamily: F.regular, fontSize: 13, color: A.textFaint }}>{Math.round((s.count / first) * 100)}%</Text>
            </Text>
          </View>
          <View style={{ height: 6, borderRadius: R.pill, backgroundColor: A.surfaceLight, overflow: 'hidden' }}>
            <View style={{ width: `${(s.count / first) * 100}%`, height: '100%', backgroundColor: A.primary }} />
          </View>
        </View>
      ))}
    </ARows>
  );
}

/** Counts by name (platforms, versions), as rows with a count at the right. */
export function Counts({ rows, empty }: { rows: { label: string; count: number }[]; empty: string }) {
  if (!rows.length) return <Empty text={empty} />;
  return (
    <ARows>
      {rows.map((r) => (
        <ARow key={r.label} title={r.label} right={<Text style={[{ fontFamily: F.display, fontSize: 17, color: A.text }, tabular]}>{r.count}</Text>} />
      ))}
    </ARows>
  );
}

export interface Column<T> {
  key: string;
  label: string;
  flex?: number;
  text: (row: T) => string;
  /** Drawn beside the text in the cell (a person's photo); the text stays for search and screen readers. */
  lead?: (row: T) => React.ReactNode;
}

/**
 * A table on a laptop; a card per row on a phone. `lead` draws something
 * before the first column (a person's avatar), as a column's own `lead` does
 * in its cell.
 */
export function DataTable<T extends { id: string }>({ columns, data, onRowPress, emptyText = 'Nothing here yet.', search, searchLabel = 'Name or email', lead }: { columns: Column<T>[]; data: T[]; onRowPress?: (row: T) => void; emptyText?: string; search?: (row: T) => string; searchLabel?: string; lead?: (row: T) => React.ReactNode }) {
  const desktop = useWindowDimensions().width >= 768;
  const [q, setQ] = useState('');
  const rows = search && q.trim() ? data.filter((r) => search(r).toLowerCase().includes(q.trim().toLowerCase())) : data;
  const leadOf = (c: Column<T>, i: number, r: T) => c.lead?.(r) ?? (i === 0 && lead ? lead(r) : null);
  return (
    <View style={{ gap: S.md }}>
      {search ? <AInput label="Search" value={q} onChangeText={setQ} placeholder={searchLabel} /> : null}
      {rows.length === 0 ? (
        <Empty text={q ? 'No matches.' : emptyText} />
      ) : desktop ? (
        <View style={card}>
          <View style={{ flexDirection: 'row', paddingHorizontal: S.sm }}>
            {columns.map((c) => (
              <View key={c.key} style={{ flex: c.flex ?? 1, paddingHorizontal: S.sm, paddingVertical: S.md }}>
                <AMuted>{c.label}</AMuted>
              </View>
            ))}
          </View>
          {rows.map((r) => (
            <Pressable key={r.id} onPress={onRowPress && (() => onRowPress(r))} accessibilityRole={onRowPress ? 'button' : undefined} style={({ hovered }: any) => [{ flexDirection: 'row', borderTopWidth: 1, borderColor: A.border, minHeight: 56, alignItems: 'center', paddingHorizontal: S.sm }, hovered && onRowPress && { backgroundColor: A.surfaceLight }]}>
              {columns.map((c, i) => (
                <View key={c.key} style={{ flex: c.flex ?? 1, paddingHorizontal: S.sm, paddingVertical: S.md, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  {leadOf(c, i, r)}
                  {i === 0 ? (
                    <AStrong numberOfLines={2} style={{ flexShrink: 1 }}>
                      {c.text(r)}
                    </AStrong>
                  ) : (
                    <AText numberOfLines={2} style={{ flexShrink: 1 }}>
                      {c.text(r)}
                    </AText>
                  )}
                </View>
              ))}
            </Pressable>
          ))}
        </View>
      ) : (
        <ARows>
          {rows.map((r) => (
            <Pressable key={r.id} onPress={onRowPress && (() => onRowPress(r))} accessibilityRole={onRowPress ? 'button' : undefined} style={({ pressed }) => [{ padding: S.lg, gap: 6 }, pressed && { backgroundColor: A.surfaceLight }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {leadOf(columns[0], 0, r)}
                <AH2 style={{ flexShrink: 1 }}>{columns[0].text(r)}</AH2>
              </View>
              {columns.slice(1).map((c) => (
                <View key={c.key} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: S.md }}>
                  <AMuted>{c.label}</AMuted>
                  <AText style={{ flexShrink: 1, textAlign: 'right' }}>{c.text(r) || '-'}</AText>
                </View>
              ))}
            </Pressable>
          ))}
        </ARows>
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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: desktop ? S.xxxl : S.lg, paddingBottom: 64 }} keyboardShouldPersistTaps="handled">
      <View style={{ width: '100%', maxWidth: 1080, alignSelf: 'center' }}>{children}</View>
    </ScrollView>
  );
  const count = (it: NavItem, on: boolean) =>
    it.badge ? (
      <View style={{ minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: R.pill, backgroundColor: A.highlight, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[{ fontFamily: F.display, fontSize: 12, color: A.onPrimary }, tabular]}>{it.badge}</Text>
      </View>
    ) : null;
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
            ? { minHeight: 36, paddingHorizontal: 14, flexDirection: 'row', gap: 6, alignItems: 'center', borderRadius: R.pill, backgroundColor: on ? A.text : 'transparent' }
            : [{ flexDirection: 'row', alignItems: 'center', gap: S.md, paddingHorizontal: S.md, minHeight: 44, borderRadius: R.pill }, on ? { backgroundColor: A.text } : hovered ? { backgroundColor: A.surfaceLight } : null]
        }>
        {!tab && <Ionicons name={it.icon} size={18} color={on ? A.bg : A.textMid} />}
        <Text style={{ flex: tab ? undefined : 1, fontFamily: on ? F.semibold : F.medium, fontSize: 14, color: on ? A.bg : A.textMid }}>{it.label}</Text>
        {count(it, on)}
      </Pressable>
    );
  };
  if (!desktop)
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: A.bg }}>
        <View style={{ backgroundColor: A.sidebar, borderBottomWidth: 1, borderColor: A.border, paddingBottom: S.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: S.lg, paddingTop: S.sm }}>
            <AH2>Dashboard</AH2>
            <Pressable onPress={onSignOut} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
              <AMuted>Sign out</AMuted>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="tablist" contentContainerStyle={{ paddingHorizontal: S.md, gap: S.xs }}>
            {items.map((it) => link(it, true))}
          </ScrollView>
        </View>
        {content}
      </SafeAreaView>
    );
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: A.bg, flexDirection: 'row' }}>
      <View style={{ width: 240, backgroundColor: A.sidebar, borderRightWidth: 1, borderColor: A.border, padding: S.md }}>
        <AH2 style={{ padding: S.md, paddingBottom: S.xl, fontSize: 20 }}>Dashboard</AH2>
        <View style={{ gap: 2 }}>{items.map((it) => link(it, false))}</View>
        <View style={{ flex: 1 }} />
        <View style={{ borderTopWidth: 1, borderColor: A.border, paddingTop: S.md, gap: S.xs, paddingHorizontal: S.md }}>
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
