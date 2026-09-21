import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { api } from "../src/api/client";
import { AuthProvider, useAuth } from "../src/state/auth";
import { UnitsProvider } from "../src/state/units";
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

  /**
   * The profile check, stored WITH the user it answers for.
   *
   * A bare boolean cannot work here: both effects run after the same render,
   * so the routing effect closes over the previous user's answer and redirects
   * before the reset has applied. Keying it to the id makes "we have not asked
   * about this person yet" a fact about the data rather than a race.
   */
  const [check, setCheck] = useState<{ userId: string; needs: boolean } | null>(null);
  useEffect(() => {
    if (!user || user.role !== "member") return;
    if (check?.userId === user.id) return;
    let cancelled = false;
    api<{ ready: boolean }>("/v1/me/targets")
      .then((r) => { if (!cancelled) setCheck({ userId: user.id, needs: !r.ready }); })
      .catch(() => { if (!cancelled) setCheck({ userId: user.id, needs: false }); });
    return () => { cancelled = true; };
  }, [user?.id, user?.role, check?.userId]);

  const needsOnboarding: boolean | null =
    !user || user.role !== "member" ? false : check?.userId === user.id ? check.needs : null;

  useEffect(() => {
    if (loading) return;
    if (user?.role === "member" && needsOnboarding === null) return;

    const root = segments[0];
    const onAuthScreen = root === "sign-in";
    if (root === "onboarding") return; // let them finish or skip

    if (!user && !onAuthScreen) {
      router.replace("/sign-in");
      return;
    }
    // Signed in but sitting on the login form or the bare entry route: send
    // them to the tab set for their role.
    if (user && (onAuthScreen || root === undefined)) {
      // A member whose profile cannot produce a calorie target goes through
      // onboarding first --- otherwise Home greets them with empty rings and
      // no way to understand why.
      if (user.role === "member" && needsOnboarding === true) router.replace("/onboarding");
      else router.replace(`/${user.role}`);
      return;
    }
    // Signed in but inside someone else's section --- a stale deep link, or a
    // role that changed while the session was open.
    if (user && (root === "member" || root === "coach" || root === "admin") && root !== user.role) {
      router.replace(`/${user.role}`);
    }
    // Leaving onboarding is allowed; being sent back into it is not.
  }, [user, loading, segments, router, needsOnboarding]);

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
      <UnitsProvider>
        <AuthProvider>
        <StatusBar style="auto" />
        <AuthGate />
        </AuthProvider>
      </UnitsProvider>
    </SafeAreaProvider>
  );
}
