import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Choice } from '@/components/choice';
import { Button, ErrorText, Field, Heading, Small, Title, Screen } from '@/components/ui';
import { APP } from '@/lib/brand';
import { FEEL, pathFor } from '@/lib/progression';
import { useStore } from '@/lib/store';

/** How did it go? What they worked on, for how long, how it felt (feel, not fake numbers), and a note. */
export default function CheckIn() {
  const { ready, me, db, checkIn } = useStore();
  const [skillId, setSkillId] = useState<string | undefined>();
  const [minutes, setMinutes] = useState('');
  const [feel, setFeel] = useState<1 | 2 | 3 | undefined>();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!ready) return null;
  if (!me) return <Redirect href="/" />;
  const done = new Set(db.progress.filter((p) => p.memberId === me.id).map((p) => p.skillId));
  const { next } = pathFor(me.level, done);

  async function save() {
    const m = minutes.trim() ? Number(minutes) : undefined;
    if (m !== undefined && !(m > 0 && m <= 1440)) return setError('Minutes should be a number, like 20.');
    setBusy(true);
    setError(null);
    try {
      await checkIn({ skillId, minutes: m, feel, note });
      if (router.canGoBack()) router.back();
      else router.replace('/home');
    } catch (e: any) {
      setError(e?.message ?? 'That didn’t save. Try again.');
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title style={{ marginTop: 16 }}>Check in</Title>
      <Small>Your {APP.ownerWord} sees this, and hears straight away if something felt too hard.</Small>
      {next.length > 0 && (
        <View style={{ gap: 8 }} accessibilityRole="radiogroup">
          <Heading>What did you work on?</Heading>
          {next.map((s) => (
            <Choice key={s.id} label={s.title} selected={skillId === s.id} onPress={() => setSkillId(skillId === s.id ? undefined : s.id)} />
          ))}
        </View>
      )}
      <View style={{ gap: 8 }} accessibilityRole="radiogroup">
        <Heading>How did it feel?</Heading>
        {([1, 2, 3] as const).map((f) => (
          <Choice key={f} label={FEEL[f]} selected={feel === f} onPress={() => setFeel(f)} />
        ))}
      </View>
      <Field label="Minutes (optional)" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
      <Field label="Anything to remember? (optional)" value={note} onChangeText={setNote} multiline />
      <ErrorText text={error} />
      <Button label="Save" onPress={save} busy={busy} disabled={!feel} />
      <Button label="Back" kind="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
