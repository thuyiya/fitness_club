import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { api } from "../api/client";
import { isoDate, useAction } from "../api/hooks";
import { BottomSheet } from "./BottomSheet";
import { radius, space, type as typo, type Theme } from "../theme/tokens";

/**
 * Goal templates. Members think "drink more water", not "hydration_ml >= 2500",
 * so the metric and unit are carried by the template and the member only picks
 * a number. A free-text metric box would produce goals nothing can evaluate.
 */
const TEMPLATES = [
  { metric: "protein_g", title: "Hit my protein target", unit: "g", suggested: 150, icon: "award" as const },
  { metric: "hydration_ml", title: "Drink enough water", unit: "ml", suggested: 2500, icon: "droplet" as const },
  { metric: "sessions", title: "Train this often", unit: "sessions", suggested: 1, icon: "repeat" as const },
  { metric: "active_minutes", title: "Stay active", unit: "min", suggested: 45, icon: "activity" as const },
  { metric: "steps", title: "Walk more", unit: "steps", suggested: 8000, icon: "trending-up" as const },
  { metric: "calories", title: "Stay near my calories", unit: "kcal", suggested: 2200, icon: "zap" as const },
];

export function GoalSheet({
  theme, visible, onClose, onCreated, memberId, memberName,
}: {
  theme: Theme; visible: boolean; onClose: () => void; onCreated: () => void;
  /** Set when a coach is assigning to a member rather than a member self-setting. */
  memberId?: string; memberName?: string;
}) {
  const [picked, setPicked] = useState<(typeof TEMPLATES)[number] | null>(null);
  const [value, setValue] = useState("");
  const [period, setPeriod] = useState<"daily" | "weekly">("daily");
  const { busy, error, run } = useAction();

  const reset = () => { setPicked(null); setValue(""); setPeriod("daily"); };

  const create = async () => {
    if (!picked) return;
    const target = Number(value || picked.suggested);
    const ok = await run(() =>
      api("/v1/goals", {
        method: "POST",
        body: {
          ...(memberId ? { memberId } : {}),
          title: `${picked.title.replace(/^Hit my |^Stay near my |^Stay |^Drink |^Walk |^Train /, (m) => m)} — ${target}${picked.unit === "sessions" ? "" : picked.unit}`,
          metric: picked.metric,
          targetValue: target,
          unit: picked.unit,
          period,
          startDate: isoDate(new Date()),
        },
      }),
    );
    if (ok) { reset(); onCreated(); onClose(); }
  };

  return (
    <BottomSheet
      theme={theme}
      visible={visible}
      onClose={() => { reset(); onClose(); }}
      heightRatio={0.62}
    >
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.md }}>
        {picked && (
          <Pressable onPress={() => setPicked(null)} hitSlop={12} style={{ marginRight: 6 }}>
            <Feather name="chevron-left" size={22} color={theme.inkSoft} />
          </Pressable>
        )}
        <Text style={{ ...typo.title, color: theme.ink, flex: 1 }}>
          {memberName ? `Goal for ${memberName}` : picked ? picked.title : "New goal"}
        </Text>
      </View>

      {error && <Text style={{ ...typo.body, color: theme.danger, marginBottom: space.md }}>{error}</Text>}

      {!picked ? (
        <ScrollView>
          {TEMPLATES.map((t) => (
            <Pressable
              key={t.metric}
              onPress={() => { setPicked(t); setValue(String(t.suggested)); }}
              style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, marginBottom: space.sm,
                backgroundColor: pressed ? theme.cardAlt : theme.card, borderRadius: radius.md, borderWidth: 1, borderColor: theme.line,
              })}
            >
              <View style={{ width: 38, height: 38, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
                <Feather name={t.icon} size={18} color={theme.accent} />
              </View>
              <Text style={{ ...typo.body, color: theme.ink, flex: 1 }}>{t.title}</Text>
              <Feather name="chevron-right" size={18} color={theme.muted} />
            </Pressable>
          ))}
        </ScrollView>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>TARGET</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: space.lg }}>
            <TextInput
              style={{ flex: 1, backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 14, fontSize: 22, fontWeight: "700", color: theme.ink }}
              keyboardType="number-pad"
              value={value}
              onChangeText={setValue}
              placeholder={String(picked.suggested)}
              placeholderTextColor={theme.muted}
            />
            <Text style={{ ...typo.title, color: theme.muted }}>{picked.unit}</Text>
          </View>

          <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>HOW OFTEN</Text>
          <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.xl }}>
            {(["daily", "weekly"] as const).map((p) => (
              <Pressable key={p} onPress={() => setPeriod(p)} style={{
                flex: 1, paddingVertical: 12, borderRadius: radius.sm, alignItems: "center", borderWidth: 1,
                borderColor: period === p ? theme.accent : theme.line,
                backgroundColor: period === p ? theme.accent + "14" : theme.card,
              }}>
                <Text style={{ ...typo.body, color: period === p ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{p}</Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            onPress={create}
            disabled={busy}
            style={{ backgroundColor: theme.accent, borderRadius: radius.pill, paddingVertical: 15, alignItems: "center" }}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text style={{ ...typo.heading, color: "#FFFFFF" }}>
                {memberName ? "Assign goal" : "Create goal"}
              </Text>
            )}
          </Pressable>
        </ScrollView>
      )}
    </BottomSheet>
  );
}
