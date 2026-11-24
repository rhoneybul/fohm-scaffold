/**
 * Expo config plugin: builds Tapp's two Swift pods as static frameworks.
 *
 * Tapp's React Native SDK (com-tapp-so-sdk: src/lib/tapp.ts) is
 * Objective-C++ that imports its Swift pods' generated headers
 * framework-style (`<Tapp/Tapp-Swift.h>`, `<TappNetworking/TappNetworking-Swift.h>`).
 * Expo builds pods as static libraries, where those paths don't exist, and
 * the iOS build stops with "'Tapp/Tapp-Swift.h' file not found". Building
 * just these two pods as static frameworks puts each header where it's
 * looked for and leaves every other pod as it was.
 *
 * It adds a pre_install hook to the generated Podfile (Expo's has none).
 */
const { withDangerousMod } = require('expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MARKER = '# [withTappStaticFrameworks]';
const TAPP_PODS = ['Tapp', 'Tapp-Networking'];

const PRE_INSTALL = `
  ${MARKER} Patched by plugins/withTappStaticFrameworks.js
  pre_install do |installer|
    installer.pod_targets.each do |pod|
      next unless ${JSON.stringify(TAPP_PODS)}.include?(pod.name)
      def pod.build_type
        Pod::BuildType.static_framework
      end
    end
  end
`;

/** The Podfile with the hook added before post_install; unchanged if it's there already. */
function addTappStaticFrameworks(podfile) {
  if (podfile.includes(MARKER)) return podfile;
  if (/^\s*pre_install do/m.test(podfile)) throw new Error('withTappStaticFrameworks: the Podfile already has a pre_install hook; merge the Tapp rule into it.');
  const postInstall = podfile.search(/^\s*post_install do \|installer\|/m);
  if (postInstall === -1) throw new Error('withTappStaticFrameworks: no post_install hook found in the Podfile.');
  return podfile.slice(0, postInstall) + PRE_INSTALL + podfile.slice(postInstall);
}

function withTappStaticFrameworks(config) {
  return withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      if (fs.existsSync(podfile)) fs.writeFileSync(podfile, addTappStaticFrameworks(fs.readFileSync(podfile, 'utf8')));
      return cfg;
    },
  ]);
}

module.exports = withTappStaticFrameworks;
module.exports.addTappStaticFrameworks = addTappStaticFrameworks;
