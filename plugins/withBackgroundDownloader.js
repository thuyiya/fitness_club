/**
 * Expo config plugin for @kesha-antonov/react-native-background-downloader.
 *
 * The library needs native wiring that Expo prebuild would otherwise not add:
 *   • iOS   — the AppDelegate must forward `handleEventsForBackgroundURLSession`
 *             to the library so an `NSURLSession` background download can be
 *             finished after the OS relaunches the app.
 *   • Android — network / wake-lock / foreground-service permissions so the
 *             download can keep running when the app is backgrounded or closed.
 *
 * Because we prebuild (managed workflow, no hand-edited native projects), this
 * runs on every `expo prebuild`, so the wiring survives a clean regenerate.
 */
const {
  withAppDelegate,
  withAndroidManifest,
  AndroidConfig,
} = require('@expo/config-plugins');

const IMPORT = '#import <RNBackgroundDownloader.h>';
const HANDLER = `
- (void)application:(UIApplication *)application handleEventsForBackgroundURLSession:(NSString *)identifier completionHandler:(void (^)(void))completionHandler {
  [RNBackgroundDownloader setCompletionHandlerWithIdentifier:identifier completionHandler:completionHandler];
}
`;

function withIosAppDelegate(config) {
  return withAppDelegate(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Add the import once, right after the AppDelegate header import.
    if (!contents.includes(IMPORT)) {
      contents = contents.replace(
        /#import "AppDelegate.h"/,
        `#import "AppDelegate.h"\n${IMPORT}`,
      );
    }

    // Add the completion-handler method once, before the final @end.
    if (!contents.includes('handleEventsForBackgroundURLSession')) {
      const lastEnd = contents.lastIndexOf('@end');
      if (lastEnd !== -1) {
        contents = contents.slice(0, lastEnd) + HANDLER + '\n' + contents.slice(lastEnd);
      }
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

const ANDROID_PERMISSIONS = [
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.WAKE_LOCK',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_DATA_SYNC',
];

function withAndroidPermissions(config) {
  return withAndroidManifest(config, (cfg) => {
    ANDROID_PERMISSIONS.forEach((permission) => {
      AndroidConfig.Permissions.ensurePermission(cfg.modResults, permission);
    });
    return cfg;
  });
}

module.exports = function withBackgroundDownloader(config) {
  config = withIosAppDelegate(config);
  config = withAndroidPermissions(config);
  return config;
};
