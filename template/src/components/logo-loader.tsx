/**
 * The throbbing mark (Naz's LogoLoader) and the launch screen (Etapa's
 * LoadingSplash). The mark swells a little and brightens, then settles, on a
 * loop, drawn from the same geometry as the icons and the splash
 * (src/lib/logo.ts), so the phone's splash hands over to it without a jump.
 * Scale and opacity only, so the phone's own animation driver runs it, off
 * the JavaScript thread (the web has no native driver). With reduced motion
 * on, the mark stands still at the top, as the splash shows it.
 *
 * Use `LogoLoader` wherever a page or a block is loading; a button's own
 * spinner stays. `LoadingSplash` is the whole launch screen: the native
 * splash's ink ground with the mark at its size in the middle of the window.
 * `Mark` and `Lockup` are the same mark standing still, wherever the app says
 * whose it is: the landing's header, sign-in and the dashboard.
 */
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { APP } from '@/lib/brand';
import { FILL_RULE, MARK_PATH } from '@/lib/logo';
import { isWeb } from '@/lib/config';
import { FADE_MS, phaseAt, SPLASH, THROB, throbAt, throbs, VIEWBOX } from '@/lib/splash';
import { C, F } from '@/lib/theme';

const NATIVE_DRIVER = Platform.OS !== 'web';

/** True while the person has asked for less motion, on the web and in the apps. */
export function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => live && setReduce(on))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      live = false;
      sub?.remove();
    };
  }, []);
  return reduce;
}

/** How far the web page's own splash (public/index.html) has throbbed, in ms, so the app's picks up where it is; 0 elsewhere. */
function pageSplashTime(): number {
  if (!isWeb || typeof document === 'undefined') return 0;
  const svg = document.getElementById('splash')?.querySelector('svg');
  const time = svg?.getAnimations?.()[0]?.currentTime;
  return typeof time === 'number' ? time : 0;
}

/**
 * When the launch screen's throb began, so every LoadingSplash after the
 * first (the one waiting for the fonts, then the one over the app) and the
 * web page's own carry on one throb, never starting again.
 */
let throbEpoch: number | null = null;
function launchThrobTime(): number {
  if (throbEpoch === null) throbEpoch = Date.now() - pageSplashTime();
  return Date.now() - throbEpoch;
}

const settle = (level: Animated.Value, duration: number = THROB.settleMs) => Animated.timing(level, { toValue: 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: NATIVE_DRIVER });
const swell = (level: Animated.Value, duration: number = THROB.swellMs) => Animated.timing(level, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE_DRIVER });

/**
 * 0 at rest, 1 at the top of the throb. It starts at the top and settles
 * first, as the phone's splash shows it; `follow` carries on the launch
 * screen's one throb (the web page's own, then each LoadingSplash's),
 * finishing that half before the loop.
 */
function useThrob(still: boolean, follow: boolean) {
  const level = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (still) {
      level.setValue(1);
      return undefined;
    }
    const from = follow ? phaseAt(launchThrobTime()) : { level: 1, toward: 0 as const, left: 0 };
    level.setValue(from.level);
    const loop = Animated.loop(Animated.sequence([settle(level), swell(level)]));
    const first = from.left > 0 ? (from.toward === 0 ? Animated.sequence([settle(level, from.left), swell(level)]) : swell(level, from.left)) : null;
    const run = first ? Animated.sequence([first, loop]) : loop;
    run.start();
    return () => run.stop();
  }, [level, still, follow]);
  return level;
}

const REST = throbAt(0);

/** The mark standing still, `size` across, in one colour; named only when no words beside it say the name. */
export function Mark({ size = 28, color = C.ink, label }: { size?: number; color?: string; label?: string }) {
  return (
    <Svg width={size} height={size} viewBox={VIEWBOX} accessibilityLabel={label} aria-label={label} aria-hidden={!label} role={label ? 'img' : undefined}>
      <Path d={MARK_PATH} fill={color} fillRule={FILL_RULE} />
    </Svg>
  );
}

/** The mark and the app's name side by side, the name in the display face: how the app signs its pages. */
export function Lockup({ size = 28, color = C.ink, fontSize = 20, style }: { size?: number; color?: string; fontSize?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: Math.round(size * 0.35) }, style]}>
      <Mark size={size} color={color} />
      <Text style={{ fontFamily: F.display, fontSize, lineHeight: Math.round(fontSize * 1.2), color }}>{APP.name}</Text>
    </View>
  );
}

/** The mark, throbbing: `size` across, in one colour, named for what's loading. */
export function LogoLoader({ size = 56, color = C.ink, label = 'Loading', style, follow = false }: { size?: number; color?: string; label?: string; style?: StyleProp<ViewStyle>; follow?: boolean }) {
  const still = !throbs(useReducedMotion());
  const level = useThrob(still, follow);
  const scale = level.interpolate({ inputRange: [0, 1], outputRange: [REST.scale, 1] });
  const opacity = level.interpolate({ inputRange: [0, 1], outputRange: [REST.opacity, 1] });
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]} role="progressbar" accessibilityRole="progressbar" accessibilityLabel={label} aria-label={label}>
      <Animated.View style={{ opacity, transform: [{ scale }] }}>
        <Svg width={size} height={size} viewBox={VIEWBOX}>
          <Path d={MARK_PATH} fill={color} fillRule={FILL_RULE} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** A page loading: the mark in the middle of its ground (the canvas; the dashboard passes its own). */
export function PageLoader({ label, ground = C.bg, color = C.ink }: { label?: string; ground?: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: ground }}>
      <LogoLoader label={label} color={color} />
    </View>
  );
}

let nativeSplashHidden = false;

/** Keeps the phone's splash up until the app has drawn its own (call once, as the app loads). Does nothing on the web. */
export function keepNativeSplash() {
  SplashScreen.preventAutoHideAsync().catch(() => {});
}

/** Lets the phone's splash (or the web page's) go, once: LoadingSplash is drawn under it by then, so nothing moves. */
export function hideNativeSplash() {
  if (nativeSplashHidden) return;
  nativeSplashHidden = true;
  if (isWeb && typeof document !== 'undefined') document.getElementById('splash')?.remove();
  SplashScreen.hideAsync().catch(() => {});
}

/**
 * The launch screen: the native splash's ink with the mark at its size in the
 * middle of the whole window, then the throb. Over everything, the tab bar
 * included, so nothing peeks out. Once `leaving`, it fades and calls `onGone`.
 */
export function LoadingSplash({ label = 'Loading', leaving = false, onGone }: { label?: string; leaving?: boolean; onGone?: () => void }) {
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!leaving) return;
    Animated.timing(fade, { toValue: 0, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE_DRIVER }).start(() => onGone?.());
  }, [leaving, fade, onGone]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.splash, { opacity: fade }]} onLayout={() => requestAnimationFrame(hideNativeSplash)} pointerEvents={leaving ? 'none' : 'auto'}>
      <StatusBar style="light" />
      <LogoLoader size={SPLASH.size} color={SPLASH.mark} label={label} follow />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splash: { zIndex: 1000, alignItems: 'center', justifyContent: 'center', backgroundColor: SPLASH.background },
});
