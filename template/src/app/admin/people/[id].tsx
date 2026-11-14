import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AButton, AInput, AMuted, AText, AH2, Badge, Empty, PageHeader, Panel, Section, relative } from '@/components/admin';
import { useStore } from '@/lib/store';
import { isPro, type Entry } from '@/lib/types';

/** One member: what they wrote (reply to each), and the owner's private notes. */
export default function Member() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, saveOwnerNotes, setPlan } = useStore();
  const [planError, setPlanError] = useState<string | null>(null);
  const user = db.users.find((u) => u.id === id);
  const [notes, setNotes] = useState(user?.ownerNotes ?? '');
  if (!user) return <Empty text="No one with that link." />;
  const entries = db.entries.filter((e) => e.memberId === user.id);
  const scores = db.scores.filter((x) => x.memberId === user.id);
  const chats = db.ai.filter((x) => x.memberId === user.id);
  const devices = db.devices.filter((x) => x.memberId === user.id);
  const pro = isPro(user);
  const switchPlan = (plan: 'pro' | 'free') => setPlan(user.id, plan).catch((e) => setPlanError(e?.message ?? 'That didn’t work.'));
  return (
    <>
      <PageHeader title={user.name} subtitle={`${user.email ?? ''} · joined ${relative(user.createdAt)}`} />
      <Section title="Plan">
        <Panel>
          <AText>
            {pro ? (user.planSource === 'stripe' ? 'Pro, paid through Stripe' : 'Pro, given by you') : 'Free'}
            {pro && user.planUntil ? ` · renews or ends ${new Date(user.planUntil).toLocaleDateString()}` : ''}
          </AText>
          {user.stripeExtraSubscription ? <Badge label={`Second paid subscription ${user.stripeExtraSubscription}: refund or cancel in Stripe`} tone="highlight" /> : null}
          {user.planSource !== 'stripe' && (
            <View style={{ alignSelf: 'flex-start' }}>
              <AButton label={pro ? 'Take Pro back' : 'Give Pro'} kind={pro ? 'secondary' : 'primary'} onPress={() => switchPlan(pro ? 'free' : 'pro')} />
            </View>
          )}
          {planError ? <AMuted>{planError}</AMuted> : null}
        </Panel>
      </Section>
      <Section title={`Entries (${entries.length})`}>
        {entries.length === 0 ? <Empty text="Nothing written yet." /> : entries.map((e) => <EntryPanel key={e.id} entry={e} />)}
      </Section>
      {scores.length > 0 && (
        <Section title={`Games (${scores.length})`}>
          {scores.map((x) => (
            <Panel key={x.id}>
              <AText>
                {x.game}: {x.points} points in {x.seconds}s
              </AText>
              <AMuted>{relative(x.createdAt)}</AMuted>
            </Panel>
          ))}
        </Section>
      )}
      {chats.length > 0 && (
        <Section title={`AI assistant (${chats.length})`}>
          {chats.map((c) => (
            <Panel key={c.id}>
              <AMuted>{relative(c.createdAt)}</AMuted>
              <AH2>{c.question}</AH2>
              <AText>{c.answer}</AText>
            </Panel>
          ))}
        </Section>
      )}
      {devices.length > 0 && (
        <Section title="Devices">
          <AText>{devices.map((d) => `${d.platform} (since ${new Date(d.createdAt).toLocaleDateString()})`).join(', ')}: push notifications on</AText>
        </Section>
      )}
      <Section title="Private notes">
        <AMuted>Only owners see these. They never reach the member.</AMuted>
        <AInput label="Notes" value={notes} onChangeText={setNotes} multiline />
        <View style={{ alignSelf: 'flex-start' }}>
          <AButton label="Save notes" onPress={() => saveOwnerNotes(user.id, notes)} />
        </View>
      </Section>
    </>
  );
}

function EntryPanel({ entry }: { entry: Entry }) {
  const { reply } = useStore();
  const [text, setText] = useState(entry.reply ?? '');
  return (
    <Panel>
      <AMuted>{relative(entry.createdAt)}</AMuted>
      <AH2>{entry.title}</AH2>
      {entry.body ? <AText>{entry.body}</AText> : null}
      {entry.reply ? <Badge label="Replied" tone="good" /> : <Badge label="Needs a reply" tone="highlight" />}
      <AInput label="Your reply" value={text} onChangeText={setText} multiline />
      <View style={{ alignSelf: 'flex-start' }}>
        <AButton label={entry.reply ? 'Update reply' : 'Send reply'} onPress={() => reply(entry.id, text)} />
      </View>
    </Panel>
  );
}
