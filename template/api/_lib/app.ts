/** The app's name on the server (emails, the AI assistant). fohm-scaffold writes it; keep it in step with src/lib/brand.ts. */
export const APP_NAME = 'Starter';
/** The public site, for links in emails. Vercel sets VERCEL_PROJECT_PRODUCTION_URL; SITE_URL overrides it. */
export const siteUrl = () =>
  (process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '')).replace(/\/$/, '');
