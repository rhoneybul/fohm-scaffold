/** The app's name on the server (emails, the AI assistant). fohm-scaffold writes it; keep it in step with src/lib/brand.ts. */
export const APP_NAME = 'Starter';
/** The app's accent, for emails. fohm-scaffold writes it; keep it in step with C.accent in src/lib/theme.ts. */
export const ACCENT = '#2F6B4F';
/** The iOS and Android app id, for links that open the apps (Tapp). fohm-scaffold writes it; keep it in step with app.json. */
export const BUNDLE_ID = 'com.example.starter';
/** The public site, for links in emails. Vercel sets VERCEL_PROJECT_PRODUCTION_URL; SITE_URL overrides it. */
export const siteUrl = () =>
  (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')).replace(/\/$/, '');
