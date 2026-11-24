/**
 * Tapp in the iOS and Android apps: reads back the link the app was
 * installed (or opened) through, holds what it names on the phone (a
 * friend's invite code, or a /go/<channel>), and hands it to the server once
 * someone is signed in (POST /api/accounts { action: 'claim' }), so the
 * owner's dashboard shows who invited whom and where people came from.
 * Tracking only: nobody earns anything.
 *
 * What keeps it safe on every build:
 *  - Off until the server has Tapp's keys (/api/health → integrations.tapp).
 *  - The SDK is required inside try/catch: it throws on a build without its
 *    native code (an over-the-air update reaching an older build), and then
 *    nothing here runs.
 *  - On iOS, Tapp matches an install to a click with device signals, which
 *    Apple treats as tracking: it starts there only for someone who has
 *    already allowed tracking (expo-tracking-transparency, if the app asks;
 *    this never asks). Android uses the Play install referrer and needs no
 *    permission.
 *  - Nothing throws into a caller, and nothing anyone sees waits on it.
 *  - Only the first link a phone sees is kept.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import { Linking, Platform } from 'react-native';

import { track } from './analytics';
import { readTappLink, type HeldLink } from './tappLink';

export type Claimer = (link: HeldLink) => Promise<unknown>;

const HELD = 'tapp:held';
const SAW_A_LINK = 'tapp:saw-a-link';

type Sdk = {
  start(config: { authToken: string; env: 'PRODUCTION' | 'SANDBOX'; tappToken: string }): void;
  fetchOriginLinkData(): Promise<unknown>;
  fetchLinkData(url: string): Promise<unknown>;
  shouldProcess(url: string): Promise<boolean>;
  addDeferredLinkListener(listener: (data: unknown) => void): unknown;
};

/** The SDK when this build carries its native code, else null. */
function installedSdk(): Sdk | null {
  try {
    const sdk = require('com-tapp-so-sdk');
    return typeof sdk?.start === 'function' ? (sdk as Sdk) : null;
  } catch {
    return null;
  }
}

let sdk: Sdk | null = null;
let starting: Promise<boolean> | null = null;
let claimer: Claimer | null = null;

async function trackingAllowed() {
  if (Platform.OS !== 'ios') return true;
  try {
    const att = requireOptionalNativeModule<{ getPermissionsAsync(): Promise<{ status: string }> }>('ExpoTrackingTransparency');
    return (await att?.getPermissionsAsync())?.status === 'granted';
  } catch {
    return false;
  }
}

/** Keeps the first link this phone saw, then tries to hand it over. */
async function hold(data: unknown, source: 'origin' | 'deferred' | 'opened') {
  const link = readTappLink(data as Parameters<typeof readTappLink>[0]);
  if (!link) return;
  try {
    if (await AsyncStorage.getItem(SAW_A_LINK)) return;
    await AsyncStorage.multiSet([
      [HELD, JSON.stringify(link)],
      [SAW_A_LINK, '1'],
    ]);
  } catch {
    return;
  }
  track('tapp_link_received', { source, kind: 'code' in link ? 'invite' : 'channel' });
  await handOver();
}

/** Hands the held link to the server once someone is signed in; any answer is final, no answer keeps it for next time. */
async function handOver() {
  if (!claimer) return;
  try {
    const held = await AsyncStorage.getItem(HELD);
    if (!held) return;
    await claimer(JSON.parse(held) as HeldLink);
    await AsyncStorage.removeItem(HELD);
  } catch {
    // Signed out, offline or a server error: tried again at the next sign-in or launch.
  }
}

async function openedWith(url: string | null) {
  if (!sdk || !url) return;
  try {
    if (await sdk.shouldProcess(url)) await hold(await sdk.fetchLinkData(url), 'opened');
  } catch {}
}

async function start(config: { authToken: string; tappToken: string }) {
  const installed = installedSdk();
  if (!installed || !(await trackingAllowed())) return false;
  try {
    installed.start({ authToken: config.authToken, env: 'PRODUCTION', tappToken: config.tappToken });
  } catch (e) {
    console.warn('tapp: start failed', (e as Error)?.message);
    return false;
  }
  sdk = installed;
  try {
    sdk.addDeferredLinkListener((data) => void hold(data, 'deferred'));
  } catch {}
  try {
    await hold(await sdk.fetchOriginLinkData(), 'origin');
  } catch {}
  Linking.addEventListener('url', ({ url }) => void openedWith(url));
  await openedWith((await Linking.getInitialURL().catch(() => null)) ?? null);
  return true;
}

/** Starts Tapp once, with the tokens /api/health gives (null: Tapp is off). Resolves whether it's running. */
export function startTapp(config: { authToken: string; tappToken: string } | null): Promise<boolean> {
  if (sdk) return Promise.resolve(true);
  if (!config) return Promise.resolve(false);
  if (!starting)
    starting = start(config).then((running) => {
      if (!running) starting = null; // tracking may be allowed later
      return running;
    });
  return starting;
}

/** Who hands a held link to the server: set once someone is signed in, null when they sign out. */
export function setTappClaimer(claim: Claimer | null) {
  claimer = claim;
  if (claim) void handOver();
}
