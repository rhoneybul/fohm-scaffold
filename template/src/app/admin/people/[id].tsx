import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { AButton, AInput, AMuted, AText, AH2, Badge, Empty, PageHeader, Panel, Pills, Section, relative } from '@/components/admin';
import { platformLabel } from '@/lib/activity';
import { ASSESSMENT, FEEL, levelById, pathFor, skillById } from '@/lib/progression';
import { MediaAttach, MediaPlayer } from '@/components/media';
import type { PickedMedia } from '@/lib/media';
import { useStore } from '@/lib/store';
import { A } from '@/lib/theme';
import { isPro, type Entry } from '@/lib/types';

/** One member: what they wrote (reply to each), and the owner's private notes. */
export default function Member() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me, db, saveOwnerNotes, setPlan, assignCoach } = useStore();
  const [planError, setPlanError] = useState<string | null>(null);
  const user = db.users.find((u) => u.id === id);
  const [notes, setNotes] = useState(user?.ownerNotes ?? '');
  if (!user) return <Empty text="No one with that link." />;
  const entries = db.entries.filter((e) => e.memberId === user.id);
  const scores = db.scores.filter((x) => x.memberId === user.id);
  const chats = db.ai.filter((x) => x.memberId === user.id);
  const progress = db.progress.filter((x) => x.memberId === user.id);
  const checkins = db.checkins.filter((x) => x.memberId === user.id);
  const path = pathFor(user.level, new Set(progress.map((p) => p.skillId)));
  const devices = db.devices.filter((x) => x.memberId === user.id);
  const invited = db.users.filter((u) => u.invitedBy === user.id);
  const pro = isPro(user);
  const coaches = db.users.filter((u) => u.role === 'coach');
  const switchPlan = (plan: 'pro' | 'free') => setPlan(user.id, plan).catch((e) => setPlanError(e?.message ?? 'That didn’t work.'));
  return (
    <>
      <PageHeader title={user.name} subtitle={`${user.email ?? ''} · joined ${relative(user.createdAt)}`} right={<Avatar name={user.name} photoPath={user.photoPath} size={64} dark />} />
      {me?.role === 'owner' && coaches.length > 0 && (
        <Section title="Coach">
          <AMuted>Only their coach (and you) see this member.</AMuted>
          <Pills
            value={user.coachId ?? 'none'}
            options={[{ id: 'none', label: 'No coach' }, ...coaches.map((c) => ({ id: c.id, label: c.name }))]}
            onChange={(id) => assignCoach(user.id, id === 'none' ? null : id).catch((e) => setPlanError(e?.message ?? 'That didn’t work.'))}
          />
        </Section>
      )}
      <Section title="Plan">
        <Panel>
          <AText>
            {pro ? (user.planSource === 'stripe' ? 'Pro, paid through Stripe' : 'Pro, given by you') : 'Free'}
            {pro && user.planUntil ? ` · renews or ends ${new Date(user.planUntil).toLocaleDateString()}` : ''}
          </AText>
          {user.stripeExtraSubscription ? <Badge label={`Second paid subscription ${user.stripeExtraSubscription}: refund or cancel in Stripe`} tone="highlight" /> : null}
          {user.planSource !== 'stripe' && me?.role === 'owner' && (
            <View style={{ alignSelf: 'flex-start' }}>
              <AButton label={pro ? 'Take Pro back' : 'Give Pro'} kind={pro ? 'secondary' : 'primary'} onPress={() => switchPlan(pro ? 'free' : 'pro')} />
            </View>
          )}
          {planError ? <AMuted>{planError}</AMuted> : null}
        </Panel>
      </Section>
      {user.level || progress.length || checkins.length ? (
        <Section title="Progress">
          <Panel>
            <AText>
              Started at “{levelById(user.level)?.title ?? 'not assessed'}” · {path.finished} of {path.total} skills · now on {path.current ? `“${path.current.title}”` : 'the end of the path'}
            </AText>
            {user.goal ? <AText>Goal: {user.goal}</AText> : null}
            {user.assessment
              ? ASSESSMENT.map((q) => (
                  <AMuted key={q.id}>
                    {q.question} {user.assessment?.[q.id] ?? '-'}
                  </AMuted>
                ))
              : null}
          </Panel>
          {progress.map((p) => (
            <SkillNote key={p.id} id={p.id} title={skillById(p.skillId)?.title ?? p.skillId} at={p.doneAt} note={p.ownerNote} />
          ))}
        </Section>
      ) : null}
      {checkins.length > 0 && (
        <Section title={`Check-ins (${checkins.length})`}>
          {checkins.map((c) => (
            <Panel key={c.id}>
              <AMuted>
                {c.date}
                {c.minutes ? ` · ${c.minutes} min` : ''}
              </AMuted>
              <AText>
                {skillById(c.skillId)?.title ?? 'Practice'}
                {c.feel ? ` · ${FEEL[c.feel]}` : ''}
              </AText>
              {c.feel === 1 ? <Badge label="Felt too hard" tone="highlight" /> : null}
              {c.note ? <AText>{c.note}</AText> : null}
            </Panel>
          ))}
        </Section>
      )}
      <Section title={`Messages and clips (${entries.length})`}>
        {entries.length === 0 ? <Empty text="Nothing written yet." /> : entries.map((e) => <EntryPanel key={e.id} entry={e} />)}
      </Section>
      {scores.length > 0 && (
        <Section title={`Games (${scores.length})`}>
          {scores.map((x) => (
            <Panel key={x.id}>
              <AText>
                {x.game}: {x.points} points in {x.seconds}s
              </AText>
              <AMuted>{relative(x.createdAt)}</AMuted>
            </Panel>
          ))}
        </Section>
      )}
      {chats.length > 0 && (
        <Section title={`AI assistant (${chats.length})`}>
          {chats.map((c) => (
            <Panel key={c.id}>
              <AMuted>{relative(c.createdAt)}</AMuted>
              <AH2>{c.question}</AH2>
              <AText>{c.answer}</AText>
            </Panel>
          ))}
        </Section>
      )}
      <Section title="Seen">
        <AText>
          {user.lastSeenAt ? `Last in the app ${relative(user.lastSeenAt).toLowerCase()}${user.lastPlatform ? `, on the ${platformLabel(user)}` : ''}` : 'Not seen since this was added'}
        </AText>
        {devices.length > 0 && <AMuted>{devices.map((d) => `${d.platform} (since ${new Date(d.createdAt).toLocaleDateString()})`).join(', ')}: push notifications on</AMuted>}
      </Section>
      {(user.invitedBy || user.cameFrom || user.inviteLink || invited.length > 0) && (
        <Section title="Invites">
          {user.invitedBy ? <AText>Invited by {db.users.find((u) => u.id === user.invitedBy)?.name ?? 'a member who has left'}</AText> : null}
          {user.cameFrom ? <AText>Came through the “{user.cameFrom}” link</AText> : null}
          {invited.length > 0 ? <AText>Invited {invited.map((u) => u.name).join(', ')}</AText> : null}
          {user.inviteLink ? <AMuted>Their invite link: {user.inviteLink}</AMuted> : null}
        </Section>
      )}
      <Section title="Private notes">
        <AMuted>Only you and the other staff see these. They never reach the member.</AMuted>
        <AInput label="Notes" value={notes} onChangeText={setNotes} multiline />
        <View style={{ alignSelf: 'flex-start' }}>
          <AButton label="Save private notes" onPress={() => saveOwnerNotes(user.id, notes)} />
        </View>
      </Section>
    </>
  );
}

