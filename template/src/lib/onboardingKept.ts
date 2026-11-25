/**
 * What onboarding keeps on the device (docs/ONBOARDING.md): that this device
 * has been through it, so a signed-out visitor is asked once, and the answers
 * given signed out, waiting for an account (src/lib/onboarding.ts,
 * `freshWaiting`). Storage can be blocked (a private window): then nothing is
 * kept, and nothing breaks.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { freshWaiting, type Answers, type Waiting } from './onboarding';

const SEEN = 'onboarding:seen';
const WAITING = 'onboarding:waiting';

export async function markDeviceSeen() {
  try {
    await AsyncStorage.setItem(SEEN, '1');
  } catch {
    // Blocked: asked again next visit.
  }
}

/** Whether this device has opened onboarding; null while it's read. */
export function useDeviceSeen(): boolean | null {
  const [seen, setSeen] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(SEEN)
      .then((v) => setSeen(v === '1'))
      .catch(() => setSeen(false));
  }, []);
  return seen;
}

/** Keeps the answers so far for an account; `start` once they've asked for their program. */
export async function keepWaiting(answers: Answers, start = false) {
  const waiting: Waiting = { answers, start, at: new Date().toISOString() };
  try {
    await AsyncStorage.setItem(WAITING, JSON.stringify(waiting));
  } catch {
    // Blocked: the answers go with the tab.
  }
}

/** The answers waiting for an account, if they're fresh enough; stale ones are let go. */
export async function readWaiting(): Promise<Waiting | null> {
  try {
    const raw = await AsyncStorage.getItem(WAITING);
    const waiting = raw ? freshWaiting(JSON.parse(raw)) : null;
    if (raw && !waiting) await AsyncStorage.removeItem(WAITING);
    return waiting;
  } catch {
    return null;
  }
}

export async function dropWaiting() {
  try {
    await AsyncStorage.removeItem(WAITING);
  } catch {
    // Blocked: nothing was kept.
  }
}
