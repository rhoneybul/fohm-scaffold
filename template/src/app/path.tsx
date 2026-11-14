import { Redirect, router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Body, Button, Card, Heading, Small, Title, Screen } from '@/components/ui';
import { APP } from '@/lib/brand';
import { LEVELS, pathFor } from '@/lib/progression';
import { useStore } from '@/lib/store';
import { C, R } from '@/lib/theme';

/** The whole path: every level and skill, what's got, and the coach's notes. Tap a skill to mark it got. */
export default function Path() {
  const { ready, me, db, setSkill } = useStore();
  if (!ready) return null;
  if (!me) return <Redirect href="/" />;
  const mine = db.progress.filter((p) => p.memberId === me.id);
  const done = new Set(mine.map((p) => p.skillId));
  const { current, finished, total } = pathFor(me.level, done);
  return (
    <Screen>
      <Title style={{ marginTop: 16 }}>Your path</Title>
      <Body>
        {finished} of {total} skills{current ? `, working on “${current.title}”` : ': all done'}
      </Body>
      <View style={{ height: 8, borderRadius: R.pill, backgroundColor: C.border, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: finished }}>
        <View style={{ width: `${total ? (finished / total) * 100 : 0}%`, height: '100%', backgroundColor: C.accent }} />
      </View>
      {LEVELS.map((l) => (
        <Card key={l.id} style={l.id === current?.id ? { borderColor: C.accent, borderWidth: 2 } : undefined}>
          <Heading>{l.title}</Heading>
          <Small>{l.summary}</Small>
          {l.skills.map((s) => {
            const got = done.has(s.id);
            const note = mine.find((p) => p.skillId === s.id)?.ownerNote;
            return (
              <Pressable
                key={s.id}
                onPress={() => setSkill(s.id, !got)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: got }}
                style={{ minHeight: 48, paddingVertical: 8, gap: 2, borderTopWidth: 1, borderColor: C.border }}>
                <Body style={{ color: C.ink, fontWeight: '600' }}>
                  {got ? '[x] ' : '[ ] '}
                  {s.title}
                </Body>
                <Small>{s.why}</Small>
                {s.drills.map((d) => (
                  <Small key={d}>- {d}</Small>
                ))}
                {note ? (
                  <Small style={{ color: C.accent }}>
                    {APP.ownerWord[0].toUpperCase() + APP.ownerWord.slice(1)}: {note}
                  </Small>
                ) : null}
              </Pressable>
            );
          })}
        </Card>
      ))}
      <Button label="Back" kind="secondary" onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
    </Screen>
  );
}
