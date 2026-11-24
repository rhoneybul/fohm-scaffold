import { Redirect, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';

import { FirstSteps, InkCard, PhotoCard, StatTile, WeekCircles } from '@/components/board';
import { MediaPlayer } from '@/components/media';
import { Body, Button, Card, Heading, LinkRow, Note, Screen, Section, Small } from '@/components/ui';
import { APP, hasCoach, isCoaching, isGame, writeTitle } from '@/lib/brand';
import { confirmAsync } from '@/lib/confirm';
import { GAME_ID, GAME_NAME, bestScore } from '@/lib/game';
import { firstSteps, greeting, weekDone, weekdayIndex } from '@/lib/home';
import { firstShown } from '@/lib/photos';
import { levelById, pathFor } from '@/lib/progression';
import { useStore } from '@/lib/store';
import { C, F, S } from '@/lib/theme';
import { isPro } from '@/lib/types';

/**
 * The member's home: a board, not a list of links. The greeting and the
 * account, a new member's first steps until they're done, this week as seven
 * circles, what's next as a photo card with Start, a few numbers, then what
 * they wrote with any reply. Replace and extend it from the references in
 * DESIGN.md; keep every write going through the store, so the owner's
 * dashboard sees it.
 */
export default function Home() {
  const { ready, me, db, integrations, removeEntry } = useStore();
  // A direct visit waits for the session to load before deciding the person is signed out.
  if (!ready) return null;
  if (!me) return <Redirect href="/" />;
  if (isCoaching() && !me.level) return <Redirect href="/onboarding" />;
  const now = new Date();
  const mine = db.entries.filter((e) => e.memberId === me.id);
  const checkins = db.checkins.filter((c) => c.memberId === me.id);
  const scores = db.scores.filter((s) => s.memberId === me.id && s.game === GAME_ID);
  const steps = firstSteps({ kind: APP.kind, placed: !!me.level, checkins: checkins.length, entries: mine.length, scores: scores.length, photo: !!me.photoPath, coach: hasCoach(), ownerWord: APP.ownerWord });
  const week = weekDone([...checkins, ...mine, ...scores], now);

  return (
    <Screen gap={S.xl}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: S.xs }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.semibold, fontSize: 15, color: C.inkMid }}>
          {greeting(now, me.name)}
        </Text>
        <Pressable onPress={() => router.push('/account')} accessibilityRole="button" accessibilityLabel="Your account" hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
          <Avatar name={me.name} photoPath={me.photoPath} size={44} />
        </Pressable>
      </View>

      {steps.every((s) => s.done) ? null : <FirstSteps title="Getting started" line={APP.tagline} steps={steps} />}

      <WeekCircles done={week} today={weekdayIndex(now)} />

      <Next />

      {isCoaching() ? <CoachingNumbers checkins={checkins.length} /> : null}

      <Section
        title={isCoaching() && hasCoach() ? 'Your questions' : isGame() ? 'Your feedback' : 'What you wrote'}
        line={mine.length ? undefined : 'What you write shows here, with any reply.'}
        action={<Button small kind="secondary" icon="edit-3" label={isCoaching() && hasCoach() ? 'Ask' : 'Write'} onPress={() => router.push('/write')} />}>
        {mine.map((e) => (
          <Card key={e.id}>
            <Heading>{e.title}</Heading>
            {e.body ? <Body>{e.body}</Body> : null}
            {e.mediaPath ? <MediaPlayer path={e.mediaPath} type={e.mediaType} /> : null}
            {e.link ? <Small>{e.link}</Small> : null}
            {e.replyMediaPath ? <MediaPlayer path={e.replyMediaPath} type={e.replyMediaType} /> : null}
            {e.reply ? <Note icon="message-circle" title="Reply">{e.reply}</Note> : e.replyMediaPath ? null : <Small>No reply yet.</Small>}
            <Button small kind="outline" label="Delete" onPress={async () => (await confirmAsync('Delete this for good?')) && removeEntry(e.id)} />
          </Card>
        ))}
      </Section>

      <Section title="More">
        <View>
          {integrations.ai ? <LinkRow icon="message-square" title="Ask the assistant" line={isPro(me) ? 'Questions answered any time' : 'Part of Pro'} onPress={() => router.push('/ask')} /> : null}
          {integrations.billing || isPro(me) ? <LinkRow icon="star" title={isPro(me) ? 'You have Pro' : 'See Pro'} line="Everything, with nothing held back" onPress={() => router.push('/pro')} /> : null}
          <LinkRow icon="user" title="Your account" line={me.email ?? me.name} onPress={() => router.push('/account')} />
        </View>
      </Section>
    </Screen>
  );
}

/** What's next, as a photo card with Start: the next skill on the path, or a round of the game; otherwise a prompt to write. */
function Next() {
  const { me, db } = useStore();
  if (!me) return null;
  if (isCoaching()) {
    const done = new Set(db.progress.filter((p) => p.memberId === me.id).map((p) => p.skillId));
    const path = pathFor(me.level, done);
    const skill = path.next[0];
    if (!skill) return <InkCard title="You’ve finished the path" line={hasCoach() ? `Every skill done. Keep checking in, and tell your ${APP.ownerWord} what you want next.` : 'Every skill done. Keep checking in to hold on to them.'} />;
    return (
      <PhotoCard
        uri={firstShown(skill.photos)?.url}
        title={skill.title}
        line={`${levelById(path.current?.id)?.title ?? ''} · ${path.finished} of ${path.total} skills`}
        badge={{ text: 'Up next', live: true }}
        icon="trending-up"
        onPress={() => router.push('/path')}
        label={`Up next: ${skill.title}`}>
        <Button kind="secondary" icon="play" label="Start" onPress={() => router.push('/checkin')} />
      </PhotoCard>
    );
  }
  if (isGame()) {
    const best = bestScore(db.scores.filter((s) => s.memberId === me.id && s.game === GAME_ID));
    return (
      <PhotoCard title={GAME_NAME} line={best ? `Your best: ${best} points` : 'Your first round'} icon="play" onPress={() => router.push('/game')}>
        <Button kind="secondary" icon="play" label="Play" onPress={() => router.push('/game')} />
      </PhotoCard>
    );
  }
  return (
    <InkCard title={writeTitle()} line={`Everything you write reaches the ${APP.ownerWord}, and replies show here.`}>
      <Button kind="secondary" label="Write" onPress={() => router.push('/write')} />
    </InkCard>
  );
}

/** Two numbers: skills got and check-ins so far. */
function CoachingNumbers({ checkins }: { checkins: number }) {
  const { me, db } = useStore();
  if (!me) return null;
  const done = new Set(db.progress.filter((p) => p.memberId === me.id).map((p) => p.skillId));
  const path = pathFor(me.level, done);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: S.sm }}>
      <StatTile label="Skills" value={`${path.finished} of ${path.total}`} />
      <StatTile label="Check-ins" value={String(checkins)} line={checkins ? undefined : 'After you practise'} />
    </View>
  );
}
