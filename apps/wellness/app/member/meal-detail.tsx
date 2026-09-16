import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../src/api/client";
import { useAction, useApi } from "../../src/api/hooks";
import { Card, MacroBar, Pill, Screen } from "../../src/components/ui";
import { useQuickLog } from "../../src/state/quicklog";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface Detail {
  mealLog: {
    id: string; mealType: string; loggedAt: string; notes: string | null;
    calories: string; proteinG: string; carbsG: string; fatG: string;
  };
  items: { id: string; nameSnapshot: string; quantity: string; unit: string; calories: string; proteinG: string; carbsG: string; fatG: string }[];
}

/** Everything that was on the plate, for a meal already logged. */
export default function MealDetail() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const quickLog = useQuickLog();
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useApi<Detail>(id ? `/v1/logs/meals/${id}` : null, [id]);
  const { busy, run } = useAction();

  const remove = async () => {
    const go = async () => {
      if (await run(() => api(`/v1/logs/meals/${id}`, { method: "DELETE" }))) {
        quickLog.bumpVersion();
        router.back();
      }
    };
    // Alert is unavailable on web; fall through to deleting directly there.
    if (Alert.alert) Alert.alert("Delete this meal?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: go },
    ]);
    else void go();
  };

  const log = d.data?.mealLog;

  return (
    <Screen theme={theme}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.inkSoft} />
        </Pressable>
        <Text style={{ ...typo.title, color: theme.ink, flex: 1, textTransform: "capitalize" }}>{log?.mealType ?? "Meal"}</Text>
        <Pressable onPress={remove} hitSlop={12} disabled={busy}>
          <Feather name="trash-2" size={20} color={theme.danger} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 120 }}>
        {d.loading && !d.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xxl }} />
        ) : !log ? (
          <Card theme={theme}><Text style={{ ...typo.body, color: theme.danger }}>{d.error ?? "Not found"}</Text></Card>
        ) : (
          <>
            <Card theme={theme} style={{ marginBottom: space.lg }}>
              <View style={{ flexDirection: "row", alignItems: "center", marginBottom: space.md }}>
                <Text style={{ fontSize: 30, fontWeight: "700", color: theme.ink, letterSpacing: -1 }}>
                  {Math.round(Number(log.calories))}
                </Text>
                <Text style={{ ...typo.body, color: theme.muted, marginLeft: 6 }}>kcal</Text>
                <View style={{ flex: 1 }} />
                <Pill theme={theme} label={new Date(log.loggedAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", hour12: false })} tone={theme.muted} />
              </View>
              <MacroBar theme={theme} protein={Number(log.proteinG)} carbs={Number(log.carbsG)} fat={Number(log.fatG)} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: space.sm }}>
                <Text style={{ ...typo.caption, color: theme.accent }}>{Number(log.proteinG).toFixed(0)}g protein</Text>
                <Text style={{ ...typo.caption, color: theme.teal }}>{Number(log.carbsG).toFixed(0)}g carbs</Text>
                <Text style={{ ...typo.caption, color: theme.warning }}>{Number(log.fatG).toFixed(0)}g fat</Text>
              </View>
            </Card>

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>
              On the plate ({d.data!.items.length})
            </Text>
            {d.data!.items.map((i) => (
              <Card key={i.id} theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.body, color: theme.ink }}>{i.nameSnapshot}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                    {Number(i.quantity)}{i.unit} · {Number(i.proteinG).toFixed(0)}g P / {Number(i.carbsG).toFixed(0)}g C / {Number(i.fatG).toFixed(0)}g F
                  </Text>
                </View>
                <Text style={{ ...typo.heading, color: theme.inkSoft }}>{Math.round(Number(i.calories))}</Text>
              </Card>
            ))}

            <Pressable
              onPress={() => router.replace({ pathname: "/member/meal", params: { slot: log.mealType } })}
              style={{ marginTop: space.lg, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: theme.line, borderRadius: radius.pill, paddingVertical: 13 }}
            >
              <Feather name="plus" size={16} color={theme.accent} />
              <Text style={{ ...typo.heading, color: theme.accent }}>Add more to {log.mealType}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}