function EntryPanel({ entry }: { entry: Entry }) {
  const { reply } = useStore();
  const [text, setText] = useState(entry.reply ?? '');
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const replied = !!(entry.reply || entry.replyMediaPath);
  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await reply(entry.id, text, media);
      setMedia(null);
    } catch (e: any) {
      setError(e?.message ?? 'That didn’t send.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel>
      <AMuted>{relative(entry.createdAt)}</AMuted>
      <AH2>{entry.title}</AH2>
      {entry.body ? <AText>{entry.body}</AText> : null}
      {entry.mediaPath ? <MediaPlayer path={entry.mediaPath} type={entry.mediaType} /> : null}
      {entry.link ? <AText style={{ color: A.primary }}>{entry.link}</AText> : null}
      {replied ? <Badge label="Replied" tone="good" /> : <Badge label="Needs a reply" tone="highlight" />}
      {entry.replyMediaPath ? (
        <>
          <AMuted>Your video reply</AMuted>
          <MediaPlayer path={entry.replyMediaPath} type={entry.replyMediaType} />
        </>
      ) : null}
      <AInput label="Your reply" value={text} onChangeText={setText} multiline />
      <MediaAttach value={media} onChange={setMedia} dark />
      {error ? <AMuted>{error}</AMuted> : null}
      <View style={{ alignSelf: 'flex-start' }}>
        <AButton label={busy ? 'Sending…' : replied ? 'Update reply' : 'Send reply'} onPress={() => !busy && send()} />
      </View>
    </Panel>
  );
}

/** A skill the member got, with the owner's note on it (the member sees the note on their path). */
function SkillNote({ id, title, at, note }: { id: string; title: string; at: string; note?: string }) {
  const { noteOnSkill } = useStore();
  const [text, setText] = useState(note ?? '');
  return (
    <Panel>
      <AMuted>Got it {relative(at)}</AMuted>
      <AH2>{title}</AH2>
      <AInput label="Your note on it (they see this)" value={text} onChangeText={setText} />
      <View style={{ alignSelf: 'flex-start' }}>
        <AButton label="Send note" kind="secondary" onPress={() => noteOnSkill(id, text)} />
      </View>
    </Panel>
  );
}
