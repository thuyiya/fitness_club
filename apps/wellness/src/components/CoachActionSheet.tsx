import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useApi } from "../api/hooks";
import { BottomSheet } from "./BottomSheet";
import { Card, Pill } from "./ui";
import { radius, space, type as typo, type Theme } from "../theme/tokens";

interface Member { id: string; name: string; email: string; avatarUrl: string | null }
interface Plan { id: string; name: string; type: string; difficulty: string | null; dayCount: number; assignedCount: number; isTemplate: boolean }

/**
 * The coach's centre "+". A coach's work is four verbs --- find someone, write
 * a programme, write a meal plan, reuse a template --- and all four were
 * previously buried under Settings. Member search is first because looking
 * someone up is the thing a coach does between every other action.
 */
export function CoachActionSheet({
  theme, visible, onClose,
}: { theme: Theme; visible: boolean; onClose: () => void }) {
  const [mode, setMode] = useState<"menu" | "members">("menu");
  const [query, setQuery] = useState("");

  const members = useApi<{ items: Member[] }>(mode === "members" ? "/v1/members" : null, [mode]);
  const plans = useApi<{ items: Plan[] }>(visible ? "/v1/plans" : null, [visible]);

  const close = () => { setMode("menu"); setQuery(""); onClose(); };
  const go = (path: Parameters<typeof router.push>[0]) => { close(); setTimeout(() => router.push(path), 250); };

  const filtered = (members.data?.items ?? []).filter((m) =>
    !query.trim() || m.name.toLowerCase().includes(query.toLowerCase()) || m.email.toLowerCase().includes(query.toLowerCase()));

  const templates = (plans.data?.items ?? []).filter((p) => p.isTemplate);

  return (
    <BottomSheet theme={theme} visible={visible} onClose={close} heightRatio={mode === "members" ? 0.8 : 0.58}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.md }}>
        {mode !== "menu" && (
          <Pressable onPress={() => { setMode("menu"); setQuery(""); }} hitSlop={12} style={{ marginRight: 6 }}>
            <Feather name="chevron-left" size={22} color={theme.inkSoft} />
          </Pressable>
        )}
        <Text style={{ ...typo.title, color: theme.ink, flex: 1 }}>
          {mode === "members" ? "Find a member" : "Create"}
        </Text>
      </View>

      {mode === "menu" && (
        <ScrollView>
          <Action theme={theme} icon="users" tone={theme.accent} label="Find a member"
            hint="See their plans, logs and progress" onPress={() => setMode("members")} />
          <Action theme={theme} icon="repeat" tone={theme.teal} label="New workout plan"
            hint="Days, exercises, sets and reps" onPress={() => go({ pathname: "/coach/plan", params: { type: "workout" } })} />
          <Action theme={theme} icon="coffee" tone={theme.lime} label="New meal plan"
            hint="Daily targets and meals per slot" onPress={() => go({ pathname: "/coach/plan", params: { type: "meal" } })} />
          <Action theme={theme} icon="bookmark" tone={theme.warning} label="Templates"
            hint={templates.length ? `${templates.length} saved` : "Reusable plans"} onPress={() => go("/coach/templates")} />
          <Action theme={theme} icon="calendar" tone={theme.indigo} label="Book a session"
            hint="Add to your calendar" onPress={() => go("/coach/calendar")} />
        </ScrollView>
      )}

      {mode === "members" && (
        <>
          <TextInput
            style={{ backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 11, fontSize: 15, color: theme.ink }}
            placeholder="Search members" placeholderTextColor={theme.muted} value={query} onChangeText={setQuery} autoCorrect={false}
          />
          <ScrollView style={{ marginTop: space.md }} keyboardShouldPersistTaps="handled">
            {members.loading && !members.data ? <ActivityIndicator color={theme.accent} style={{ marginTop: space.lg }} /> :
              filtered.length === 0 ? (
                <Text style={{ ...typo.caption, color: theme.muted, textAlign: "center", marginTop: space.xl }}>
                  {query ? "Nobody matched." : "No members yet. Approve a join request to add one."}
                </Text>
              ) : filtered.map((m) => (
                <Pressable key={m.id} onPress={() => go({ pathname: "/coach/member/[id]", params: { id: m.id } })}>
                  <Card theme={theme} style={{ marginBottom: space.sm, padding: space.md, flexDirection: "row", alignItems: "center", gap: space.md }}>
                    <View style={{ width: 38, height: 38, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ ...typo.heading, color: theme.accent }}>{m.name[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typo.heading, color: theme.ink }}>{m.name}</Text>
                      <Text style={{ ...typo.caption, color: theme.muted }}>{m.email}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={theme.muted} />
                  </Card>
                </Pressable>
              ))}
          </ScrollView>
        </>
      )}
    </BottomSheet>
  );
}

function Action({ theme, icon, tone, label, hint, onPress }: {
  theme: Theme; icon: keyof typeof Feather.glyphMap; tone: string; label: string; hint: string; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({
      flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md, marginBottom: space.sm,
      backgroundColor: pressed ? theme.cardAlt : theme.card, borderRadius: radius.md, borderWidth: 1, borderColor: theme.line,
    })}>
      <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: tone + "1F", alignItems: "center", justifyContent: "center" }}>
        <Feather name={icon} size={19} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...typo.heading, color: theme.ink }}>{label}</Text>
        <Text style={{ ...typo.caption, color: theme.muted, marginTop: 1 }}>{hint}</Text>
      </View>
      <Feather name="chevron-right" size={19} color={theme.muted} />
    </Pressable>
  );
}
