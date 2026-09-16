import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { API_URL, ApiError } from "../src/api/client";
import { Button, Screen } from "../src/components/ui";
import { useAuth, type Role } from "../src/state/auth";
import { member, radius, space, type as typo } from "../src/theme/tokens";

export default function SignIn() {
  const { signIn, register } = useAuth();
  const insets = useSafeAreaInsets();
  const theme = member; // Pre-auth there is no role yet, so use the light palette.

  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo-password-123");
  const [role, setRole] = useState<Role>("member");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "in") await signIn(email, password);
      else await register({ name, email, password, role });
    } catch (e) {
      // Name the address that failed. "Could not connect" with no URL is
      // undebuggable on a device, where the host is resolved at runtime.
      setError(
        e instanceof ApiError
          ? e.message
          : `Could not reach the API at ${API_URL}. Check it is running and that this device is on the same network.`,
      );
    } finally {
      setBusy(false);
    }
  };

  const field = {
    backgroundColor: theme.card,
    borderColor: theme.line,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: 14,
    fontSize: 15,
    color: theme.ink,
    marginBottom: space.md,
  };

  return (
    <Screen theme={theme}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space.xl, paddingTop: insets.top + 60, flexGrow: 1, justifyContent: "center" }}>
          <Text style={{ ...typo.display, color: theme.ink }}>Wellness</Text>
          <Text style={{ ...typo.body, color: theme.muted, marginTop: 4, marginBottom: space.xl }}>
            {mode === "in" ? "Sign in to continue" : "Create your account"}
          </Text>

          {mode === "up" && (
            <TextInput style={field} placeholder="Full name" placeholderTextColor={theme.muted} value={name} onChangeText={setName} />
          )}
          <TextInput
            style={field}
            placeholder="Email"
            placeholderTextColor={theme.muted}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={field}
            placeholder="Password"
            placeholderTextColor={theme.muted}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          {mode === "up" && (
            <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.lg }}>
              {(["member", "coach"] as Role[]).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRole(r)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: radius.sm,
                    borderWidth: 1,
                    alignItems: "center",
                    borderColor: role === r ? theme.accent : theme.line,
                    backgroundColor: role === r ? theme.accent + "14" : theme.card,
                  }}
                >
                  <Text style={{ ...typo.heading, color: role === r ? theme.accent : theme.inkSoft, textTransform: "capitalize" }}>{r}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {error && (
            <Text style={{ ...typo.body, color: theme.danger, marginBottom: space.md }}>{error}</Text>
          )}

          <Button theme={theme} label={mode === "in" ? "Sign in" : "Create account"} onPress={submit} busy={busy} />

          <Text style={{ ...typo.caption, color: theme.muted, textAlign: "center", marginTop: space.md }}>
            API: {API_URL}
          </Text>

          <Pressable onPress={() => { setMode(mode === "in" ? "up" : "in"); setError(null); }} style={{ marginTop: space.lg, alignItems: "center" }}>
            <Text style={{ ...typo.body, color: theme.inkSoft }}>
              {mode === "in" ? "No account? Create one" : "Already have an account? Sign in"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
