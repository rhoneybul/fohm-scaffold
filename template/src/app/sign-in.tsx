import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Choice } from '@/components/choice';
import { Body, Button, ErrorText, Field, Small, Title, Screen } from '@/components/ui';
import { APP } from '@/lib/brand';
import { isWeb } from '@/lib/config';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import type { Role } from '@/lib/types';

/** Create an account or sign in. A login without a profile yet finishes here too. */
export default function SignIn() {
  const { backend, who, integrations, signIn, signUp, finishProfile, signInWithGoogle } = useStore();
  const params = useLocalSearchParams<{ mode?: string }>();
  const needsProfile = !!who && 'needsProfile' in who;
  const [mode, setMode] = useState<'in' | 'up'>(needsProfile || params.mode === 'up' ? 'up' : 'in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('member');
  const [ownerCode, setOwnerCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    try {
      const profile = { name, role, ownerCode: role === 'member' ? undefined : ownerCode };
      if (needsProfile) await finishProfile(profile);
      else if (mode === 'in') await signIn(email.trim(), password);
      else if ((await signUp(email.trim(), password, profile)) === 'confirm-email') {
        setNotice('Check your email for a link to confirm your account, then sign in.');
        setMode('in');
        return;
      }
      router.replace('/');
    } catch (e: any) {
      setError(e?.message ?? 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const creating = needsProfile || mode === 'up';
  return (
    <Screen>
      <View style={{ gap: 8, marginTop: 32 }}>
        <Title>{needsProfile ? 'Finish setting up' : creating ? 'Create your account' : 'Sign in'}</Title>
        {backend?.mode === 'local' ? <Small>Demo mode: everything stays on this device, and any password works.</Small> : null}
      </View>
      {notice ? <Body style={{ color: C.accent }}>{notice}</Body> : null}
      {!needsProfile && (
        <>
          <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={creating ? 'new-password' : 'current-password'} />
        </>
      )}
      {creating && (
        <>
          <Field label="Your name" value={name} onChangeText={setName} autoComplete="name" />
          <View style={{ gap: 8 }} accessibilityRole="radiogroup">
            <Small>Joining as</Small>
            <Choice label={`A ${APP.memberWord}`} selected={role === 'member'} onPress={() => setRole('member')} />
            <Choice label="A coach here (needs the coach code)" selected={role === 'coach'} onPress={() => setRole('coach')} />
            <Choice label={`I run ${APP.name} (needs the owner code)`} selected={role === 'owner'} onPress={() => setRole('owner')} />
          </View>
          {role !== 'member' && <Field label={role === 'owner' ? 'Owner code' : 'Coach code'} value={ownerCode} onChangeText={setOwnerCode} autoCapitalize="none" />}
        </>
      )}
      <ErrorText text={error} />
      <Button label={needsProfile ? 'Finish' : creating ? 'Create account' : 'Sign in'} onPress={go} busy={busy} />
      {!needsProfile && integrations.google && isWeb && (
        <Button label="Continue with Google" kind="secondary" onPress={() => signInWithGoogle().catch((e) => setError(e?.message ?? 'Google sign-in didn’t work.'))} />
      )}
      {!needsProfile && (
        <Pressable onPress={() => setMode(creating ? 'in' : 'up')} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', alignItems: 'center' }}>
          <Small style={{ color: C.accent }}>{creating ? 'I already have an account' : 'Create an account'}</Small>
        </Pressable>
      )}
    </Screen>
  );
}
