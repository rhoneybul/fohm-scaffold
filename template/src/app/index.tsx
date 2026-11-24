import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Landing } from '@/components/landing';
import { isCoaching } from '@/lib/brand';
import { isWeb } from '@/lib/config';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

/**
 * Sends each person where they belong: signed out → the landing page on the
 * web, sign-in in the apps; owner → dashboard; member → home.
 */
export default function Index() {
  const { ready, who, me } = useStore();
  if (!ready)
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <ActivityIndicator color={C.ink} />
      </View>
    );
  if (who && 'needsProfile' in who) return <Redirect href="/sign-in" />;
  if (!me) return isWeb ? <Landing /> : <Redirect href="/sign-in" />;
  if (me.role === 'owner' || me.role === 'coach') return <Redirect href="/admin" />;
  // A coaching app starts every member with the level assessment.
  if (isCoaching() && !me.level) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}
