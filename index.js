// Custom entry point.
//
// Force Reanimated to ignore the OS "Reduce Motion" accessibility setting. The
// breathing orb and journey animations ARE the experience here, not decoration,
// so they must always play. Reanimated 3.10 reads this global exactly once when
// its animation module first evaluates, so we set it here — before anything
// imports 'react-native-reanimated' — then hand off to the normal expo-router
// entry. (This is why animations froze on real devices with Reduce Motion on
// while running fine in the simulator, where the setting is off by default.)
global._REANIMATED_IS_REDUCED_MOTION = false;

require('expo-router/entry');
