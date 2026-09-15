import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../src/state/auth";
import { member } from "../src/theme/tokens";

/**
 * The single routing authority.
 *
 * This lives in the root layout rather than on a screen because it has to
 * survive navigation: a redirect that runs in the effect of the entry screen
 * stops watching the moment you navigate away from it, so signing in updates
 * the auth state with nothing left mounted to react to it, and you sit on the
 * login form looking at a successful 200.
 */
function AuthGate() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const root = segments[0];
    const onAuthScreen = root === "sign-in";

    if (!user && !onAuthScreen) {
      router.replace("/sign-in");
      return;
    }
    // Signed in but sitting on the login form or the bare entry route: send
    // them to the tab set for their role.
    if (user && (onAuthScreen || root === undefined)) {
      router.replace(`/${user.role}`);
      return;
    }
    // Signed in but inside someone else's section --- a stale deep link, or a
    // role that changed while the session was open.
    if (user && (root === "member" || root === "coach" || root === "admin") && root !== user.role) {
      router.replace(`/${user.role}`);
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: member.bg }}>
        <ActivityIndicator color={member.accent} />
      </View>
    );
  }
  return <Slot />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        <AuthGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
