import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { api } from "../src/api/client";
import { isoDate, useAction, useApi } from "../src/api/hooks";
import { Screen } from "../src/components/ui";
import { useAuth } from "../src/state/auth";
import { radius, space, type as typo } from "../src/theme/tokens";

const ACTIVITY = [
  { id: "sedentary", label: "Sedentary", hint: "Desk work, little movement" },
  { id: "lightly_active", label: "Lightly active", hint: "Light exercise 1–3 days a week" },
  { id: "moderately_active", label: "Moderately active", hint: "Moderate exercise 3–5 days" },
  { id: "very_active", label: "Very active", hint: "Hard exercise 6–7 days" },
  { id: "extra_active", label: "Extra active", hint: "Physical job or twice-daily training" },
];
const GOALS = [
  { id: "fat_loss", label: "Lose fat", icon: "trending-down" as const },
  { id: "muscle_gain", label: "Build muscle", icon: "trending-up" as const },
  { id: "recomposition", label: "Recomposition", icon: "repeat" as const },
  { id: "maintain", label: "Maintain", icon: "minus" as const },
  { id: "endurance", label: "Endurance", icon: "wind" as const },
  { id: "general_health", label: "General health", icon: "heart" as const },
];

/**
 * First run for a member.
 *
 * These are not optional preferences: without sex, height, date of birth and a
 * weight, Mifflin-St Jeor cannot produce a calorie target at all, so the home
 * screen would show a member empty rings and no explanation. Asking once, up
 * front, is kinder than a permanent "finish your profile" banner.
 *
 * It can still be skipped --- someone who just wants to look around should be
 * able to --- and the banner returns for them.
 */
