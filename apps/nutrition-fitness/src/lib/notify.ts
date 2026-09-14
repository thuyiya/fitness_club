/**
 * Lightweight local-notification helpers.
 *
 * `expo-notifications` is a native module — absent on web/tests and before the
 * app is rebuilt with the dependency — so we load it lazily and no-op when it's
 * missing. We only use local notifications (no push server).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Notifications: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  Notifications = require('expo-notifications');
} catch {
  Notifications = null;
}

/** Request notification permission if we don't already have it. Safe to call repeatedly. */
export async function ensureNotifyPermission(): Promise<boolean> {
  if (!Notifications) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const req = await Notifications.requestPermissionsAsync();
    return !!req.granted;
  } catch {
    return false;
  }
}

/** Post a one-off "your coach is ready" notification once the model finishes downloading. */
export async function notifyCoachReady(): Promise<void> {
  if (!Notifications) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted) return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Your coach is ready',
        body: 'Tap to start chatting — it runs fully on your phone.',
      },
      trigger: null, // deliver immediately
    });
  } catch {
    /* ignore */
  }
}
