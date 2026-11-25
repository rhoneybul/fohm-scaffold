/**
 * The route map (docs/ROUTES.md): Mapbox GL JS drawing the page from
 * routeMapHtml (src/lib/routeMap.ts), in a WebView in the iOS and Android apps
 * and in an iframe's srcdoc on the web, as Etapa's RouteBuilderMap does it,
 * with no native Mapbox SDK. The route goes in as data, so a tap never
 * reloads the map; a tap adds a point and a drag moves one (`editable`).
 * Also RouteThumb, a saved route's line drawn small for its row.
 *
 * react-native-webview is native: a change to it reaches the apps only with a
 * store build. Its require is guarded, so a build without it shows a line
 * instead of a map.
 */
import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Linking, Platform, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { apiBase, isWeb } from '@/lib/config';
import { readMessage, routeMapHtml, scriptJson, staticMapUrl, type MapData, type MapMessage } from '@/lib/routeMap';
import type { LngLat } from '@/lib/routes';
import { C, MAP_STYLE, R, S, T } from '@/lib/theme';

let NativeWebView: React.ComponentType<any> | null = null;
if (!isWeb)
  try {
    NativeWebView = require('react-native-webview').WebView;
  } catch {
    NativeWebView = null;
  }

interface Props {
  /** The public token from /api/health (`integrations.maps`). */
  token: string;
  data: MapData;
  editable?: boolean;
  /** Where it opens before there's a point. */
  centre?: LngLat;
  onAdd?: (p: LngLat) => void;
  onMove?: (index: number, p: LngLat) => void;
  style?: StyleProp<ViewStyle>;
  /** What the map is, for a screen reader. */
  label?: string;
}

export function RouteMap({ token, data, editable = false, centre, onAdd, onMove, style, label = 'Map' }: Props) {
  const [failed, setFailed] = useState(false);
  // The page is built once: a new route is data pushed in, never a reload.
  const html = useMemo(() => routeMapHtml({ token, style: MAP_STYLE, accent: C.accent, bg: C.track, editable, centre }), [token, editable]);
  const json = useMemo(() => JSON.stringify(data), [data]);
  const onMessage = (m: MapMessage | null) => {
    if (!m) return;
    if (m.type === 'failed') setFailed(true);
    else if (m.type === 'add') onAdd?.([m.lng, m.lat]);
    else if (m.type === 'move') onMove?.(m.index, [m.lng, m.lat]);
  };
  const frame: StyleProp<ViewStyle> = [{ borderRadius: R.xxl, overflow: 'hidden', backgroundColor: C.track }, style];
  if (failed || (!isWeb && !NativeWebView)) return <MapNote style={frame} text={failed ? 'The map didn’t load. Check your connection, then open this page again.' : 'Maps need the latest version of the app.'} />;
  return (
    <View style={frame} accessibilityLabel={label}>
      {isWeb ? <WebFrame html={html} json={json} onMessage={onMessage} label={label} /> : <AppFrame html={html} json={json} onMessage={onMessage} />}
    </View>
  );
}

/** The web: the page in an iframe's srcdoc, data posted in, messages posted back. */
function WebFrame({ html, json, onMessage, label }: { html: string; json: string; onMessage: (m: MapMessage | null) => void; label: string }) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const ready = useRef(false);
  const latest = useRef({ json, onMessage });
  latest.current = { json, onMessage };
  const send = () => ref.current?.contentWindow?.postMessage({ fohmRoute: 'data', json: latest.current.json }, '*');
  useEffect(() => {
    const listen = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      const m = readMessage(e.data);
      if (m?.type === 'ready') {
        ready.current = true;
        send();
      }
      latest.current.onMessage(m);
    };
    window.addEventListener('message', listen);
    return () => window.removeEventListener('message', listen);
  }, []);
  useEffect(() => {
    if (ready.current) send();
  }, [json]);
  return React.createElement('iframe', { ref, srcDoc: html, title: label, style: { border: 0, width: '100%', height: '100%', display: 'block' } });
}

/** The iOS and Android apps: the page in a WebView, data injected, messages posted back. */
function AppFrame({ html, json, onMessage }: { html: string; json: string; onMessage: (m: MapMessage | null) => void }) {
  const ref = useRef<any>(null);
  const ready = useRef(false);
  // The site's address as the page's, so a token restricted to it is accepted here too.
  const base = apiBase() ? `${apiBase()}/` : undefined;
  const send = () => ref.current?.injectJavaScript?.(`window.__setData && window.__setData(${scriptJson(json)}); true;`);
  useEffect(() => {
    if (ready.current) send();
  }, [json]);
  const WebView = NativeWebView!;
  return (
    <WebView
      ref={ref}
      source={{ html, baseUrl: base }}
      originWhitelist={['*']}
      javaScriptEnabled
      scrollEnabled={false}
      bounces={false}
      setSupportMultipleWindows={false}
      style={{ flex: 1, backgroundColor: C.track }}
      onMessage={(e: { nativeEvent: { data: string } }) => {
        const m = readMessage(e.nativeEvent.data);
        if (m?.type === 'ready') {
          ready.current = true;
          send();
        }
        onMessage(m);
      }}
      // A link on the map (Mapbox's attribution) opens in the browser, never inside the map.
      onShouldStartLoadWithRequest={(r: { url: string }) => {
        if (r.url.startsWith('about:') || r.url.startsWith('data:') || (base && r.url.startsWith(base)) || r.url.startsWith('blob:')) return true;
        Linking.openURL(r.url).catch(() => undefined);
        return false;
      }}
    />
  );
}

function MapNote({ text, style }: { text: string; style: StyleProp<ViewStyle> }) {
  return (
    <View style={[style, { alignItems: 'center', justifyContent: 'center', padding: S.xl, gap: S.sm }]} accessibilityRole="summary">
      <Feather name="map" size={22} color={C.inkFaint} />
      <Text style={[T.small, { textAlign: 'center' }]}>{text}</Text>
    </View>
  );
}

/**
 * A saved route's line drawn small, for the head of its row: Mapbox's static
 * image of the map with the line in the accent. Without a token, or until it
 * loads, the map icon on the track grey, as a Thumb's stand-in.
 */
export function RouteThumb({ track, token, size = 56 }: { track: LngLat[]; token?: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const uri = token ? staticMapUrl(track, { token, style: MAP_STYLE, accent: C.accent, size: 112 }) : null;
  const site = apiBase();
  return (
    <View style={{ width: size, height: size, borderRadius: R.md, overflow: 'hidden', backgroundColor: C.track, alignItems: 'center', justifyContent: 'center' }}>
      <Feather name="map" size={20} color={C.inkFaint} accessibilityElementsHidden importantForAccessibility="no" />
      {uri && !broken ? (
        <Image
          // In the apps the image is asked for as the site, so a token restricted to its address is accepted.
          source={Platform.OS === 'web' || !site ? { uri } : { uri, headers: { Referer: `${site}/` } }}
          onError={() => setBroken(true)}
          accessibilityIgnoresInvertColors
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        />
      ) : null}
    </View>
  );
}
