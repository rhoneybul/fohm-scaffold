import { Feather } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, View } from 'react-native';

import { PageLoader } from '@/components/logo-loader';
import { Avatar } from '@/components/avatar';
import { Button, Card, Display, ErrorText, Row, Rows, Screen, Small, TextLink, Title } from '@/components/ui';
import { isCoaching } from '@/lib/brand';
import { pickProfilePhoto } from '@/lib/photo';
import { C, R, S } from '@/lib/theme';
import { confirmAsync } from '@/lib/confirm';
import { track } from '@/lib/analytics';
import { useStore } from '@/lib/store';

/** Your account: the photo on your avatar, sign out, the legal pages and credits, or delete the account and its login for good. */
export default function Account() {
  const { ready, me, signOut, deleteAccount } = useStore();
  const [error, setError] = useState<string | null>(null);
  // A direct visit waits for the session to load before deciding the person is signed out.
  if (!ready) return <PageLoader />;
  if (!me) return <Redirect href="/" />;
  return (
    <Screen>
      <Display>Your account</Display>
      <ProfilePhoto />
      <InviteFriend />
      {me.role === 'member' && isCoaching() ? (
        <Rows>
          <Row icon="compass" title="Walk me through again" line="The first questions again, from where you left them" onPress={() => router.push('/onboarding?step=hello')} />
        </Rows>
      ) : null}
      <Rows>
        <Row icon="shield" title="Privacy policy" onPress={() => router.push('/privacy')} />
        <Row icon="file-text" title="Terms of use" onPress={() => router.push('/terms')} />
        <Row icon="image" title="Photo credits" line="Who took the photos in the app" onPress={() => router.push('/credits')} />
      </Rows>
      <Button label="Sign out" kind="secondary" onPress={() => signOut().then(() => router.replace('/'))} />
      <Button
        label="Delete my account"
        kind="danger"
        onPress={async () => {
          if (!(await confirmAsync('Delete your account and everything you wrote? This can’t be undone.'))) return;
          try {
            await deleteAccount();
            router.replace('/');
          } catch (e: any) {
            setError(e?.message ?? 'That didn’t work. Try again.');
          }
        }}
      />
      <ErrorText text={error} />
    </Screen>
  );
}

/**
 * The avatar at the head of Account, with the name and email: tap it to
 * choose a photo, cut square and scaled on the device (src/lib/photo.ts).
 * With one, Remove photo sits beside Change. It shows on Home's account button
 * and on the dashboard.
 */
function ProfilePhoto() {
  const { me, setProfilePhoto } = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!me) return null;
  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
    } catch (e: any) {
      setError(e?.message ?? 'That photo couldn’t be used. Try another one.');
    } finally {
      setBusy(false);
    }
  };
  const choose = () =>
    run(async () => {
      const picked = await pickProfilePhoto();
      if (picked) await setProfilePhoto(picked);
    });
  return (
    <Card style={{ gap: S.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.lg }}>
        <Pressable onPress={busy ? undefined : choose} accessibilityRole="button" accessibilityLabel={me.photoPath ? 'Change your photo' : 'Add a photo of you'} accessibilityState={{ busy }} style={({ pressed }) => ({ opacity: pressed || busy ? 0.7 : 1 })}>
          <Avatar name={me.name} photoPath={me.photoPath} size={72} />
          <View style={{ position: 'absolute', right: -2, bottom: -2, width: 28, height: 28, borderRadius: R.pill, backgroundColor: C.raised, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.surface }}>
            <Feather name="camera" size={14} color={C.ink} />
          </View>
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Title>{me.name}</Title>
          {me.email ? <Small lines={1}>{me.email}</Small> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: S.xl, flexWrap: 'wrap' }}>
        <TextLink icon="camera" label={busy ? 'Saving your photo' : me.photoPath ? 'Change photo' : 'Add a photo'} onPress={busy ? () => undefined : choose} />
        {me.photoPath && !busy ? <TextLink tone="muted" icon="x" label="Remove" onPress={() => run(() => setProfilePhoto(null))} /> : null}
      </View>
      <ErrorText text={error} />
    </Card>
  );
}

/**
 * A member's own invite link (Tapp), to send to a friend: a friend who
 * installs through it and signs up shows on the dashboard as invited by them.
 * Only while Tapp is on.
 */
function InviteFriend() {
  const { me, backend, integrations } = useStore();
  const [invite, setInvite] = useState<{ link: string | null; joined: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!integrations.tapp || backend?.mode !== 'api' || me?.role !== 'member') return null;
  const send = async () => {
    setError(null);
    let got = invite;
    try {
      got = got?.link ? got : await backend.invite();
      setInvite(got);
      if (!got.link) return setError('Invite links aren’t ready yet. Try again later.');
      track('invite_link_shared');
      await Share.share({ message: got.link, url: got.link });
    } catch (e: any) {
      // A browser without a share sheet still has the link on screen to copy.
      if (!got?.link) setError(e?.message ?? 'That didn’t work. Try again.');
    }
  };
  return (
    <>
      <Button label="Invite a friend" kind="secondary" onPress={send} />
      {invite?.link ? <Small>Your link: {invite.link}</Small> : null}
      {invite && invite.joined > 0 ? <Small>{invite.joined === 1 ? 'One friend has joined through it.' : `${invite.joined} friends have joined through it.`}</Small> : null}
      <ErrorText text={error} />
    </>
  );
}
