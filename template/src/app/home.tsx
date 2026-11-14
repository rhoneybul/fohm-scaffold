import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { MediaAttach, MediaPlayer } from '@/components/media';
import { Body, Button, Card, ErrorText, Field, Heading, Small, Title, Screen } from '@/components/ui';
import { APP, isCoaching, isGame } from '@/lib/brand';
import { confirmAsync } from '@/lib/confirm';
import { GAME_ID, GAME_NAME, bestScore } from '@/lib/game';
import { levelById, pathFor } from '@/lib/progression';
import type { PickedMedia } from '@/lib/media';
import { useStore } from '@/lib/store';
import { isPro } from '@/lib/types';
import { C } from '@/lib/theme';

/**
 * The member's home. In a coaching app: the one thing to do now (the next
 * skills on their path), check in, and send the coach a clip or a question.
 * Replace and extend it; keep every write going through the store, so the
 * owner's dashboard sees it.
 */
export default function Home() {
  const { ready, me, db, integrations, saveEntry, removeEntry } = useStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A direct visit waits for the session to load before deciding the person is signed out.
  if (!ready) return null;
  if (!me) return <Redirect href="/" />;
  if (isCoaching() && !me.level) return <Redirect href="/onboarding" />;
  const mine = db.entries.filter((e) => e.memberId === me.id);
  const path = pathFor(me.level, new Set(db.progress.filter((p) => p.memberId === me.id).map((p) => p.skillId)));
  const checkins = db.checkins.filter((c) => c.memberId === me.id);

  async function add() {
    if (!title.trim()) return setError('Give it a title.');
    if (link.trim() && !/^https?:\/\/\S+$/.test(link.trim())) return setError('The link should start with https://');
    setBusy(true);
    setError(null);
    try {
      await saveEntry({ title, body, link, media });
      setTitle('');
      setBody('');
      setLink('');
      setMedia(null);
    } catch (e: any) {
      setError(e?.message ?? 'That didn’t save. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title style={{ marginTop: 16 }}>Hi, {me.name}</Title>
      {isCoaching() && (
        <Card>
          <Small>{path.current ? `${levelById(path.current.id)?.title} · ${path.finished} of ${path.total} skills` : 'Every skill done'}</Small>
          <Heading>{path.next.length ? 'Next up' : 'You’ve finished the path'}</Heading>
          {path.next.map((s) => (
            <Body key={s.id}>- {s.title}</Body>
          ))}
          {me.goal ? <Small>Your goal: {me.goal}</Small> : null}
          <Button label="Check in" onPress={() => router.push('/checkin')} />
          <Button label="Your path" kind="secondary" onPress={() => router.push('/path')} />
          <Small>{checkins.length ? `${checkins.length} check-in${checkins.length === 1 ? '' : 's'} so far` : 'Check in after you practise.'}</Small>
        </Card>
      )}
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
        <Heading>{isCoaching() ? `Ask your ${APP.ownerWord}` : isGame() ? 'Send feedback' : 'Write something'}</Heading>
        {isCoaching() && <Small>A question, or a clip for feedback: attach a video, or paste a link to one.</Small>}
        <Field label="Title" value={title} onChangeText={setTitle} />
        <Field label="Details" value={body} onChangeText={setBody} multiline />
        {isCoaching() && <MediaAttach value={media} onChange={setMedia} />}
        {isCoaching() && <Field label="Or a link to a clip (optional)" value={link} onChangeText={setLink} autoCapitalize="none" keyboardType="url" />}
        <ErrorText text={error} />
        <Button label={media ? 'Send' : 'Save'} onPress={add} busy={busy} />
      </Card>
      {mine.length === 0 ? <Body>Nothing yet. What you write shows here, with any reply.</Body> : null}
      {mine.map((e) => (
        <Card key={e.id}>
          <Heading>{e.title}</Heading>
          {e.body ? <Body>{e.body}</Body> : null}
          {e.mediaPath ? <MediaPlayer path={e.mediaPath} type={e.mediaType} /> : null}
          {e.link ? <Small>{e.link}</Small> : null}
          {e.replyMediaPath ? (
            <View style={{ gap: 4 }}>
              <Small style={{ fontWeight: '600', color: C.accent }}>Video reply</Small>
              <MediaPlayer path={e.replyMediaPath} type={e.replyMediaType} />
            </View>
          ) : null}
          {e.reply ? (
            <View style={{ backgroundColor: C.accentSoft, borderRadius: 12, padding: 12, gap: 4 }}>
              <Small style={{ fontWeight: '600', color: C.accent }}>Reply</Small>
              <Body>{e.reply}</Body>
            </View>
          ) : e.replyMediaPath ? null : (
            <Small>No reply yet.</Small>
          )}
          <Button label="Delete" kind="secondary" onPress={async () => (await confirmAsync('Delete this for good?')) && removeEntry(e.id)} />
        </Card>
      ))}
      {isCoaching() && <Button label="Library" kind="secondary" onPress={() => router.push('/library')} />}
      <Button label="Your account" kind="secondary" onPress={() => router.push('/account')} />
    </Screen>
  );
}
