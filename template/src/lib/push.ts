/**
 * Push notifications in the iOS and Android apps, through Expo's push
 * service. After sign-in the app asks once for permission, then saves this
 * phone's push address (a device) through /api/data; the server sends to it
 * when there's a reply or something new for the owner. Needs the EAS project
 * id (npx eas-cli init writes it into app.json) and a real phone.
 */
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

/** This phone's Expo push address, or null (web, no permission, no EAS project id, a simulator). */
export async function pushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  if (!projectId) return null;
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return null;
    if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: Notifications.AndroidImportance.DEFAULT });
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

/**
 * Whether this device can be asked to notify now (onboarding's notify step):
 * 'ask' only in the apps, with an EAS project, before the person has answered;
 * 'on' once they've allowed it, 'blocked' once they've said no (only the
 * phone's settings change that), 'unsupported' on the web and without a project.
 */
export async function notifyStatus(): Promise<'ask' | 'on' | 'blocked' | 'unsupported'> {
  if (Platform.OS === 'web') return 'unsupported';
  const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId;
  if (!projectId) return 'unsupported';
  try {
    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') return 'on';
    return canAskAgain === false || status === 'denied' ? 'blocked' : 'ask';
  } catch {
    return 'unsupported';
  }
}

/** Asks the phone to allow notifications; true if it did. The device is registered once the member is signed in (the store). */
export async function askToNotify(): Promise<boolean> {
  try {
    return (await Notifications.requestPermissionsAsync()).status === 'granted';
  } catch {
    return false;
  }
}

/** Opens the screen a notification points at when it's tapped. */
export function onNotificationTap(go: (path: string) => void) {
  if (Platform.OS === 'web') return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const path = r.notification.request.content.data?.path;
    if (typeof path === 'string' && path.startsWith('/')) go(path);
  });
  return () => sub.remove();
}
