import { Redirect } from 'expo-router';

import { Landing } from '@/components/landing';
import { PageLoader } from '@/components/logo-loader';
import { isCoaching } from '@/lib/brand';
import { isWeb } from '@/lib/config';
import { useStore } from '@/lib/store';

/**
 * Sends each person where they belong: signed out → the landing page on the
 * web, sign-in in the apps; owner → dashboard; member → home.
 */
export default function Index() {
  const { ready, who, me } = useStore();
  if (!ready) return <PageLoader />;
  if (who && 'needsProfile' in who) return <Redirect href="/sign-in" />;
  if (!me) return isWeb ? <Landing /> : <Redirect href="/sign-in" />;
  if (me.role === 'owner' || me.role === 'coach') return <Redirect href="/admin" />;
  // A coaching app starts every member with the level assessment.
  if (isCoaching() && !me.level) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
