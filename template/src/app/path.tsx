import { Feather } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { Text, View } from 'react-native';

import { Body, Display, Row, Rows, Screen, Section, Small } from '@/components/ui';
import { APP, hasCoach } from '@/lib/brand';
import { LEVELS, pathFor } from '@/lib/progression';
import { useStore } from '@/lib/store';
import { C, R, S, T } from '@/lib/theme';

/** The whole path: every level and its skills as rows on one card, what's got, and the coach's notes. Tap a skill to mark it got. */
export default function Path() {
  const { ready, me, db, setSkill } = useStore();
  if (!ready) return null;
  if (!me) return <Redirect href="/" />;
  const mine = db.progress.filter((p) => p.memberId === me.id);
  const done = new Set(mine.map((p) => p.skillId));
  const { current, finished, total } = pathFor(me.level, done);
  return (
    <Screen>
      <Display>Your path</Display>
      <Body>
        {finished} of {total} skills{current ? `, working on “${current.title}”` : ': all done'}
      </Body>
      <View style={{ height: 6, borderRadius: R.pill, backgroundColor: C.track, overflow: 'hidden' }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: finished }}>
        <View style={{ width: `${total ? (finished / total) * 100 : 0}%`, height: '100%', backgroundColor: C.ink }} />
      </View>
      {LEVELS.map((l) => (
        <Section key={l.id} title={l.title} line={l.id === current?.id ? `Where you are now. ${l.summary}` : l.summary}>
          <Rows>
            {l.skills.map((s) => {
              const got = done.has(s.id);
              const note = mine.find((p) => p.skillId === s.id)?.ownerNote;
              return (
                <Row
                  key={s.id}
                  strong
                  title={s.title}
                  line={s.why}
                  lines={4}
                  role="checkbox"
                  selected={got}
                  label={`${s.title}. ${s.why}`}
                  onPress={() => setSkill(s.id, !got)}
                  right={null}
                  thumb={
                    <View style={{ width: 24, height: 24, borderRadius: R.pill, borderWidth: got ? 0 : 1.5, borderColor: C.line, backgroundColor: got ? C.ink : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {got ? <Feather name="check" size={14} color={C.onInk} /> : null}
                    </View>
                  }>
                  {s.drills.length ? (
                    <View style={{ gap: 2, marginTop: S.xs }}>
                      {s.drills.map((d) => (
                        <Small key={d}>{d}</Small>
                      ))}
                    </View>
                  ) : null}
                  {note ? (
                    <View style={{ marginTop: S.sm, backgroundColor: C.raised, borderRadius: R.md, padding: S.md, gap: 2 }}>
                      <Text style={T.label}>{hasCoach() ? `From your ${APP.ownerWord}` : `A note from the ${APP.ownerWord}`}</Text>
                      <Text style={[T.body, { color: C.ink }]}>{note}</Text>
                    </View>
                  ) : null}
                </Row>
              );
            })}
          </Rows>
        </Section>
      ))}
    </Screen>
  );
}
