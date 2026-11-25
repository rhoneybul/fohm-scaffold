// Expo reads app.json, then this. It adds only what comes from the build's
// environment (EAS → Environment variables) and the Google iOS client ID in
// src/lib/brand.ts; a build without them is app.json as it is.

const fs = require('node:fs');
const path = require('node:path');

/**
 * Tapp (src/lib/tapp.ts): a tap on a Tapp link opens the installed app when
 * the build carries the app's Tapp link domain (TAPP_LINK_DOMAIN, e.g.
 * yourapp.tapp.so). Tapp hosts the apple-app-site-association and
 * assetlinks.json files for it. Links that install first and open later work
 * either way.
 */
function withTappLinkDomain(config, domain) {
  if (!domain) return config;
  return {
    ...config,
    ios: { ...config.ios, associatedDomains: [...(config.ios?.associatedDomains ?? []), `applinks:${domain}`] },
    android: {
      ...config.android,
      intentFilters: [...(config.android?.intentFilters ?? []), { action: 'VIEW', autoVerify: true, data: [{ scheme: 'https', host: domain }], category: ['BROWSABLE', 'DEFAULT'] }],
    },
  };
}

/**
 * Push on Android (FCM): the app's google-services.json, which Set up app
 * (.github/workflows/setup.yml) fetches from the shared Firebase project and
 * stores in EAS as the file variable GOOGLE_SERVICES_JSON. EAS gives the build
 * its path; without it the build has no FCM and push stays off on Android.
 */
function withGoogleServices(config, file) {
  if (!file) return config;
  return { ...config, android: { ...config.android, googleServicesFile: file } };
}

/**
 * Google sign-in in the iPhone app (docs/SIGN-IN.md): Google returns to the
 * iOS client ID reversed as a URL scheme, which the sign-in module's config
 * plugin writes. The ID is `APP.google.iosClientId` in src/lib/brand.ts (read
 * from the file: this runs in plain Node); without one the plugin stays out,
 * as it refuses to run without a scheme, and the app offers no Google button.
 */
function googleIosClientId(file = path.join(__dirname, 'src/lib/brand.ts')) {
  try {
    return fs.readFileSync(file, 'utf8').match(/iosClientId:\s*'([^']*)'/)?.[1] ?? '';
  } catch {
    return '';
  }
}

function withGoogleSignIn(config, iosClientId) {
  const id = (iosClientId ?? '').trim().replace(/\.apps\.googleusercontent\.com$/, '');
  if (!id) return config;
  return { ...config, plugins: [...(config.plugins ?? []), ['@react-native-google-signin/google-signin', { iosUrlScheme: `com.googleusercontent.apps.${id}` }]] };
}

module.exports = ({ config }) => withGoogleSignIn(withGoogleServices(withTappLinkDomain(config, process.env.TAPP_LINK_DOMAIN), process.env.GOOGLE_SERVICES_JSON), googleIosClientId());
module.exports.withTappLinkDomain = withTappLinkDomain;
module.exports.withGoogleServices = withGoogleServices;
module.exports.withGoogleSignIn = withGoogleSignIn;
module.exports.googleIosClientId = googleIosClientId;
