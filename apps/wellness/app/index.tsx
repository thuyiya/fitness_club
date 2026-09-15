import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../src/state/auth";

/**
 * The only routing decision in the app: one binary, three destinations.
 * Admin screens are designed at 390x844 like the others, so admin is a mobile
 * persona too --- a role-based tab set, not a separate web build.
 */
export default function Gate() {
  const { user, loading, theme } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/sign-in");
    else router.replace(`/${user.role}`);
  }, [user, loading]);

  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
      <ActivityIndicator color={theme.accent} />
    </View>
  );
}
