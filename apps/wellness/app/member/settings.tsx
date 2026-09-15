import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { api } from "../../src/api/client";
import { isoDate, useAction, useApi } from "../../src/api/hooks";
import type { Targets } from "../../src/api/types";
import { Button, Card, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

const ACTIVITY = [
  { id: "sedentary", label: "Sedentary" },
  { id: "lightly_active", label: "Lightly active" },
  { id: "moderately_active", label: "Moderately active" },
  { id: "very_active", label: "Very active" },
  { id: "extra_active", label: "Extra active" },
];
const GOALS = [
  { id: "fat_loss", label: "Fat loss" },
  { id: "maintain", label: "Maintain" },
  { id: "muscle_gain", label: "Muscle gain" },
  { id: "recomposition", label: "Recomposition" },
  { id: "endurance", label: "Endurance" },
  { id: "general_health", label: "General health" },
];

export default function MemberSettings() {
  const { user, theme, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const targets = useApi<Targets>("/v1/me/targets");
  const profile = useApi<{ user: Record<string, unknown> }>("/v1/auth/me");
  const sports = useApi<{ items: { id: string; label: string; slug: string }[] }>("/v1/sport-profiles");
  const { busy, error, run } = useAction();

  const [weight, setWeight] = useState("");
  const [editing, setEditing] = useState(false);

  const u = profile.data?.user as { sex?: string; heightCm?: string; dateOfBirth?: string; activityLevel?: string; goalType?: string; sportProfileId?: string } | undefined;

  const patch = async (body: Record<string, unknown>) => {
    const ok = await run(() => api("/v1/me", { method: "PATCH", body }));
    if (ok) { profile.refetch(); targets.refetch(); }
  };

  const saveWeight = async () => {
    const kg = Number(weight);
    if (!Number.isFinite(kg) || kg <= 0) return;
    const ok = await run(() => api("/v1/logs/body-metrics", { method: "POST", body: { date: isoDate(new Date()), weightKg: kg } }));
    if (ok) { setWeight(""); targets.refetch(); }
  };

  const chip = (active: boolean) => ({
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1,
    borderColor: active ? theme.accent : theme.line,
    backgroundColor: active ? theme.accent + "14" : theme.card,
  });

  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}>
        <Text style={{ ...typo.display, color: theme.ink, marginBottom: space.lg }}>Settings</Text>

        <Card theme={theme} style={{ marginBottom: space.lg, flexDirection: "row", alignItems: "center", gap: space.md }}>
          <View style={{ width: 52, height: 52, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ ...typo.title, color: theme.accent }}>{user?.name?.[0]?.toUpperCase() ?? "?"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ ...typo.heading, color: theme.ink }}>{user?.name}</Text>
            <Text style={{ ...typo.caption, color: theme.muted }}>{user?.email}</Text>
          </View>
        </Card>

        {error && <Card theme={theme} style={{ marginBottom: space.md, borderColor: theme.danger }}><Text style={{ ...typo.body, color: theme.danger }}>{error}</Text></Card>}

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Daily targets</Text>
        <Card theme={theme} style={{ marginBottom: space.lg }}>
          {targets.loading && !targets.data ? (
            <ActivityIndicator color={theme.accent} />
          ) : !targets.data?.ready ? (
            <>
              <Text style={{ ...typo.body, color: theme.inkSoft }}>Still needed to calculate your targets:</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: space.sm }}>
                {targets.data?.missing?.map((m) => <Pill key={m} theme={theme} label={m} tone={theme.warning} />)}
              </View>
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                {[
                  { k: "Calories", v: targets.data.targets!.calories.toLocaleString() },
                  { k: "Protein", v: `${targets.data.targets!.proteinG}g` },
                  { k: "Carbs", v: `${targets.data.targets!.carbsG}g` },
                  { k: "Fat", v: `${targets.data.targets!.fatG}g` },
                ].map((s) => (
                  <View key={s.k} style={{ alignItems: "center", flex: 1 }}>
                    <Text style={{ ...typo.heading, color: theme.ink }}>{s.v}</Text>
                    <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{s.k}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: theme.line }}>
                TDEE {targets.data.basis!.tdeeKcal.toLocaleString()} kcal at {targets.data.basis!.weightKg}kg ·{" "}
                {targets.data.targets!.basis === "sport_profile"
                  ? `${targets.data.basis!.sportProfile?.label} prescription`
                  : "goal-based split"}
              </Text>
            </>
          )}
        </Card>

        <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Log today's weight</Text>
        <Card theme={theme} style={{ marginBottom: space.lg, flexDirection: "row", gap: space.sm, alignItems: "center" }}>
          <TextInput
            style={{ flex: 1, backgroundColor: theme.bg, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 12, color: theme.ink }}
            placeholder="kg" placeholderTextColor={theme.muted} keyboardType="decimal-pad" value={weight} onChangeText={setWeight}
          />
          <Pressable onPress={saveWeight} disabled={busy || !weight} style={{ paddingHorizontal: space.lg, paddingVertical: 13, borderRadius: radius.sm, backgroundColor: weight ? theme.accent : theme.cardAlt }}>
            <Text style={{ ...typo.heading, color: weight ? "#FFFFFF" : theme.muted }}>Save</Text>
          </Pressable>
        </Card>

        <Pressable onPress={() => setEditing(!editing)}>
          <Card theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center" }}>
            <Feather name="user" size={18} color={theme.inkSoft} />
            <Text style={{ ...typo.body, color: theme.ink, flex: 1, marginLeft: space.md }}>Profile and goals</Text>
            <Feather name={editing ? "chevron-up" : "chevron-down"} size={18} color={theme.muted} />
          </Card>
        </Pressable>

        {editing && (
          <Card theme={theme} style={{ marginBottom: space.lg }}>
            <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>SEX</Text>
            <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.lg }}>
              {["male", "female"].map((s) => (
                <Pressable key={s} onPress={() => patch({ sex: s })} style={chip(u?.sex === s)}>
                  <Text style={{ ...typo.caption, color: u?.sex === s ? theme.accent : theme.inkSoft, textTransform: "capitalize", fontWeight: "600" }}>{s}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>ACTIVITY LEVEL</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg }}>
              {ACTIVITY.map((a) => (
                <Pressable key={a.id} onPress={() => patch({ activityLevel: a.id })} style={chip(u?.activityLevel === a.id)}>
                  <Text style={{ ...typo.caption, color: u?.activityLevel === a.id ? theme.accent : theme.inkSoft, fontWeight: "600" }}>{a.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>GOAL</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginBottom: space.lg }}>
              {GOALS.map((g) => (
                <Pressable key={g.id} onPress={() => patch({ goalType: g.id })} style={chip(u?.goalType === g.id)}>
                  <Text style={{ ...typo.caption, color: u?.goalType === g.id ? theme.accent : theme.inkSoft, fontWeight: "600" }}>{g.label}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ ...typo.caption, color: theme.muted, marginBottom: 4 }}>SPORT OF FOCUS</Text>
            <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>
              Replaces the generic macro split with that sport's g/kg prescription.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
              <Pressable onPress={() => patch({ sportProfileId: null })} style={chip(!u?.sportProfileId)}>
                <Text style={{ ...typo.caption, color: !u?.sportProfileId ? theme.accent : theme.inkSoft, fontWeight: "600" }}>None</Text>
              </Pressable>
              {sports.data?.items.map((s) => (
                <Pressable key={s.id} onPress={() => patch({ sportProfileId: s.id })} style={chip(u?.sportProfileId === s.id)}>
                  <Text style={{ ...typo.caption, color: u?.sportProfileId === s.id ? theme.accent : theme.inkSoft, fontWeight: "600" }}>{s.label}</Text>
                </Pressable>
              ))}
            </View>
          </Card>
        )}

        <View style={{ marginTop: space.lg }}>
          <Button theme={theme} label="Sign out" variant="ghost" onPress={signOut} />
        </View>
      </ScrollView>
    </Screen>
  );
}
