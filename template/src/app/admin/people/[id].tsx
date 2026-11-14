import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { AButton, AInput, AMuted, AText, AH2, Badge, Empty, PageHeader, Panel, Section, relative } from '@/components/admin';
import { useStore } from '@/lib/store';
import type { Entry } from '@/lib/types';

/** One member: what they wrote (reply to each), and the owner's private notes. */
export default function Member() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { db, saveOwnerNotes } = useStore();
  const user = db.users.find((u) => u.id === id);
  const [notes, setNotes] = useState(user?.ownerNotes ?? '');
  if (!user) return <Empty text="No one with that link." />;
  const entries = db.entries.filter((e) => e.memberId === user.id);
  const scores = db.scores.filter((x) => x.memberId === user.id);
  return (
    <>
      <PageHeader title={user.name} subtitle={`${user.email ?? ''} · joined ${relative(user.createdAt)}`} />
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
