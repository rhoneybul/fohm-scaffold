import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Landing } from '@/components/landing';
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
        <ActivityIndicator color={C.accent} />
      </View>
    );
  if (who && 'needsProfile' in who) return <Redirect href="/sign-in" />;
  if (!me) return isWeb ? <Landing /> : <Redirect href="/sign-in" />;
  return <Redirect href={me.role === 'owner' ? '/admin' : '/home'} />;
}
