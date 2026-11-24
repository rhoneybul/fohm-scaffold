// Metro, Expo's bundler, with one change: an import ending in `.js` that names
// a TypeScript file resolves to it. Code the API shares with the app (in
// src/lib) writes its relative imports with `.js`, because Vercel runs the API
// as compiled ES modules, which need the ending (AGENTS.md, Code the API and
// the app share; tests/api-build.test.ts).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const IN_PACKAGES = `${path.sep}node_modules${path.sep}`;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Only the app's own files: packages resolve as they were published (mapping
  // theirs too broke AsyncStorage, whose own `.js` imports name real files).
  if (/^\.{1,2}\/.*\.js$/.test(moduleName) && !context.originModulePath.includes(IN_PACKAGES)) {
    try {
      return context.resolveRequest(context, moduleName.replace(/\.js$/, ''), platform);
    } catch {
      // Not a TypeScript file: resolve the name as written.
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
