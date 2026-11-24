import { Feather } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Body, Card, Heading, Label, Note, Small, Strong, Title, Screen } from '@/components/ui';
import { APP, hasCoach } from '@/lib/brand';
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
      <Title style={{ marginTop: 8 }}>Your path</Title>
      <Body>
        {finished} of {total} skills{current ? `, working on “${current.title}”` : ': all done'}
      </Body>
      <View style={{ height: 8, borderRadius: R.pill, backgroundColor: C.panel, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: finished }}>
        <View style={{ width: `${total ? (finished / total) * 100 : 0}%`, height: '100%', backgroundColor: C.ink }} />
      </View>
      {LEVELS.map((l) => (
        <Card key={l.id}>
          <Heading>{l.title}</Heading>
          {l.id === current?.id ? <Label style={{ color: C.accent }}>Where you are now</Label> : null}
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
                style={{ minHeight: 56, paddingVertical: 10, gap: 4, borderTopWidth: 1, borderColor: C.line }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 24, height: 24, borderRadius: R.pill, borderWidth: got ? 0 : 1.5, borderColor: C.line, backgroundColor: got ? C.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {got ? <Feather name="check" size={14} color={C.onInk} /> : null}
                  </View>
                  <Strong style={{ flex: 1 }}>{s.title}</Strong>
                </View>
                <Small>{s.why}</Small>
                {s.drills.map((d) => (
                  <Small key={d}>{d}</Small>
                ))}
                {note ? <Note icon="message-circle" title={hasCoach() ? `From your ${APP.ownerWord}` : `A note from the ${APP.ownerWord}`}>{note}</Note> : null}
              </Pressable>
            );
          })}
        </Card>
      ))}
    </Screen>
  );
}
