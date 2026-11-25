/**
 * The route map's page (src/lib/routeMap.ts): one HTML document for the
 * apps' WebView and the web's iframe, Mapbox GL JS pinned, nothing able to
 * break out of its script, and only well-formed messages read back. Plain
 * Node: npm test.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAPBOX_GL_VERSION, encodePolyline, readMessage, routeMapHtml, scriptJson, staticMapUrl } from '../src/lib/routeMap';

const page = (over = {}) => routeMapHtml({ token: 'pk.abc', style: 'mapbox://styles/mapbox/outdoors-v12', accent: '#2F6B4F', bg: '#E6E6EB', editable: true, ...over });

test('the page pins Mapbox GL JS to an exact version, from Mapbox, script and styles alike', () => {
  assert.match(MAPBOX_GL_VERSION, /^\d+\.\d+\.\d+$/);
  const html = page();
  assert.ok(html.includes(`https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js`));
  assert.ok(html.includes(`https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css`));
  assert.ok(html.includes('"mapbox://styles/mapbox/outdoors-v12"'));
});

test('the route is drawn in the accent, and a straight leg dashed', () => {
  const html = page({ accent: '#AA3355' });
  assert.match(html, /'line-color': accent/);
  assert.ok(html.includes('"#AA3355"'));
  assert.match(html, /line-dasharray/);
  assert.ok(page({ accent: 'red;}</style>' }).includes('"#2F6B4F"'), 'a colour that isn’t a hex never reaches the page');
});

test('it talks back to both hosts: the WebView’s bridge and the iframe’s parent; data comes in either way', () => {
  const html = page();
  assert.match(html, /window\.ReactNativeWebView\.postMessage/);
  assert.match(html, /window\.parent\.postMessage/);
  assert.match(html, /window\.__setData = function/);
  assert.match(html, /d\.fohmRoute === 'data'/);
});

test('a map to look at adds no points; one to edit adds by a tap, moves by a drag, and a double tap never adds two', () => {
  assert.match(page(), /var editable = true/);
  assert.match(page({ editable: false }), /var editable = false/);
  assert.match(page(), /doubleClickZoom: !editable/);
});

test('nothing in the data can close the script early', () => {
  const s = scriptJson({ name: '</script><script>alert(1)</script>' });
  assert.ok(!s.includes('</script>'));
  assert.deepEqual(JSON.parse(s), { name: '</script><script>alert(1)</script>' });
  assert.ok(!page({ token: '</script>' }).includes('"</script>"'));
});

test('messages back are read only when they are well-formed', () => {
  assert.deepEqual(readMessage('{"type":"add","lng":-3.1,"lat":54.5}'), { type: 'add', lng: -3.1, lat: 54.5 });
  assert.deepEqual(readMessage({ type: 'move', index: 2, lng: 1, lat: 2 }), { type: 'move', index: 2, lng: 1, lat: 2 });
  assert.deepEqual(readMessage('{"type":"ready"}'), { type: 'ready' });
  assert.equal(readMessage('{"type":"add","lng":500,"lat":0}'), null);
  assert.equal(readMessage({ type: 'move', index: -1, lng: 1, lat: 2 }), null);
  assert.equal(readMessage('not json'), null);
  assert.equal(readMessage({ fohmRoute: 'data', json: '{}' }), null, 'the screen’s own message, echoed, is not the map’s');
});

test('a saved route’s small picture: Google’s polyline, the accent, the token; none without a token or a line', () => {
  assert.equal(encodePolyline([[-120.2, 38.5], [-120.95, 40.7], [-126.453, 43.252]]), '_p~iF~ps|U_ulLnnqC_mqNvxq`@');
  const url = staticMapUrl([[0, 0], [0.01, 0.01]], { token: 'pk.abc', style: 'mapbox://styles/mapbox/outdoors-v12', accent: '#2F6B4F' })!;
  assert.match(url, /^https:\/\/api\.mapbox\.com\/styles\/v1\/mapbox\/outdoors-v12\/static\/path-4\+2F6B4F-1\(/);
  assert.match(url, /\/auto\/112x112@2x/);
  assert.match(url, /access_token=pk\.abc/);
  assert.equal(staticMapUrl([[0, 0], [1, 1]], { token: '', style: 's', accent: '#000000' }), null);
  assert.equal(staticMapUrl([[0, 0]], { token: 'pk.a', style: 's', accent: '#000000' }), null);
});
