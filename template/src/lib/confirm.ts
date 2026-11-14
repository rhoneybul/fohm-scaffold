import { Alert, Platform } from 'react-native';

/** Asks before something can't be undone: the browser's dialog on the web, a native alert in the apps. */
export function confirmAsync(message: string, action = 'Delete'): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(message));
  return new Promise((resolve) =>
    Alert.alert(message, undefined, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}
