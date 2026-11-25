import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { PageLoader } from '@/components/logo-loader';
import { Choice, ChoiceGroup } from '@/components/choice';
import { Body, Button, Display, ErrorText, Field, Heading, Section, Small, Screen } from '@/components/ui';
import { APP } from '@/lib/brand';
import { ASSESSMENT, assess, levelById } from '@/lib/progression';
import { useStore } from '@/lib/store';
import { S } from '@/lib/theme';

/** Where you're at: a few questions place a new member on the path, then their goal. Meets people where they are. */
export default function Onboarding() {
  const { ready, me, saveAssessment } = useStore();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!ready) return <PageLoader />;
  if (!me) return <Redirect href="/" />;
  const complete = ASSESSMENT.every((q) => answers[q.id]);
  const level = complete ? levelById(assess(answers)) : null;

  async function finish() {
    if (!level) return;
    setBusy(true);
    setError(null);
    try {
      await saveAssessment(level.id, answers, goal);
      router.replace('/home');
    } catch (e: any) {
      setError(e?.message ?? 'That didn’t save. Try again.');
      setBusy(false);
    }
  }

  return (
    <Screen>
      <View style={{ gap: S.sm }}>
        <Display>Where are you at?</Display>
        <Body>A few questions, so {APP.name} starts you in the right place.</Body>
      </View>
      {ASSESSMENT.map((q) => (
        <Section key={q.id} title={q.question}>
          <ChoiceGroup label={q.question}>
            {q.answers.map((a) => (
              <Choice key={a.label} label={a.label} selected={answers[q.id] === a.label} onPress={() => setAnswers({ ...answers, [q.id]: a.label })} />
            ))}
          </ChoiceGroup>
        </Section>
      ))}
      {level && (
        <View style={{ gap: S.sm, marginTop: S.md }}>
          <Heading>You’ll start at “{level.title}”</Heading>
          <Small>{level.summary}</Small>
          <Field label="What do you want to get to? (optional)" value={goal} onChangeText={setGoal} placeholder="In a sentence" />
        </View>
      )}
      <ErrorText text={error} />
      <Button label="Start" onPress={finish} busy={busy} disabled={!complete} />
    </Screen>
  );
}
