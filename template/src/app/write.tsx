import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { BackLink } from '@/components/back';
import { MediaAttach } from '@/components/media';
import { Body, Button, Display, ErrorText, Field, Screen } from '@/components/ui';
import { hasCoach, isCoaching, writeTitle } from '@/lib/brand';
import type { PickedMedia } from '@/lib/media';
import { useStore } from '@/lib/store';

/** Write something: a question or a clip for the owner, a note, or feedback on the game. It shows on Home with any reply, and on the dashboard. */
export default function Write() {
  const { ready, me, saveEntry } = useStore();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!ready) return null;
  if (!me) return <Redirect href="/" />;

  async function add() {
    if (!title.trim()) return setError('Give it a title.');
    if (link.trim() && !/^https?:\/\/\S+$/.test(link.trim())) return setError('The link should start with https://');
    setBusy(true);
    setError(null);
    try {
      await saveEntry({ title, body, link, media });
      router.replace('/home');
    } catch (e: any) {
      setError(e?.message ?? 'That didn’t save. Try again.');
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BackLink />
      <Display>{writeTitle()}</Display>
      {isCoaching() && hasCoach() ? <Body>A question, or a clip for feedback: attach a video, or paste a link to one.</Body> : null}
      <Field label="Title" value={title} onChangeText={setTitle} />
      <Field label="Details" value={body} onChangeText={setBody} multiline />
      {isCoaching() && hasCoach() ? <MediaAttach value={media} onChange={setMedia} /> : null}
      {isCoaching() && hasCoach() ? <Field label="Or a link to a clip (optional)" value={link} onChangeText={setLink} autoCapitalize="none" keyboardType="url" /> : null}
      <ErrorText text={error} />
      <Button label={media ? 'Send' : 'Save'} onPress={add} busy={busy} />
    </Screen>
  );
}
