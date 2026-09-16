const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("node:fs");
const path = require("node:path");

/**
 * Raises the iOS deployment target on EVERY pod target.
 *
 * expo-build-properties sets the Podfile platform and the main pod targets, but
 * not resource-bundle targets --- RNCAsyncStorage-RNCAsyncStorage_resources
 * still emits 13.4, and Xcode 27 refuses to build anything below 15.0. Patching
 * the Podfile by hand does not survive, because `expo prebuild` regenerates it,
 * so the fix has to be a plugin that re-applies on every prebuild.
 */
module.exports = function withMinIosDeploymentTarget(config, { deploymentTarget = "15.1" } = {}) {
  return withDangerousMod(config, [
    "ios",
    (cfg) => {
      const podfile = path.join(cfg.modRequest.platformProjectRoot, "Podfile");
      let contents = fs.readFileSync(podfile, "utf8");
      const marker = "# min-ios-deployment-target";

      if (!contents.includes(marker)) {
        const hook = `
    ${marker}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        current = build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']
        if current.nil? || Gem::Version.new(current) < Gem::Version.new('${deploymentTarget}')
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${deploymentTarget}'
        end
      end
    end
`;
        contents = contents.replace(/(post_install do \|installer\|\n)/, `$1${hook}`);
        fs.writeFileSync(podfile, contents);
      }
      return cfg;
    },
  ]);
};
