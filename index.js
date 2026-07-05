// Custom entry point.
//
// The breathing / journey animations ARE the experience here, so they must play
// even when the OS "Reduce Motion" accessibility setting is on. On a real device
// with Reduce Motion enabled, Reanimated otherwise snaps every default animation
// straight to its end value (simulators have the setting off by default, which is
// why this only reproduced on device).
//
// This is fixed centrally by a one-line patch to react-native-reanimated — see
// patches/react-native-reanimated+3.10.1.patch, re-applied on every install via
// the `postinstall` script — which forces reduced-motion OFF for default
// animations. (Setting the global below alone can't win: the native module
// overwrites it from the OS setting during install, right before Reanimated
// caches the value.) The global is kept as a harmless secondary hint.
global._REANIMATED_IS_REDUCED_MOTION = false;

require('expo-router/entry');
