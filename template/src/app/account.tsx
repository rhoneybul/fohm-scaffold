import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Share } from 'react-native';

import { Body, Button, ErrorText, Small, Title, Screen } from '@/components/ui';
import { confirmAsync } from '@/lib/confirm';
import { track } from '@/lib/analytics';
import { useStore } from '@/lib/store';

/** Sign out, or delete the account and its login for good. */
export default function Account() {
  const { ready, me, signOut, deleteAccount } = useStore();
  const [error, setError] = useState<string | null>(null);
  // A direct visit waits for the session to load before deciding the person is signed out.
  if (!ready) return null;
  if (!me) return <Redirect href="/" />;
  return (
    <Screen>
      <Title>Your account</Title>
      <Body>{me.name}</Body>
      {me.email ? <Small>{me.email}</Small> : null}
      <InviteFriend />
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
      <Button label="Privacy policy" kind="secondary" onPress={() => router.push('/privacy')} />
      <Button label="Terms of use" kind="secondary" onPress={() => router.push('/terms')} />
      <Button label="Back" kind="secondary" onPress={() => router.back()} />
    </Screen>
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
