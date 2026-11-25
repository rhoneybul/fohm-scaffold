/**
 * Maps (Mapbox): off until MAPBOX_TOKEN is set in Vercel, a public `pk.`
 * token restricted in Mapbox to the site's URL. The app draws its maps with
 * it (read from /api/health) and api/route.ts snaps routes to the roads with
 * it. docs/ROUTES.md.
 */
const mapsToken = () => (process.env.MAPBOX_TOKEN ?? '').trim();

/**
 * What /api/health tells the app: the token, only when it's a public one
 * (`pk.`). A secret token (`sk.`) set by mistake is never sent to a browser;
 * maps stay off until a public one is set.
 */
export function mapsPublicConfig() {
  const token = mapsToken();
  if (!token) return null;
  if (!token.startsWith('pk.')) {
    console.warn('maps: MAPBOX_TOKEN isn’t a public token (pk.), so maps stay off');
    return null;
  }
  return { token };
}

