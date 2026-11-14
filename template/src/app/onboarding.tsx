import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Choice } from '@/components/choice';
import { Body, Button, ErrorText, Field, Heading, Small, Title, Screen } from '@/components/ui';
import { APP } from '@/lib/brand';
import { ASSESSMENT, assess, levelById } from '@/lib/progression';
import { useStore } from '@/lib/store';

/** Where you're at: a few questions place a new member on the path, then their goal. Meets people where they are. */
export default function Onboarding() {
  const { ready, me, saveAssessment } = useStore();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!ready) return null;
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
      <View style={{ gap: 8, marginTop: 16 }}>
        <Title>Where are you at?</Title>
        <Body>A few questions, so {APP.name} starts you in the right place.</Body>
      </View>
      {ASSESSMENT.map((q) => (
        <View key={q.id} style={{ gap: 8 }} accessibilityRole="radiogroup">
          <Heading>{q.question}</Heading>
          {q.answers.map((a) => (
            <Choice key={a.label} label={a.label} selected={answers[q.id] === a.label} onPress={() => setAnswers({ ...answers, [q.id]: a.label })} />
          ))}
        </View>
      ))}
      {level && (
        <View style={{ gap: 8 }}>
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
