// Expo reads app.json, then this. It adds only what comes from the build's
// environment (EAS → Environment variables); a build without them is app.json
// as it is.

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

module.exports = ({ config }) => withTappLinkDomain(config, process.env.TAPP_LINK_DOMAIN);
module.exports.withTappLinkDomain = withTappLinkDomain;
