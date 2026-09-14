import React from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { Sparkles } from "lucide-react-native";
import { Card, Text, PillButton } from "@/components";
import { useUserStore } from "@/store/userStore";
import { useExerciseStore } from "@/store/exerciseStore";
import { useHealthStore } from "@/store/healthStore";
import { buildExerciseDay, goalEnergy } from "@/lib/exercisePlan";
import { localDate } from "@/lib/health";
import { useTheme } from "@/theme";
export function TodayExercise() {
  const theme = useTheme();
  const { profile, plan } = useUserStore();
  const { preferences, logged } = useExerciseStore();
  const health = useHealthStore((s) => s.data);
  if (!profile || !plan) return null;
  const today = buildExerciseDay(profile, preferences);
  const key = localDate();
  const burned = health?.days.find((d) => d.date === key)?.activeKcal;
  const energy = goalEnergy(plan);
  return (
    <Card
      style={{
        marginVertical: 16,
        borderColor: theme.colors.primary + "55",
        borderWidth: 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Sparkles size={18} color={theme.colors.primary} />
        <Text variant="caption" color="primary">
          YOUR MOVEMENT TODAY
        </Text>
      </View>
      <Text variant="title2" style={{ marginTop: 12 }}>
        {today.name}
      </Text>
      <Text
        color="textSecondary"
        variant="footnote"
        style={{ marginVertical: 8 }}
      >
        {today.minutes ? `${today.minutes} min session + ` : ""}
        {today.walkMinutes} min walk ·{" "}
        {logged[key] ? "Session logged" : "At your pace"}
      </Text>
      <View style={{ flexDirection: "row", gap: 16, marginVertical: 16 }}>
        <View style={{ flex: 1 }}>
          <Text variant="numberMedium" color="primary">
            ~{today.activeKcal}
          </Text>
          <Text variant="caption" color="textSecondary">
            Activity target · kcal
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="numberMedium">
            {burned == null ? "—" : Math.round(burned)}
          </Text>
          <Text variant="caption" color="textSecondary">
            Apple Health active kcal
          </Text>
        </View>
      </View>
      <Text variant="footnote" color="textSecondary">
        {burned == null
          ? "Connect Apple Health to see measured progress."
          : burned >= today.activeKcal
            ? "You’ve reached today’s estimated activity target."
            : `About ${Math.ceil(today.activeKcal - burned)} active kcal to today’s target.`}
      </Text>
      <View
        style={{
          borderTopWidth: 1,
          borderColor: theme.colors.separator,
          marginTop: 16,
          paddingTop: 16,
        }}
      >
        <Text variant="headline">How this supports your goal</Text>
        <Text variant="footnote" color="textSecondary" style={{ marginTop: 8 }}>
          Estimated total daily burn: {energy.totalBurn} kcal{"\n"}Food target:{" "}
          {energy.foodTarget} kcal{"\n"}
          {energy.label}: {Math.abs(energy.balance)} kcal/day
        </Text>
        <Text
          variant="caption"
          color="textTertiary"
          style={{ marginVertical: 12 }}
        >
          Total burn already includes your usual activity. Don’t add exercise
          calories again or try to burn the whole deficit. These are estimates,
          not a guaranteed weight-loss timeline.
        </Text>
      </View>
      <PillButton
        label="See today’s exercises"
        onPress={() => router.push("/exercise-plan")}
      />
      <PillButton
        label="Generate / change my plan"
        variant="ghost"
        onPress={() => router.push("/exercise-plan?edit=1")}
        style={{ marginTop: 6 }}
      />
    </Card>
  );
}
