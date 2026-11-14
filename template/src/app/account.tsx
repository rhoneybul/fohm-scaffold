import { Redirect, router } from 'expo-router';
import { useState } from 'react';

import { Body, Button, ErrorText, Small, Title, Screen } from '@/components/ui';
import { confirmAsync } from '@/lib/confirm';
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
