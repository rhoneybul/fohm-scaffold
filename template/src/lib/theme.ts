/**
 * Design tokens for the member app (light) and the owner's dashboard (dark).
 * Change the brand here, once: every screen reads these. Record the system in
 * DESIGN.md as it grows. Text colours keep 4.5:1 on their backgrounds.
 */
import { useWindowDimensions } from 'react-native';

export const C = {
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  border: '#E4E0D8',
  ink: '#1C1F1D',
  inkMid: '#4A504C',
  inkFaint: '#6B716D',
  accent: '#2F6B4F',
  onAccent: '#FFFFFF',
  accentSoft: '#E3EFE8',
  danger: '#A63A2B',
};

/** The dashboard: dark, so it never gets mistaken for the member app. */
export const A = {
  bg: '#14211B',
  sidebar: '#101A15',
  surface: '#1B2B23',
  surfaceLight: '#22362C',
  border: '#2E4539',
  text: '#F1EEE6',
  textMid: '#C5CEC8',
  textFaint: '#9DAAA2',
  primary: '#F2D777',
  onPrimary: '#14211B',
  primarySoft: 'rgba(242,215,119,0.14)',
  highlight: '#F3A3B5',
  good: '#9FE0B8',
};

export const R = { sm: 8, md: 12, lg: 18, pill: 999 };
export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const MAX_W = 640;
export const sans = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/** Laptop width: the dashboard shows its sidebar, the member app a wider column. */
export function useWide() {
  return useWindowDimensions().width >= 1024;
}
