/**
 * Signing in with Apple and Google natively: the iOS and Android apps' own
 * (nativeSignIn.native.tsx). On the web there's nothing native: Google is a
 * redirect (`signInWithGoogle` in src/lib/backend.ts) and Apple isn't offered.
 */
import type { ReactNode } from 'react';

import type { GoogleClients } from './signInWith';

/** What a native sign-in hands Supabase: the provider's ID token, the raw nonce it was asked with, and the name where the provider gave one. */
export interface NativeCredential {
  provider: 'apple' | 'google';
  token: string;
  nonce?: string;
  name: string;
}

/** Whether this build carries each native module. */
export const nativeSignInModules = (): { apple: boolean; google: boolean } => ({ apple: false, google: false });

/** Asks Apple or Google for an ID token; null when the person cancels. */
export async function nativeSignIn(_provider: 'apple' | 'google', _google: GoogleClients): Promise<NativeCredential | null> {
  throw new Error('That sign-in is in the iOS and Android apps.');
}

/** Lets Google ask which account next time (after signing out). */
export async function forgetNativeGoogle(): Promise<void> {}

/** Apple's own Sign in with Apple button: iOS only. */
export function AppleButton(_props: { onPress: () => void; height: number; radius: number }): ReactNode {
  return null;
}
