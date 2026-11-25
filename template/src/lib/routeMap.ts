/**
 * The page the route map draws in (src/components/route-map.tsx): Mapbox GL JS
 * in one HTML document, the same for the iOS and Android apps (a WebView) and
 * the web (an iframe's srcdoc), as Etapa's RouteBuilderMap does it, with no
 * native Mapbox SDK. The route goes in as data (`window.__setData`, injected
 * in the apps, posted in on the web), so a tap never reloads the map; taps and
 * drags come back as messages. Pure strings, tested in Node
 * (tests/routeMap.test.ts). docs/ROUTES.md has the decisions.
 */
import type { LngLat } from './routes.js';

/** Mapbox GL JS, pinned: a new version is a deliberate change, checked on a phone. */
export const MAPBOX_GL_VERSION = '3.7.0';

/** What the map shows: the member's points, the line between them, and the legs still straight (dashed). */
export interface MapData {
  points: LngLat[];
  track: LngLat[];
  dashed: [LngLat, LngLat][];
}

/** What the map tells the screen. */
export type MapMessage = { type: 'ready' } | { type: 'add'; lng: number; lat: number } | { type: 'move'; index: number; lng: number; lat: number } | { type: 'failed' };

export interface MapPage {
  /** The public `pk.` token from /api/health. */
  token: string;
  /** A Mapbox style URL (MAP_STYLE in src/lib/theme.ts). */
  style: string;
  /** The route's line: the app's accent. */
  accent: string;
  /** The ground before the tiles load. */
  bg: string;
  /** Points added by a tap and moved by a drag; false shows a saved route as it is. */
  editable: boolean;
  /** Where it opens before there's a point. */
  centre?: LngLat;
}

/** JSON safe inside a <script>: no `</script>` or `<!--` can close it early. */
export const scriptJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