export default function Onboarding() {
  const { user, theme } = useAuth();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const { busy, error, run } = useAction();

  const [sex, setSex] = useState<"male" | "female" | null>(null);
  const [dob, setDob] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [activity, setActivity] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);
  const [sport, setSport] = useState<string | null>(null);
  const [bio, setBio] = useState("");

  const sports = useApi<{ items: { id: string; label: string; slug: string }[] }>(step === 4 ? "/v1/sport-profiles" : null, [step]);

  const steps = [
    { title: "About you", subtitle: "Used to estimate what your body needs each day." },
    { title: "Your measurements", subtitle: "Weight can change daily — log it whenever you like." },
    { title: "How active are you?", subtitle: "Outside of deliberate training." },
    { title: "What are you working towards?", subtitle: "This sets your calorie and protein targets." },
    { title: "Anything else?", subtitle: "Optional, and all of it can be changed later." },
  ];

  const canAdvance = [
    sex !== null && /^\d{4}-\d{2}-\d{2}$/.test(dob),
    Number(height) > 50 && Number(weight) > 20,
    activity !== null,
    goal !== null,
    true,
  ][step];

  const finish = async () => {
    const ok = await run(async () => {
      await api("/v1/me", {
        method: "PATCH",
        body: {
          sex, dateOfBirth: dob, heightCm: Number(height),
          activityLevel: activity, goalType: goal,
          ...(sport ? { sportProfileId: sport } : {}),
          ...(bio.trim() ? { bio: bio.trim() } : {}),
        },
      });
      await api("/v1/logs/body-metrics", { method: "POST", body: { date: isoDate(new Date()), weightKg: Number(weight) } });
    });
    if (ok) router.replace("/member");
  };

  const field = {
    backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1,
    borderRadius: radius.sm, padding: 14, fontSize: 16, color: theme.ink,
  };
  const chip = (on: boolean) => ({
    paddingHorizontal: 16, paddingVertical: 11, borderRadius: radius.pill, borderWidth: 1,
    borderColor: on ? theme.accent : theme.line, backgroundColor: on ? theme.accent + "14" : theme.card,
  });

  return (
    <Screen theme={theme}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: space.lg, paddingTop: insets.top + space.md }}>
          <View style={{ flexDirection: "row", gap: 5, marginBottom: space.xl }}>
            {steps.map((_, i) => (
              <View key={i} style={{ flex: 1, height: 3, borderRadius: radius.pill, backgroundColor: i <= step ? theme.accent : theme.line }} />
            ))}
          </View>

          <Text style={{ ...typo.display, color: theme.ink }}>{steps[step]!.title}</Text>
          <Text style={{ ...typo.body, color: theme.muted, marginTop: 6 }}>{steps[step]!.subtitle}</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: space.xl, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {step === 0 && (
            <>
              <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>SEX</Text>
              <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.xl }}>
                {(["male", "female"] as const).map((s) => (
                  <Pressable key={s} onPress={() => setSex(s)} style={{ ...chip(sex === s), flex: 1, alignItems: "center" }}>
                    <Text style={{ ...typo.body, color: sex === s ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{s}</Text>
                  </Pressable>
                ))}
              </View>
              {/* The equation needs a biological input; saying so avoids it
                  reading as a question about identity. */}
              <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.xl, marginTop: -space.md }}>
                The energy equation is calibrated on biological sex. It affects the calorie estimate only.
              </Text>

              <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>DATE OF BIRTH</Text>
              <TextInput style={field} placeholder="YYYY-MM-DD" placeholderTextColor={theme.muted} value={dob} onChangeText={setDob} keyboardType="numbers-and-punctuation" />
            </>
          )}

          {step === 1 && (
            <>
              <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>HEIGHT (CM)</Text>
              <TextInput style={{ ...field, marginBottom: space.xl }} placeholder="178" placeholderTextColor={theme.muted} value={height} onChangeText={setHeight} keyboardType="number-pad" />
              <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>WEIGHT (KG)</Text>
              <TextInput style={field} placeholder="78.5" placeholderTextColor={theme.muted} value={weight} onChangeText={setWeight} keyboardType="decimal-pad" />
            </>
          )}

          {step === 2 && ACTIVITY.map((a) => (
            <Pressable key={a.id} onPress={() => setActivity(a.id)} style={{
              padding: space.lg, marginBottom: space.sm, borderRadius: radius.md, borderWidth: 1,
              borderColor: activity === a.id ? theme.accent : theme.line,
              backgroundColor: activity === a.id ? theme.accent + "14" : theme.card,
            }}>
              <Text style={{ ...typo.heading, color: activity === a.id ? theme.accent : theme.ink }}>{a.label}</Text>
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: 3 }}>{a.hint}</Text>
            </Pressable>
          ))}

          {step === 3 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
              {GOALS.map((g) => (
                <Pressable key={g.id} onPress={() => setGoal(g.id)} style={{
                  width: "47%", flexGrow: 1, padding: space.lg, borderRadius: radius.md, borderWidth: 1, alignItems: "center", gap: 8,
                  borderColor: goal === g.id ? theme.accent : theme.line,
                  backgroundColor: goal === g.id ? theme.accent + "14" : theme.card,
                }}>
                  <Feather name={g.icon} size={20} color={goal === g.id ? theme.accent : theme.inkSoft} />
                  <Text style={{ ...typo.body, color: goal === g.id ? theme.accent : theme.ink, fontWeight: "600", textAlign: "center" }}>{g.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {step === 4 && (
            <>
              <Text style={{ ...typo.caption, color: theme.muted, marginBottom: 4 }}>SPORT OF FOCUS</Text>
              <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.md }}>
                If you train for a sport, its own carb and protein prescription replaces the generic split.
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: space.xl }}>
                <Pressable onPress={() => setSport(null)} style={chip(!sport)}>
                  <Text style={{ ...typo.caption, color: !sport ? theme.accent : theme.inkSoft, fontWeight: "600" }}>None</Text>
                </Pressable>
                {(sports.data?.items ?? []).slice(0, 12).map((s) => (
                  <Pressable key={s.id} onPress={() => setSport(s.id)} style={chip(sport === s.id)}>
                    <Text style={{ ...typo.caption, color: sport === s.id ? theme.accent : theme.inkSoft, fontWeight: "600" }}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>

              <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>ABOUT YOU</Text>
              <TextInput
                style={{ ...field, height: 96, textAlignVertical: "top" }}
                placeholder="Injuries, preferences, anything your coach should know"
                placeholderTextColor={theme.muted}
                value={bio}
                onChangeText={setBio}
                multiline
              />
            </>
          )}

          {error && <Text style={{ ...typo.caption, color: theme.danger, marginTop: space.md }}>{error}</Text>}
        </ScrollView>

        <View style={{ flexDirection: "row", gap: space.sm, paddingHorizontal: space.lg, paddingBottom: insets.bottom + space.lg }}>
          {step > 0 && (
            <Pressable onPress={() => setStep(step - 1)} style={{ paddingHorizontal: space.xl, justifyContent: "center", borderRadius: radius.pill, borderWidth: 1, borderColor: theme.line }}>
              <Feather name="chevron-left" size={20} color={theme.inkSoft} />
            </Pressable>
          )}
          <Pressable
            onPress={() => (step === steps.length - 1 ? finish() : setStep(step + 1))}
            disabled={!canAdvance || busy}
            style={{ flex: 1, alignItems: "center", paddingVertical: 16, borderRadius: radius.pill, backgroundColor: canAdvance ? theme.accent : theme.cardAlt }}
          >
            {busy ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text style={{ ...typo.heading, color: canAdvance ? "#FFFFFF" : theme.muted }}>
                {step === steps.length - 1 ? "Finish" : "Continue"}
              </Text>
            )}
          </Pressable>
        </View>

        {step === 0 && (
          <Pressable onPress={() => router.replace("/member")} style={{ alignItems: "center", paddingBottom: insets.bottom + space.md }}>
            <Text style={{ ...typo.body, color: theme.muted }}>Skip for now</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
