import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Body, Button, Card, ErrorText, Field, Heading, Small, Title, Screen } from '@/components/ui';
import { isGame } from '@/lib/brand';
import { confirmAsync } from '@/lib/confirm';
import { GAME_ID, GAME_NAME, bestScore } from '@/lib/game';
import { useStore } from '@/lib/store';
import { isPro } from '@/lib/types';
import { C } from '@/lib/theme';

/**
 * The member's home: write an entry, see what they wrote and the owner's
 * replies. Replace this with the product's real home screen; keep every write
 * going through the store, so the owner's dashboard sees it.
 */
export default function Home() {
  const { ready, me, db, integrations, saveEntry, removeEntry } = useStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A direct visit waits for the session to load before deciding the person is signed out.
  if (!ready) return null;
  if (!me) return <Redirect href="/" />;
  const mine = db.entries.filter((e) => e.memberId === me.id);

  async function add() {
    if (!title.trim()) return setError('Give it a title.');
    setBusy(true);
    setError(null);
    try {
      await saveEntry({ title, body });
      setTitle('');
      setBody('');
    } catch (e: any) {
      setError(e?.message ?? 'That didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title style={{ marginTop: 16 }}>Hi, {me.name}</Title>
      {isGame() && (
        <Card>
          <Heading>{GAME_NAME}</Heading>
          <Body>Your best: {bestScore(db.scores.filter((s) => s.memberId === me.id && s.game === GAME_ID))} points</Body>
          <Button label="Play" onPress={() => router.push('/game')} />
        </Card>
      )}
      {integrations.ai && (
        <Card>
          <Heading>Ask the assistant</Heading>
          <Body>{isPro(me) ? 'Questions answered any time.' : 'Part of Pro.'}</Body>
          <Button label="Ask a question" kind="secondary" onPress={() => router.push('/ask')} />
        </Card>
      )}
      {(integrations.billing || isPro(me)) && (
        <Button label={isPro(me) ? 'You have Pro' : 'See Pro'} kind="secondary" onPress={() => router.push('/pro')} />
      )}
      <Card>
        <Heading>{isGame() ? 'Send feedback' : 'Write something'}</Heading>
        <Field label="Title" value={title} onChangeText={setTitle} />
        <Field label="Details" value={body} onChangeText={setBody} multiline />
        <ErrorText text={error} />
        <Button label="Save" onPress={add} busy={busy} />
      </Card>
      {mine.length === 0 ? <Body>Nothing yet. What you write shows here, with any reply.</Body> : null}
      {mine.map((e) => (
        <Card key={e.id}>
          <Heading>{e.title}</Heading>
          {e.body ? <Body>{e.body}</Body> : null}
          {e.reply ? (
            <View style={{ backgroundColor: C.accentSoft, borderRadius: 12, padding: 12, gap: 4 }}>
              <Small style={{ fontWeight: '600', color: C.accent }}>Reply</Small>
              <Body>{e.reply}</Body>
            </View>
          ) : (
            <Small>No reply yet.</Small>
          )}
          <Button label="Delete" kind="secondary" onPress={async () => (await confirmAsync('Delete this for good?')) && removeEntry(e.id)} />
        </Card>
      ))}
      <Button label="Your account" kind="secondary" onPress={() => router.push('/account')} />
    </Screen>
  );
}
