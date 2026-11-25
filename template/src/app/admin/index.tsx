import { router } from 'expo-router';
import { useState } from 'react';

import { Avatar } from '@/components/avatar';
import { ARow, ARows, Badge, DataTable, Empty, PageHeader, Pills, Section, relative } from '@/components/admin';
import { needsYou, platformLabel } from '@/lib/activity';
import { isCoaching, isGame } from '@/lib/brand';
import { PEOPLE_FILTERS, cameFrom, inFilter, lastActive, type PeopleFilter } from '@/lib/overview';
import { levelById } from '@/lib/progression';
import { isPro, type User } from '@/lib/types';
import { useStore } from '@/lib/store';

/** People: what needs the owner on top, then everyone with an account, each with their photo, when they were last in, on what, their plan and where they came from. */
export default function People() {
  const { me, db } = useStore();
  const [filter, setFilter] = useState<PeopleFilter>('all');
  const coaches = db.users.filter((u) => u.role === 'coach');
  const coachName = (id?: string) => coaches.find((c) => c.id === id)?.name ?? 'No coach';
  const waiting = needsYou(db);
  const members = db.users.filter((u) => u.role === 'member').sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const name = (id: string) => db.users.find((u) => u.id === id)?.name ?? 'Someone';
  const shown = members.filter((u) => inFilter(u, filter, db));
  const avatar = (u: User, size = 32) => <Avatar name={u.name} photoPath={u.photoPath} size={size} dark />;

  return (
    <>
      <PageHeader
        title={me?.role === 'coach' ? 'Your members' : 'People'}
        subtitle={me?.role === 'coach' ? 'The members you coach, with what needs you on top.' : 'Everyone with an account, with what needs you on top.'}
      />
      <Section title="Needs you" line={waiting.length ? 'Oldest first, so nothing waits forever.' : undefined}>
        {waiting.length === 0 ? (
          <Empty text="Nothing waiting on you." />
        ) : (
          <ARows>
            {waiting.map((i) => {
              const who = db.users.find((u) => u.id === i.memberId);
              return <ARow key={i.id} lead={who ? avatar(who) : undefined} title={`${name(i.memberId)}: ${i.title}`} line={relative(i.at)} right={<Badge label="Needs you" tone="highlight" />} onPress={() => router.push(i.href as any)} />;
            })}
          </ARows>
        )}
      </Section>
      {me?.role === 'owner' && coaches.length > 0 && (
        <Section title={`Coaches (${coaches.length})`}>
          <ARows>
            {coaches.map((c) => (
              <ARow key={c.id} lead={avatar(c)} title={c.name} line={`${members.filter((m) => m.coachId === c.id).length} members · ${c.email ?? ''}`} />
            ))}
          </ARows>
        </Section>
      )}
      <Section title={`Everyone (${members.length})`}>
        <Pills value={filter} onChange={setFilter} options={PEOPLE_FILTERS.map((f) => ({ ...f, count: members.filter((u) => inFilter(u, f.id, db)).length }))} />
        <DataTable
          data={shown}
          search={(u) => `${u.name} ${u.email ?? ''} ${u.cameFrom ?? ''}`}
          searchLabel="Name, email or link"
          lead={(u) => avatar(u)}
          onRowPress={(u) => router.push(`/admin/people/${u.id}` as any)}
          emptyText={filter === 'all' ? 'No one has signed up yet.' : 'No one here right now.'}
          columns={[
            { key: 'name', label: 'Name', flex: 2, text: (u) => u.name },
            { key: 'active', label: 'Last active', text: (u) => relative(lastActive(u, db)) },
            { key: 'on', label: 'On', text: (u) => platformLabel(u) || 'Not seen yet' },
            { key: 'plan', label: 'Plan', text: (u) => (isPro(u) ? (u.planSource === 'stripe' ? 'Pro, paying' : 'Pro, given') : 'Free') },
            ...(me?.role === 'owner' && coaches.length ? [{ key: 'coach', label: 'Coach', text: (u: User) => coachName(u.coachId) }] : []),
            ...(isCoaching() ? [{ key: 'level', label: 'Level', text: (u: User) => levelById(u.level)?.title ?? 'Not placed' }] : []),
            ...(isGame() ? [{ key: 'games', label: 'Games', text: (u: User) => String(db.scores.filter((x) => x.memberId === u.id).length) }] : []),
            { key: 'from', label: 'Came from', flex: 1.4, text: (u) => cameFrom(u, name) },
            { key: 'joined', label: 'Joined', text: (u) => relative(u.createdAt) },
          ]}
        />
      </Section>
    </>
  );
}
