import { Platform, View } from 'react-native';
import { useState } from 'react';

import { BrandMark } from '@/components/brand-mark';
import { BUTTON_HEIGHT, Button, Small } from '@/components/ui';
import { APP } from '@/lib/brand';
import { AppleButton, nativeSignInModules } from '@/lib/nativeSignIn';
import { signInMethods } from '@/lib/signInWith';
import { useStore } from '@/lib/store';
import { S } from '@/lib/theme';

/**
 * Sign in with Apple, then Continue with Google (with Google's G), over the email form
 * (docs/SIGN-IN.md): each only where it works on this platform and build,
 * from what /api/health says is on. Nothing shows when neither does.
 */
export function SignInWith({ onSignedIn, onError }: { onSignedIn: () => void; onError: (message: string | null) => void }) {
  const { integrations, signInWith } = useStore();
  const [busy, setBusy] = useState<'apple' | 'google' | null>(null);
  const methods = signInMethods({ platform: Platform.OS, integrations, google: APP.google, native: nativeSignInModules() });
  if (!methods.length) return null;

  async function go(provider: 'apple' | 'google') {
    if (busy) return;
    setBusy(provider);
    onError(null);
    try {
      const outcome = await signInWith(provider);
      if (outcome === 'signed-in') onSignedIn();
    } catch (e: any) {
      onError(e?.message ?? `${provider === 'apple' ? 'Apple' : 'Google'} sign-in didn’t work. Try again.`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={{ gap: S.md }}>
      {methods.map((m) =>
        m === 'apple' ? (
          <AppleButton key={m} onPress={() => go('apple')} height={BUTTON_HEIGHT} radius={BUTTON_HEIGHT / 2} />
        ) : (
          <Button key={m} label="Continue with Google" kind="secondary" mark={<BrandMark brand="google" size={18} />} busy={busy === 'google'} onPress={() => go('google')} />
        ),
      )}
      <Small style={{ textAlign: 'center' }}>or with your email</Small>
    </View>
  );
}
