import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Where the backend is. On the web the app and /api share an origin, so paths
 * stay relative. In the iOS and Android apps there is no origin, so requests
 * go to `expo.extra.apiUrl` in app.json (your deployed site, or your laptop's
 * address on the local network while developing).
 */
export function apiBase(): string {
  if (Platform.OS === 'web') return '';
  const url = (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl;
  return (url ?? '').replace(/\/$/, '');
}

export const isWeb = Platform.OS === 'web';
