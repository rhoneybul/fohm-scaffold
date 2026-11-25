import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';

import { Landing } from '@/components/landing';
import { PageLoader } from '@/components/logo-loader';
import { isCoaching } from '@/lib/brand';
import { isWeb } from '@/lib/config';
import { asksAtOpen, mergedRecord } from '@/lib/onboarding';
import { dropWaiting, readWaiting, useDeviceSeen } from '@/lib/onboardingKept';
import { ONBOARDING } from '@/lib/progression';
import { useStore } from '@/lib/store';

/**
 * Sends each person where they belong: signed out → the landing page on the
 * web, onboarding on a first open in the apps (a coaching app's) and sign-in
 * after it; owner → dashboard; a member with answers waiting from onboarding
 * signed out → those saved to their account, and on to where its end leads;
 * a member onboarding hasn't asked yet → onboarding (docs/ONBOARDING.md);
 * else home.
 */
export default function Index() {
  const deviceSeen = useDeviceSeen();
  const store = useStore();
  const { ready, who, me } = store;
  const carry = useCarryOn(store);
  if (!ready || deviceSeen === null || (me?.role === 'member' && carry === 'checking')) return <PageLoader />;
  if (who && 'needsProfile' in who) return <Redirect href="/sign-in" />;
  if (!me) return isWeb ? <Landing /> : <Redirect href={deviceSeen || !isCoaching() ? '/sign-in' : '/onboarding'} />;
  if (me.role === 'owner' || me.role === 'coach') return <Redirect href="/admin" />;
  if (carry === 'started') return <Redirect href={(ONBOARDING.end ?? '/home') as any} />;
  // An app with programs says whether the member has one (Strawberry Fields: programsOf), so a member on one isn't asked.
  if (isCoaching() && asksAtOpen({ role: me.role, record: me.onboarding, hasProgram: false, deviceSeen })) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}

/** Answers given signed out, carried to the account once there is one; if they asked to start, on to where the end leads. */
function useCarryOn({ ready, backend, me, saveOnboarding }: ReturnType<typeof useStore>): 'checking' | 'none' | 'started' {
  const [state, setState] = useState<'checking' | 'none' | 'started'>('checking');
  useEffect(() => {
    if (!ready || !backend || !me || me.role !== 'member') return;
    let gone = false;
    (async () => {
      const waiting = await readWaiting();
      if (!waiting) return setState('none');
      const now = new Date().toISOString();
      try {
        await saveOnboarding(mergedRecord(me.onboarding, { answers: waiting.answers, seenAt: now, ...(waiting.start ? { finishedAt: now, how: 'build' } : {}) }));
        await dropWaiting();
        if (!gone) setState(waiting.start ? 'started' : 'none');
      } catch {
        // Kept on the device: tried again on the next open.
        if (!gone) setState('none');
      }
    })();
    return () => {
      gone = true;
    };
  }, [ready, backend, me?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
}
