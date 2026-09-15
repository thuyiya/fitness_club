import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../src/state/auth";

/**
 * Entry route. It only renders a spinner --- the redirect itself belongs to
 * AuthGate in the root layout, which stays mounted across navigation.
 */
export default function Index() {
  const { theme } = useAuth();
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
      <ActivityIndicator color={theme.accent} />
    </View>
  );
}