/** The map's whole page. Nothing in it is the member's own words; the token is public by design and restricted to the site's URL. */
export function routeMapHtml(p: MapPage): string {
  const css = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css`;
  const js = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js`;
  const colour = /^#[0-9a-fA-F]{6}$/.test(p.accent) ? p.accent : '#2F6B4F';
  const ground = /^#[0-9a-fA-F]{6}$/.test(p.bg) ? p.bg : '#E6E6EB';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="initial-scale=1.0,maximum-scale=1.0,user-scalable=no" />
<link href="${css}" rel="stylesheet" />
<style>
  html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: ${ground}; }
  .pt { border-radius: 50%; border: 3px solid #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.35); box-sizing: border-box; }
  .pt.start { width: 18px; height: 18px; background: ${colour}; }
  .pt.mid { width: 14px; height: 14px; background: #fff; border-color: ${colour}; }
  .pt.end { width: 18px; height: 18px; background: #111113; }
  .pt.edit { cursor: grab; }
  .mapboxgl-ctrl-attrib { font-size: 10px; }
</style>
</head>
<body>
<div id="map"></div>
<script src="${js}"></script>
<script>
(function () {
  var token = ${scriptJson(p.token)};
  var editable = ${p.editable ? 'true' : 'false'};
  var accent = ${scriptJson(colour)};
  var centre = ${scriptJson(p.centre ?? [-0.1276, 51.5072])};
  function post(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else if (window.parent && window.parent !== window) window.parent.postMessage(s, '*');
  }
  if (!token || typeof mapboxgl === 'undefined') { post({ type: 'failed' }); return; }
  mapboxgl.accessToken = token;
  var map;
  try {
    map = new mapboxgl.Map({ container: 'map', style: ${scriptJson(p.style)}, center: centre, zoom: 12,
      attributionControl: true, pitchWithRotate: false, dragRotate: false,
      // A tap adds a point, so a double tap would add two: zoom with a pinch or the scroll wheel.
      doubleClickZoom: !editable });
  } catch (e) { post({ type: 'failed' }); return; }
  map.touchZoomRotate.disableRotation();
  var loaded = false, pending = null, framed = false, markers = [], dragging = false, deferred = null;
  map.on('error', function (e) {
    // A token Mapbox refuses (wrong, or not allowed from this address) fails the style; tiles that miss later don't.
    if (!loaded) post({ type: 'failed' });
  });
  function line(c) { return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: c.length >= 2 ? c : [] } }; }
  function multi(c) { return { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: c || [] } }; }
  function layers() {
    if (map.getSource('route')) return;
    map.addSource('route', { type: 'geojson', data: line([]) });
    map.addSource('dashed', { type: 'geojson', data: multi([]) });
    map.addLayer({ id: 'route-casing', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#fff', 'line-width': 8 } });
    map.addLayer({ id: 'route-line', type: 'line', source: 'route', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': accent, 'line-width': 5 } });
    map.addLayer({ id: 'route-dashed', type: 'line', source: 'dashed', layout: { 'line-cap': 'butt' }, paint: { 'line-color': '#fff', 'line-width': 4, 'line-dasharray': [1, 1.5] } });
  }
  function marker(p, i, n) {
    var el = document.createElement('div');
    el.className = 'pt ' + (i === 0 ? 'start' : i === n - 1 ? 'end' : 'mid') + (editable ? ' edit' : '');
    var m = new mapboxgl.Marker({ element: el, anchor: 'center', draggable: editable }).setLngLat(p);
    if (editable) {
      m.on('dragstart', function () { dragging = true; });
      m.on('dragend', function () {
        dragging = false;
        var ll = m.getLngLat();
        post({ type: 'move', index: i, lng: ll.lng, lat: ll.lat });
        if (deferred) { var d = deferred; deferred = null; render(d); }
      });
      el.addEventListener('click', function (ev) { ev.stopPropagation(); });
    }
    return m.addTo(map);
  }
  function render(data) {
    layers();
    // The whole line, and over each leg no road was found for, white dashes: straight, never guessed (Etapa's).
    var track = data.track || [];
    map.getSource('route').setData(line(track));
    map.getSource('dashed').setData(multi(data.dashed));
    // While a point is held, the markers aren't rebuilt (that would drop the one under the finger).
    if (dragging) { deferred = data; return; }
    markers.forEach(function (m) { m.remove(); });
    var pts = data.points || [];
    markers = pts.map(function (p, i) { return marker(p, i, pts.length); });
    // Framed once, when there's a route; after that the member's own pan and zoom are theirs.
    if (!framed && pts.length >= 2) {
      var b = new mapboxgl.LngLatBounds();
      (track.length >= 2 ? track : pts).forEach(function (c) { b.extend(c); });
      map.fitBounds(b, { padding: 48, maxZoom: 15, duration: 0 });
      framed = true;
    }
  }
  map.on('load', function () {
    loaded = true;
    if (editable) map.on('click', function (e) { post({ type: 'add', lng: e.lngLat.lng, lat: e.lngLat.lat }); });
    if (pending) { render(pending); pending = null; }
    post({ type: 'ready' });
  });
  window.__setData = function (json) {
    var data; try { data = JSON.parse(json); } catch (e) { return; }
    if (!loaded) { pending = data; return; }
    render(data);
  };
  // On the web the screen posts the data in; in the apps it's injected.
  window.addEventListener('message', function (e) {
    var d = e.data;
    if (d && d.fohmRoute === 'data' && typeof d.json === 'string') window.__setData(d.json);
  });
})();
</script>
</body>
</html>`;
}

/** A message from the map, checked: anything else (another frame's, a malformed one) is null. */
export function readMessage(raw: unknown): MapMessage | null {
  let m: any = raw;
  if (typeof raw === 'string')
    try {
      m = JSON.parse(raw);
    } catch {
      return null;
    }
  if (!m || typeof m !== 'object') return null;
  const place = Number.isFinite(m.lng) && Number.isFinite(m.lat) && Math.abs(m.lng) <= 180 && Math.abs(m.lat) <= 90;
  if (m.type === 'ready' || m.type === 'failed') return { type: m.type };
  if (m.type === 'add' && place) return { type: 'add', lng: m.lng, lat: m.lat };
  if (m.type === 'move' && place && Number.isInteger(m.index) && m.index >= 0) return { type: 'move', index: m.index, lng: m.lng, lat: m.lat };
  return null;
}

/** Google's encoded polyline (precision 5), as Mapbox's static images take a path. */
export function encodePolyline(points: LngLat[]): string {
  let out = '';
  let lastLat = 0;
  let lastLng = 0;
  const encode = (v: number) => {
    let n = v < 0 ? ~(v << 1) : v << 1;
    let s = '';
    while (n >= 0x20) {
      s += String.fromCharCode((0x20 | (n & 0x1f)) + 63);
      n >>= 5;
    }
    return s + String.fromCharCode(n + 63);
  };
  for (const [lng, lat] of points) {
    const la = Math.round(lat * 1e5);
    const ln = Math.round(lng * 1e5);
    out += encode(la - lastLat) + encode(ln - lastLng);
    lastLat = la;
    lastLng = ln;
  }
  return out;
}

/**
 * A small picture of a saved route for its row: Mapbox's static image of the
 * style with the line drawn in the accent, framed to it. The line is thinned
 * to 60 points to keep the address short. Null without a token or a line.
 */
export function staticMapUrl(track: LngLat[], o: { token: string; style: string; accent: string; size?: number }): string | null {
  if (!o.token || track.length < 2) return null;
  const style = o.style.replace(/^mapbox:\/\/styles\//, '');
  const step = Math.max(1, Math.ceil(track.length / 60));
  const line = track.filter((_, i) => i % step === 0 || i === track.length - 1);
  const colour = o.accent.replace('#', '');
  const size = o.size ?? 112;
  return `https://api.mapbox.com/styles/v1/${style}/static/path-4+${colour}-1(${encodeURIComponent(encodePolyline(line))})/auto/${size}x${size}@2x?padding=12&attribution=false&logo=false&access_token=${encodeURIComponent(o.token)}`;
}
