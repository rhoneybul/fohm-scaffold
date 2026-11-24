/**
 * The faces the member app draws in: the one place to change them. Each is a
 * file from @expo-google-fonts (installed per family), loaded once in
 * src/app/_layout.tsx; `FACES` names the loaded face for each weight, which
 * src/lib/theme.ts turns into `F` and the type tokens `T`. React Native picks a
 * face by its family name, never by fontWeight, so every weight is its own face.
 *
 * The default is Archivo, a neutral grotesque with real weights from 400 to 900
 * and a black cut heavy enough for display type and numerals. To change it:
 * npm install the family (e.g. @expo-google-fonts/inter), swap the imports and
 * the names below, and keep display tracking about -0.02em (DESIGN.md).
 */
import { Archivo_400Regular } from '@expo-google-fonts/archivo/400Regular';
import { Archivo_500Medium } from '@expo-google-fonts/archivo/500Medium';
import { Archivo_600SemiBold } from '@expo-google-fonts/archivo/600SemiBold';
import { Archivo_700Bold } from '@expo-google-fonts/archivo/700Bold';
import { Archivo_800ExtraBold } from '@expo-google-fonts/archivo/800ExtraBold';
import { Archivo_900Black } from '@expo-google-fonts/archivo/900Black';

export const FONT_FILES = {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  Archivo_900Black,
};

export const FACES = {
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
  extrabold: 'Archivo_800ExtraBold',
  black: 'Archivo_900Black',
  /** The big numbers (days to go, a timer, a streak). A second family can go here. */
  numeral: 'Archivo_900Black',
} satisfies Record<string, keyof typeof FONT_FILES>;
