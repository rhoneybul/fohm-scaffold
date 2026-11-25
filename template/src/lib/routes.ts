/**
 * Route planning's logic for the app (docs/ROUTES.md): the points, legs,
 * snapping, thinning and distances, shared with the API. It lives in
 * api/_lib/routes.ts so Vercel runs it as the API's own ES module; the app
 * and the tests read it from here.
 */
export * from '../../api/_lib/routes';
