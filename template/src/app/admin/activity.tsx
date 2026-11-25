import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { AInput, AMuted, ARow, ARows, AText, Badge, Empty, PageHeader, Pills, relative } from '@/components/admin';
import { ACTIVITY_KINDS, activity, type ActivityKind } from '@/lib/activity';
import { useStore } from '@/lib/store';

const WHEN = [
  { id: 'all', label: 'Any time', days: Infinity },
  { id: 'today', label: 'Today', days: 1 },
  { id: 'week', label: 'This week', days: 7 },
  { id: 'month', label: 'This month', days: 30 },
] as const;
type When = (typeof WHEN)[number]['id'];

/** Activity: everything members do and write, newest first, narrowed by kind, by when, by who, or to what needs you. */
export default function Activity() {
  const { db } = useStore();
  const [kind, setKind] = useState<ActivityKind | 'all' | 'needs'>('all');
  const [when, setWhen] = useState<When>('all');
  const [who, setWho] = useState('');
  const all = activity(db);
  const userOf = (id: string) => db.users.find((u) => u.id === id);
  const days = WHEN.find((w) => w.id === when)!.days;
  const q = who.trim().toLowerCase();
  const items = all
    .filter((i) => (kind === 'all' ? true : kind === 'needs' ? i.needsReply : i.kind === kind))
    .filter((i) => Date.now() - new Date(i.at).getTime() <= days * 24 * 3600 * 1000)
    .filter((i) => !q || `${userOf(i.memberId)?.name ?? ''} ${userOf(i.memberId)?.email ?? ''}`.toLowerCase().includes(q));
  const kinds = [{ id: 'all' as const, label: 'Everything' }, { id: 'needs' as const, label: 'Needs you', count: all.filter((i) => i.needsReply).length }, ...ACTIVITY_KINDS.filter((k) => all.some((i) => i.kind === k.id))];
  return (
    <>
      <PageHeader title="Activity" subtitle="Everything members do and write, newest first." />
      <View style={{ gap: 12 }}>
        <Pills value={kind} onChange={setKind} options={kinds} />
        <Pills value={when} onChange={setWhen} options={WHEN.map(({ id, label }) => ({ id, label }))} />
        <AInput label="Who" value={who} onChangeText={setWho} placeholder="A member’s name or email" />
        <AMuted>
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </AMuted>
      </View>
      <View style={{ marginTop: 12 }}>
        {items.length === 0 ? (
          <Empty text="Nothing here." />
        ) : (
          <ARows>
            {items.slice(0, 300).map((i) => {
              const u = userOf(i.memberId);
              return (
                <ARow key={i.id} lead={<Avatar name={u?.name ?? '?'} photoPath={u?.photoPath} size={32} dark />} title={i.title} line={`${u?.name ?? 'Someone'} · ${relative(i.at)}`} right={i.needsReply ? <Badge label="Needs you" tone="highlight" /> : null} onPress={() => router.push(i.href as any)}>
                  {i.text ? <AText numberOfLines={3}>{i.text}</AText> : null}
                </ARow>
              );
            })}
          </ARows>
        )}
      </View>
    </>
  );
}
