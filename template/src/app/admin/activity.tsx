import { router } from 'expo-router';
import { useState } from 'react';

import { AMuted, AText, Badge, Empty, PageHeader, Panel, Pills, relative } from '@/components/admin';
import { ACTIVITY_KINDS, activity, type ActivityKind } from '@/lib/activity';
import { useStore } from '@/lib/store';

/** Activity: everything members do and write, newest first. */
export default function Activity() {
  const { db } = useStore();
  const [kind, setKind] = useState<ActivityKind | 'all'>('all');
  const items = activity(db).filter((i) => kind === 'all' || i.kind === kind);
  const name = (id: string) => db.users.find((u) => u.id === id)?.name ?? 'Someone';
  return (
    <>
      <PageHeader title="Activity" subtitle="Everything members do and write, newest first." />
      <Pills value={kind} onChange={setKind} options={[{ id: 'all', label: 'Everything' }, ...ACTIVITY_KINDS]} />
      <AMuted style={{ marginVertical: 12 }}>{items.length} items</AMuted>
      {items.length === 0 ? <Empty text="Nothing yet." /> : null}
      {items.map((i) => (
        <Panel key={i.id} onPress={() => router.push(i.href as any)} style={{ marginBottom: 8 }}>
          <AMuted>
            {name(i.memberId)} · {relative(i.at)}
          </AMuted>
          <AText style={{ fontWeight: '600' }}>{i.title}</AText>
          {i.text ? <AText numberOfLines={4}>{i.text}</AText> : null}
          {i.needsReply ? <Badge label="Needs a reply" tone="highlight" /> : null}
        </Panel>
      ))}
    </>
  );
}
