/**
 * Two separate places in the generated native iOS project pin a deployment
 * target below what current Xcode's SDKs support (15.0+), and neither is
 * covered by expo-build-properties:
 *
 *  1. react_native_post_install (called from the generated Podfile) resets
 *     every Pod target's IPHONEOS_DEPLOYMENT_TARGET down to React Native's
 *     hardcoded minimum (13.4), overriding the Podfile's own `platform :ios`
 *     line.
 *  2. The Xcode project's root-level (project, not per-target) build
 *     configurations default to an old deployment target from the RN
 *     template; expo-build-properties only overrides the app target itself.
 *
 * Because we prebuild (managed workflow, no hand-edited native projects), a
 * one-off edit to ios/Podfile or the .pbxproj does not survive
 * `expo prebuild` (including the prebuild EAS Build runs internally, local or
 * cloud). This plugin re-applies both fixes on every prebuild instead.
 */
const { withPodfile, withXcodeProject } = require('@expo/config-plugins');

const MARKER = '# nutrition-fitness: force pod deployment targets back up';

function withPodfileDeploymentTargetFix(config, deploymentTarget) {
  return withPodfile(config, (cfg) => {
    let contents = cfg.modResults.contents;

    if (!contents.includes(MARKER)) {
      const snippet = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |build_config|
        if build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < ${parseFloat(deploymentTarget)}
          build_config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '${deploymentTarget}'
        end
      end
    end
`;
      const postInstallCall = /react_native_post_install\([^)]*\)\s*\n/;
      if (postInstallCall.test(contents)) {
        contents = contents.replace(postInstallCall, (match) => match + snippet);
      } else {
        contents = contents.replace(
          /\nend\s*$/,
          `\n  post_install do |installer|\n${snippet}\n  end\nend\n`,
        );
      }
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

function withXcodeProjectDeploymentTargetFix(config, deploymentTarget) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const threshold = parseFloat(deploymentTarget);
    const configurations = project.pbxXCBuildConfigurationSection();

    Object.values(configurations).forEach((entry) => {
      const current = entry && entry.buildSettings && entry.buildSettings.IPHONEOS_DEPLOYMENT_TARGET;
      if (current !== undefined && parseFloat(current) < threshold) {
        entry.buildSettings.IPHONEOS_DEPLOYMENT_TARGET = deploymentTarget;
      }
    });

    return cfg;
  });
}

module.exports = function withIOSDeploymentTargetFix(config, { deploymentTarget = '15.0' } = {}) {
  config = withPodfileDeploymentTargetFix(config, deploymentTarget);
  config = withXcodeProjectDeploymentTargetFix(config, deploymentTarget);
  return config;
};
