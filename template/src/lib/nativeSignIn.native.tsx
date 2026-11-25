/**
 * Signing in with Apple (iOS) and Google (iOS and Android) natively, as Etapa
 * does: the provider's ID token goes to Supabase's signInWithIdToken
 * (docs/SIGN-IN.md). Each module is required in a try, so a build from before
 * it was added keeps email sign-in instead of crashing; the buttons show only
 * where its module is here (`nativeSignInModules`).
 */
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

import { appleName, nonceFrom, sha256Hex, type GoogleClients } from './signInWith';

export interface NativeCredential {
  provider: 'apple' | 'google';
  token: string;
  nonce?: string;
  name: string;
}

type AppleModule = typeof import('expo-apple-authentication');
type GoogleModule = typeof import('@react-native-google-signin/google-signin');
type CryptoModule = typeof import('expo-crypto');

function load<T>(get: () => T): T | null {
  try {
    return get();
  } catch {
    return null;
  }
}

const apple: AppleModule | null = Platform.OS === 'ios' ? load(() => require('expo-apple-authentication') as AppleModule) : null;
const randomness: CryptoModule | null = load(() => require('expo-crypto') as CryptoModule);
const google: GoogleModule | null = load(() => require('@react-native-google-signin/google-signin') as GoogleModule);

export const nativeSignInModules = () => ({ apple: !!(apple?.signInAsync && randomness?.getRandomBytes), google: !!google?.GoogleSignin });

let configured = '';
function configureGoogle(clients: GoogleClients) {
  const key = `${clients.webClientId}|${clients.iosClientId}`;
  if (configured === key) return;
  google!.GoogleSignin.configure({ webClientId: clients.webClientId, ...(Platform.OS === 'ios' ? { iosClientId: clients.iosClientId } : {}) });
  configured = key;
}

async function withApple(): Promise<NativeCredential | null> {
  if (!apple || !randomness) throw new Error('Sign in with Apple needs the latest version of the app.');
  const nonce = nonceFrom(randomness.getRandomBytes(32));
  try {
    const credential = await apple.signInAsync({
      requestedScopes: [apple.AppleAuthenticationScope.FULL_NAME, apple.AppleAuthenticationScope.EMAIL],
      // Apple puts the hash in its token; Supabase hashes the raw nonce and compares.
      nonce: sha256Hex(nonce),
    });
    if (!credential.identityToken) throw new Error('Apple didn’t send a sign-in. Try again.');
    return { provider: 'apple', token: credential.identityToken, nonce, name: appleName(credential.fullName) };
  } catch (e: any) {
    if (e?.code === 'ERR_REQUEST_CANCELED') return null;
    throw e;
  }
}

async function withGoogle(clients: GoogleClients): Promise<NativeCredential | null> {
  if (!google) throw new Error('Google sign-in needs the latest version of the app.');
  configureGoogle(clients);
  await google.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await google.GoogleSignin.signIn();
  if (res.type !== 'success') return null;
  if (!res.data.idToken) throw new Error('Google didn’t send a sign-in. Try again.');
  return { provider: 'google', token: res.data.idToken, name: (res.data.user.name ?? '').trim().slice(0, 80) };
}

export function nativeSignIn(provider: 'apple' | 'google', clients: GoogleClients): Promise<NativeCredential | null> {
  return provider === 'apple' ? withApple() : withGoogle(clients);
}

export async function forgetNativeGoogle(): Promise<void> {
  try {
    if (configured) await google?.GoogleSignin.signOut();
  } catch {}
}

/** Apple's own button (its HIG): black, full width, the kit's button height and corners. */
export function AppleButton({ onPress, height, radius }: { onPress: () => void; height: number; radius: number }): ReactNode {
  if (!apple) return null;
  const Button = apple.AppleAuthenticationButton;
  return (
    <Button
      buttonType={apple.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={apple.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={radius}
      style={{ width: '100%', height }}
      onPress={onPress}
    />
  );
}
