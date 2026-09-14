import React, { useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Check, ChevronLeft, Settings2 } from "lucide-react-native";
import { Screen, Text, Card, PillButton, SegmentedControl } from "@/components";
import { MovementGuide } from "@/components/MovementGuide";
import { TodayExercise } from "@/components/TodayExercise";
import { buildExerciseDay, ExercisePreferences } from "@/lib/exercisePlan";
import { localDate } from "@/lib/health";
import { useExerciseStore } from "@/store/exerciseStore";
import { useUserStore } from "@/store/userStore";
import { useLogStore } from "@/store/logStore";
import { useTheme } from "@/theme";
export default function ExercisePlan() {
  const theme = useTheme();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const profile = useUserStore((s) => s.profile);
  const { preferences, configure, completed, toggle, logged, finish } =
    useExerciseStore();
  const [editing, setEditing] = useState(edit === "1");
  const [minutes, setMinutes] = useState(preferences.minutes);
  const [level, setLevel] = useState(preferences.level);
  const [offset, setOffset] = useState(0);
  if (!profile)
    return (
      <Screen>
        <Text variant="largeTitle">Your exercise plan</Text>
        <PillButton
          label="Set up health profile"
          onPress={() => router.push("/onboarding")}
        />
      </Screen>
    );
  const date = new Date();
  date.setDate(date.getDate() + offset);
  const key = localDate(date);
  const day = buildExerciseDay(profile, preferences, date);
  const done = completed[key] ?? [];
  const isToday = offset === 0;
  return (
    <Screen>
      <Pressable
        accessibilityLabel="Go back"
        onPress={() => router.back()}
        style={{ paddingVertical: 12 }}
      >
        <ChevronLeft color={theme.colors.text} />
      </Pressable>
      <Text variant="caption" color="primary">
        BUILT ON YOUR DEVICE · NO EQUIPMENT
      </Text>
      <Text variant="largeTitle" style={{ marginTop: 8 }}>
        Your daily moves.
      </Text>
      <Text
        variant="footnote"
        color="textSecondary"
        style={{ marginVertical: 12 }}
      >
        Strength, movement and recovery. A routine you can actually follow.
      </Text>
      <PillButton
        label={editing ? "Hide plan options" : "Generate / change plan"}
        variant="secondary"
        onPress={() => setEditing(!editing)}
      />
      {editing && (
        <Card style={{ marginTop: 16 }}>
          <Text variant="headline">Make room for movement</Text>
          <Text variant="footnote" style={{ marginVertical: 12 }}>
            Session length
          </Text>
          <SegmentedControl<"15" | "25" | "40">
            value={String(minutes) as "15" | "25" | "40"}
            onChange={(value) =>
              setMinutes(Number(value) as ExercisePreferences["minutes"])
            }
            options={[
              { label: "15 min", value: "15" },
              { label: "25 min", value: "25" },
              { label: "40 min", value: "40" },
            ]}
          />
          <Text variant="footnote" style={{ marginVertical: 12 }}>
            Starting intensity
          </Text>
          <SegmentedControl<ExercisePreferences["level"]>
            value={level}
            onChange={setLevel}
            options={[
              { label: "Gentle", value: "gentle" },
              { label: "Steady", value: "steady" },
            ]}
          />
          <Text
            variant="footnote"
            color="textSecondary"
            style={{ marginVertical: 12 }}
          >
            Scheduled movement days per week
          </Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => (
              <Pressable
                accessibilityLabel={`${n} movement days per week`}
                key={n}
                onPress={() =>
                  useUserStore
                    .getState()
                    .updateProfile({ workoutDaysPerWeek: n })
                }
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor:
                    n === profile.workoutDaysPerWeek
                      ? theme.colors.primary
                      : theme.colors.surface,
                }}
              >
                <Text
                  style={{
                    color:
                      n === profile.workoutDaysPerWeek
                        ? theme.colors.textInverse
                        : theme.colors.text,
                  }}
                >
                  {n}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text
            variant="caption"
            color="textSecondary"
            style={{ marginVertical: 12 }}
          >
            Full-body sessions are separated by recovery. Extra scheduled days
            focus on mobility. Start comfortably and build toward regular weekly
            activity.
          </Text>
          <PillButton
            label="Generate my week offline"
            onPress={() => {
              configure({
                minutes,
                level,
                variation: preferences.variation + 1,
              });
              setEditing(false);
              setOffset(0);
            }}
          />
          <PillButton
            label="Ask AI for a custom routine"
            variant="ghost"
            onPress={() => router.push("/coach?intent=workout")}
            style={{ marginTop: 8 }}
          />
        </Card>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 20 }}
      >
        {Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const item = buildExerciseDay(profile, preferences, d);
          return (
            <Pressable
              key={i}
              onPress={() => setOffset(i)}
              style={{
                width: 76,
                padding: 12,
                borderRadius: 18,
                backgroundColor:
                  offset === i ? theme.colors.primary : theme.colors.card,
              }}
            >
              <Text
                center
                variant="caption"
                style={{
                  color:
                    offset === i ? theme.colors.textInverse : theme.colors.text,
                }}
              >
                {i === 0
                  ? "Today"
                  : d.toLocaleDateString(undefined, { weekday: "short" })}
              </Text>
              <Text
                center
                variant="title3"
                style={{
                  color:
                    offset === i ? theme.colors.textInverse : theme.colors.text,
                  marginVertical: 5,
                }}
              >
                {d.getDate()}
              </Text>
              <Text
                center
                variant="caption"
                style={{
                  color:
                    offset === i
                      ? theme.colors.textInverse
                      : theme.colors.textSecondary,
                }}
              >
                {item.strength
                  ? "Strength"
                  : item.minutes
                    ? "Mobility"
                    : "Rest"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text variant="title1">{day.name}</Text>
      <Text color="textSecondary" style={{ marginVertical: 10 }}>
        {day.minutes} min session · {day.walkMinutes} min walk · ~
        {day.activeKcal} active kcal combined
      </Text>
      <Text
        variant="caption"
        color="textSecondary"
        style={{ marginBottom: 18 }}
      >
        Time and calorie estimates include warm-up, rests and cooldown. Aim for
        comfortable effort; stop if a movement causes pain.
      </Text>
      {day.strength ? (
        <>
          <Card style={{ marginBottom: 16 }}>
            <Text variant="headline">01 · Warm up · 3–5 min</Text>
            <Text
              variant="footnote"
              color="textSecondary"
              style={{ marginTop: 8 }}
            >
              March in place, roll your shoulders and practise shallow squats.
              Start slowly.
            </Text>
          </Card>
          {day.movements.map((move, i) => (
            <Card key={move.id} style={{ marginBottom: 16 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <Text variant="title2" color="primary">
                  {String(i + 1).padStart(2, "0")}
                </Text>
                <Text variant="headline" style={{ flex: 1 }}>
                  {move.name}
                </Text>
                {done.includes(move.id) && (
                  <Check color={theme.colors.success} />
                )}
              </View>
              <MovementGuide id={move.id} />
              <Text variant="headline" color="primary">
                {day.sets} sets ×{" "}
                {move.id === "plank"
                  ? `${day.holdSeconds} sec`
                  : `${day.reps} reps${["lunge", "deadbug"].includes(move.id) ? " / side" : ""}`}
              </Text>
              <Text
                variant="caption"
                color="textSecondary"
                style={{ marginVertical: 8 }}
              >
                Rest 45–60 sec between sets · schematic form guide
              </Text>
              {move.cues.map((cue, n) => (
                <Text key={cue} variant="footnote" style={{ marginTop: 5 }}>
                  {n + 1}. {cue}
                </Text>
              ))}
              <Text
                variant="caption"
                color="textSecondary"
                style={{ marginVertical: 14 }}
              >
                Make it easier: {move.easier}
              </Text>
              {isToday && (
                <PillButton
                  label={
                    done.includes(move.id)
                      ? "Completed · tap to undo"
                      : "Mark exercise complete"
                  }
                  variant={done.includes(move.id) ? "secondary" : "primary"}
                  disabled={!!logged[key]}
                  onPress={() => toggle(key, move.id)}
                />
              )}
            </Card>
          ))}
          <Card>
            <Text variant="headline">Finish · 3 min cooldown</Text>
            <Text
              variant="footnote"
              color="textSecondary"
              style={{ marginTop: 8 }}
            >
              Walk slowly, then gently stretch your thighs, chest and calves for
              20–30 seconds each. Keep breathing.
            </Text>
          </Card>
        </>
      ) : (
        <Card>
          <Text variant="headline">Recover with intention</Text>
          <Text color="textSecondary" style={{ marginTop: 10 }}>
            {day.minutes
              ? "Spend 15 minutes moving gently: shoulder circles, ankle circles, supported hip stretches and an easy walk. Stay in a comfortable range."
              : "Take a break from strength training. Add an easy walk if you feel up to it."}
          </Text>
        </Card>
      )}
      {isToday && day.minutes > 0 && (
        <PillButton
          label={
            logged[key]
              ? "Session saved for today"
              : "Finish & log today’s session"
          }
          disabled={
            !!logged[key] ||
            (day.strength && !day.movements.every((m) => done.includes(m.id)))
          }
          onPress={() => {
            if (finish(key)) {
              useLogStore.getState().addWorkout(day.minutes);
              Alert.alert(
                "Session saved",
                "Your session is in your manual log. Apple Health readings stay separate.",
              );
            }
          }}
          style={{ marginTop: 20 }}
        />
      )}
      <Text variant="caption" color="textTertiary" style={{ marginTop: 18 }}>
        A starting routine for adults, not a medical prescription. The general
        weekly guideline is 150 minutes of moderate activity plus strength work
        on 2 days; build up gradually. No routine can choose where your body
        loses fat.
      </Text>
    </Screen>
  );
}
