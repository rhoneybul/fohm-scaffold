/**
 * The iOS or Android app's first launch, told to the team's Slack as a
 * download (POST /api/downloads, docs/SLACK.md): which app, its version and
 * build, nothing about the person. Once a phone: marked when the API took it,
 * so one that couldn't be sent is sent on the next launch. An app that was
 * used before this shipped has keys in its storage already, so it's marked
 * without a ping. Never throws, and nothing waits on it.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { requireOptionalNativeModule } from 'expo';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { apiBase } from './config';

const TOLD = 'downloaded:told';
/** What the phone kept before this launch wrote anything: read as the app loads, ahead of the session and analytics' own keys. */
const keptBefore: Promise<readonly string[]> = AsyncStorage.getAllKeys().catch(() => []);

/** The build's own version and build number where expo-application's native module is in it, else app.json's. */
function release() {
  const native = requireOptionalNativeModule<{ nativeApplicationVersion?: string | null; nativeBuildVersion?: string | null }>('ExpoApplication');
  const config = Constants.expoConfig;
  const build = Platform.OS === 'ios' ? config?.ios?.buildNumber : config?.android?.versionCode;
  return { version: native?.nativeApplicationVersion ?? config?.version ?? null, build: native?.nativeBuildVersion ?? (build != null ? String(build) : null) };
}

export async function tellDownloaded(): Promise<void> {
  try {
    const base = apiBase();
    if (!base || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return;
    const keys = await keptBefore;
    if (keys.includes(TOLD) || (await AsyncStorage.getItem(TOLD))) return;
    if (keys.length) return void (await AsyncStorage.setItem(TOLD, 'before'));
    const res = await fetch(`${base}/api/downloads`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ platform: Platform.OS, ...release() }) });
    if (res.ok) await AsyncStorage.setItem(TOLD, new Date().toISOString());
  } catch {}
}
