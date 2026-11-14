import { router } from 'expo-router';

import { AText, Badge, DataTable, Empty, PageHeader, Panel, Section, relative } from '@/components/admin';
import { activity, needsYou } from '@/lib/activity';
import { isGame } from '@/lib/brand';
import { isPro } from '@/lib/types';
import { useStore } from '@/lib/store';

/** People: what needs the owner on top, then everyone with an account. */
export default function People() {
  const { db } = useStore();
  const waiting = needsYou(db);
  const feed = activity(db);
  const members = db.users.filter((u) => u.role === 'member');
  const lastActive = (id: string) => feed.find((i) => i.memberId === id)?.at;
  const name = (id: string) => db.users.find((u) => u.id === id)?.name ?? 'Someone';

  return (
    <>
      <PageHeader title="People" subtitle="Everyone with an account, with what needs you on top." />
      <Section title="Needs you">
        {waiting.length === 0 ? (
          <Empty text="Nothing waiting on you." />
        ) : (
          waiting.map((i) => (
            <Panel key={i.id} onPress={() => router.push(i.href as any)}>
              <Badge label="Needs a reply" tone="highlight" />
              <AText>
                {name(i.memberId)}: {i.title}
              </AText>
            </Panel>
          ))
        )}
      </Section>
      <Section title={`Everyone (${members.length})`}>
        <DataTable
          data={members}
          search={(u) => `${u.name} ${u.email ?? ''}`}
          onRowPress={(u) => router.push(`/admin/people/${u.id}` as any)}
          emptyText="No one has signed up yet."
          columns={[
            { key: 'name', label: 'Name', flex: 2, text: (u) => u.name },
            { key: 'email', label: 'Email', flex: 2, text: (u) => u.email ?? '' },
            { key: 'plan', label: 'Plan', text: (u) => (isPro(u) ? 'Pro' : 'Free') },
            { key: 'entries', label: 'Entries', text: (u) => String(db.entries.filter((e) => e.memberId === u.id).length) },
            ...(isGame() ? [{ key: 'games', label: 'Games', text: (u: (typeof members)[number]) => String(db.scores.filter((x) => x.memberId === u.id).length) }] : []),
            { key: 'active', label: 'Last active', text: (u) => relative(lastActive(u.id)) },
          ]}
        />
      </Section>
    </>
  );
}
