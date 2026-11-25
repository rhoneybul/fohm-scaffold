/**
 * The faces the member app draws in: the house style shared with Naz and
 * Etapa (DESIGN.md). Space Grotesk 600 for what's read first (titles,
 * headings, numbers, button labels; 500 for a quieter label) and DM Sans 300
 * to 700 for everything read at length or tapped. Each is a file from
 * @expo-google-fonts, loaded once in src/app/_layout.tsx, which draws anyway
 * after a short wait so a slow or blocked font never blanks the page.
 *
 * React Native picks a face by its family name, never by fontWeight, so every
 * weight is its own face: `FACES` names them, and src/lib/theme.ts turns them
 * into `F` and the type scale `T`. Nothing heavier than 600 is loaded, on
 * purpose: hierarchy comes from size on the scale, never from weight.
 */
import { DMSans_300Light } from '@expo-google-fonts/dm-sans/300Light';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_500Medium } from '@expo-google-fonts/dm-sans/500Medium';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold';

export const FONT_FILES = {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
};

export const FACES = {
  /** DM Sans: what's read at length or tapped. */
  light: 'DMSans_300Light',
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  /** Space Grotesk 600: what's read first, and every number. Never heavier. */
  display: 'SpaceGrotesk_600SemiBold',
  displayMedium: 'SpaceGrotesk_500Medium',
} satisfies Record<string, keyof typeof FONT_FILES>;

/** How long to wait for the fonts before drawing anyway (the system face stands in until they arrive). */
export const FONT_WAIT_MS = 2500;
