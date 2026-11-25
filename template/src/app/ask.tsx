import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { PageLoader } from '@/components/logo-loader';
import { BackLink } from '@/components/back';
import { Body, Button, Card, Display, ErrorText, Field, Section, Small, Strong, Screen } from '@/components/ui';
import { APP } from '@/lib/brand';
import { useStore } from '@/lib/store';
import { isPro } from '@/lib/types';

/** The AI assistant (Pro). Every question and answer is stored, and the owner sees them on the dashboard. */
export default function Ask() {
  const { ready, me, db, integrations, ask } = useStore();
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A direct visit waits for the session to load before deciding the person is signed out.
  if (!ready) return <PageLoader />;
  if (!me) return <Redirect href="/" />;
  const chats = db.ai.filter((c) => c.memberId === me.id);

  async function send() {
    if (!question.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await ask(question);
      setQuestion('');
    } catch (e: any) {
      setError(e?.message ?? 'That didn’t work. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen>
      <BackLink />
      <Display>Ask the assistant</Display>
      <Small>Answers come from AI and can be wrong. The {APP.ownerWord} can see your questions.</Small>
      {!integrations.ai ? (
        <Body>The assistant isn’t switched on yet.</Body>
      ) : !isPro(me) ? (
        <>
          <Body>The assistant is part of Pro.</Body>
          <Button label="See Pro" onPress={() => router.push('/pro')} />
        </>
      ) : (
        <Card>
          <Field label="Your question" value={question} onChangeText={setQuestion} multiline />
          <ErrorText text={error} />
          <Button label="Ask" onPress={send} busy={busy} />
        </Card>
      )}
      {chats.length ? (
        <Section title="Your questions">
          {chats.map((c) => (
            <Card key={c.id}>
              <Strong>{c.question}</Strong>
              <Body>{c.answer}</Body>
            </Card>
          ))}
        </Section>
      ) : null}
    </Screen>
  );
}
