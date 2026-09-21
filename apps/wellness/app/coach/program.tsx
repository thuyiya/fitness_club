import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { api, ApiError } from "../../src/api/client";
import { useAction, useApi } from "../../src/api/hooks";
import { Card, Screen } from "../../src/components/ui";
import { DateRangePicker, eachDay, isoDay, parseDay } from "../../src/components/DateRangePicker";
import { PrescriptionSheet, type Prescription } from "../../src/components/PrescriptionSheet";
import { PlanChangeSheet } from "../../src/components/PlanChangeSheet";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface PlanDay {
  id: string; weekNumber: number; dayNumber: number; title: string | null; isRestDay: boolean;
  exercises: {
    id: string; sets: number | null; reps: number | null; durationSeconds: number | null;
    restSeconds: number | null; intensity: string | null;
    exercise: { id: string; name: string; loggingMode: string } | null;
    activity: { id: string; name: string } | null;
  }[];
}
interface PlanTree {
  plan: { id: string; name: string; goal: string | null; difficulty: string | null; durationWeeks: number | null };
  days: PlanDay[];
}
interface Assignment { id: string; startDate: string; endDate: string | null; member: { id: string; name: string } }

const DIFFICULTIES = ["beginner", "intermediate", "advanced"] as const;

const dayLabel = (iso: string) =>
  parseDay(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });

/**
 * Build a training block over a range of real dates.
 *
 * Plans are stored as (week, day) so they stay reusable, but nobody writes one
 * that way --- a coach picks "the 17th to the 20th" and fills in the days they
 * care about. This screen is the dated view; the API converts on save.
 *
 * Every date in the range gets a card, and a card with nothing on it is a REST
 * day rather than a gap. That is the whole point of showing the range: the
 * coach can see what they have not filled in.
 */
export default function ProgramBuilder() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string; assignTo?: string }>();

  const tree = useApi<PlanTree>(params.id ? `/v1/plans/${params.id}` : null, [params.id]);
  const assignments = useApi<{ items: Assignment[] }>(params.id ? `/v1/plans/${params.id}/assignments` : null, [params.id]);
  const member = useApi<{ member: { id: string; name: string } }>(
    params.assignTo ? `/v1/coach/members/${params.assignTo}` : null,
    [params.assignTo],
  );
  const { busy, error, run } = useAction();

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [difficulty, setDifficulty] = useState<string>("beginner");
  const [start, setStart] = useState<string | null>(isoDay(new Date()));
  const [end, setEnd] = useState<string | null>(null);
  const [days, setDays] = useState<Record<string, Prescription[]>>({});
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ members: { id: string; name: string }[] } | null>(null);
  const [saved, setSaved] = useState(false);

  /**
   * Rebuild the dated view from a stored plan.
   *
   * The plan itself holds no dates --- only the assignment does --- so the
   * window comes from there, and day N of the plan maps back onto the Nth date.
   */
  useEffect(() => {
    if (!tree.data || !assignments.data) return;
    setName(tree.data.plan.name);
    setGoal(tree.data.plan.goal ?? "");
    setDifficulty(tree.data.plan.difficulty ?? "beginner");

    const window = assignments.data.items[0];
    const from = window?.startDate ?? isoDay(new Date());
    const ordered = [...tree.data.days].sort((a, b) =>
      a.weekNumber - b.weekNumber || a.dayNumber - b.dayNumber);
    const to = window?.endDate ?? isoDay(parseDay(from));
    setStart(from);
    setEnd(to !== from ? to : isoDay(new Date(parseDay(from).getTime() + (ordered.length - 1) * 86400000)));

    const next: Record<string, Prescription[]> = {};
    ordered.forEach((d, i) => {
      const date = isoDay(new Date(parseDay(from).getTime() + i * 86400000));
      const items = d.exercises.map((e): Prescription => {
        if (e.activity) {
          const mins = Math.round((e.durationSeconds ?? 0) / 60);
          return {
            activityId: e.activity.id, durationSeconds: e.durationSeconds ?? undefined,
            intensity: (e.intensity as Prescription["intensity"]) ?? undefined,
            label: e.activity.name, detail: `${mins} min${e.intensity ? ` · ${e.intensity}` : ""}`, isActivity: true,
          };
        }
        const timed = e.exercise?.loggingMode === "hold" || e.exercise?.loggingMode === "duration";
        return {
          exerciseId: e.exercise!.id, sets: e.sets ?? undefined, reps: e.reps ?? undefined,
          durationSeconds: e.durationSeconds ?? undefined, restSeconds: e.restSeconds ?? undefined,
          intensity: (e.intensity as Prescription["intensity"]) ?? undefined,
          label: e.exercise!.name,
          detail: `${e.sets ?? 1} × ${timed ? `${e.durationSeconds ?? 0}s` : e.reps ?? 0}${e.intensity ? ` · ${e.intensity}` : ""}`,
          isActivity: false,
        };
      });
      if (items.length) next[date] = items;
    });
    setDays(next);
  }, [tree.data?.plan.id, assignments.data?.items.length]);

  const dates = useMemo(() => (start && end ? eachDay(start, end) : start ? [start] : []), [start, end]);
  const filled = dates.filter((d) => (days[d]?.length ?? 0) > 0).length;

  const addTo = (date: string, p: Prescription) =>
    setDays((prev) => ({ ...prev, [date]: [...(prev[date] ?? []), p] }));
  const removeFrom = (date: string, index: number) =>
    setDays((prev) => ({ ...prev, [date]: (prev[date] ?? []).filter((_, i) => i !== index) }));

  const assignedTo = params.assignTo
    ? [params.assignTo]
    : (assignments.data?.items ?? []).map((a) => a.member.id);

  const save = async (strategy?: "propagate" | "fork" | "detach") => {
    if (!name.trim() || !start) return;
    const body = {
      planId: params.id,
      name: name.trim(),
      goal: goal.trim() || undefined,
      difficulty,
      startDate: start,
      endDate: end ?? start,
      // A block assigned to nobody is a draft; the API accepts an empty list.
      memberIds: params.assignTo ? [params.assignTo] : [],
      days: dates
        .filter((d) => (days[d]?.length ?? 0) > 0)
        .map((d) => ({
          date: d,
          items: (days[d] ?? []).map(({ label, detail, isActivity, ...item }) => item),
        })),
      ...(strategy ? { strategy } : {}),
    };
    try {
      const res = await api<{ plan: { id: string } }>("/v1/plans/build", { method: "POST", body });
      setConflict(null);
      setSaved(true);
      // Re-enter as an edit of what was just written, so a second Save updates
      // the block rather than creating a duplicate of it.
      router.setParams({ id: res.plan.id });
      setTimeout(() => router.back(), 450);
    } catch (e) {
      // The API refuses to guess what should happen to people already on the
      // block; surface that choice rather than silently picking one.
      if (e instanceof ApiError && e.code === "plan_has_assignments") {
        try { setConflict(JSON.parse(e.message)); } catch { setConflict({ members: [] }); }
      } else {
        throw e;
      }
    }
  };

  const field = { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 12, fontSize: 15, color: theme.ink };
  const chip = (on: boolean) => ({
    paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1,
    borderColor: on ? theme.accent : theme.line, backgroundColor: on ? theme.accent + "14" : theme.card,
  });
  const forName = member.data?.member.name ?? assignments.data?.items[0]?.member.name;

  return (
    <Screen theme={theme}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.inkSoft} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typo.title, color: theme.ink }}>{params.id ? "Edit block" : "New workout plan"}</Text>
          {forName ? (
            <Text style={{ ...typo.caption, color: theme.accent, marginTop: 1 }}>
              {params.id ? `Assigned to ${forName}` : `Will be assigned to ${forName} on save`}
            </Text>
          ) : null}
        </View>
        <Pressable onPress={() => run(() => save())} hitSlop={12} disabled={busy || !name.trim() || !start}>
          {busy ? <ActivityIndicator color={theme.accent} /> : (
            <Text style={{ ...typo.heading, color: name.trim() && start ? theme.accent : theme.muted }}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        {tree.loading && !tree.data && params.id ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xl }} />
        ) : (
          <>
            <TextInput
              style={{ ...field, marginBottom: space.md }}
              placeholder="Block name — e.g. Pre-season week 1"
              placeholderTextColor={theme.muted}
              value={name}
              onChangeText={setName}
              accessibilityLabel="Block name"
            />
            <TextInput
              style={{ ...field, marginBottom: space.md }}
              placeholder="Goal — e.g. Build base fitness"
              placeholderTextColor={theme.muted}
              value={goal}
              onChangeText={setGoal}
            />
            <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.xl }}>
              {DIFFICULTIES.map((d) => (
                <Pressable key={d} onPress={() => setDifficulty(d)} style={chip(difficulty === d)}>
                  <Text style={{ ...typo.caption, color: difficulty === d ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{d}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Dates</Text>
            <DateRangePicker
              theme={theme}
              start={start}
              end={end}
              onChange={(s, e) => { setStart(s); setEnd(e); }}
            />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: space.xl, marginBottom: space.sm }}>
              <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase" }}>
                {dates.length} day{dates.length === 1 ? "" : "s"}
              </Text>
              <Text style={{ ...typo.caption, color: theme.muted }}>
                {filled} with work · {dates.length - filled} rest
              </Text>
            </View>

            {dates.length === 0 ? (
              <Card theme={theme}>
                <Text style={{ ...typo.body, color: theme.muted }}>Pick a date range to lay out the days.</Text>
              </Card>
            ) : dates.map((date) => {
              const items = days[date] ?? [];
              return (
                <Card key={date} theme={theme} style={{ marginBottom: space.sm, padding: space.md }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typo.heading, color: theme.ink }}>{dayLabel(date)}</Text>
                      {items.length === 0 && (
                        <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>Rest day</Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => setSheetFor(date)}
                      hitSlop={8}
                      accessibilityLabel={`Add work to ${dayLabel(date)}`}
                      style={{ width: 32, height: 32, borderRadius: radius.pill, backgroundColor: theme.accent + "14", alignItems: "center", justifyContent: "center" }}
                    >
                      <Feather name="plus" size={17} color={theme.accent} />
                    </Pressable>
                  </View>

                  {items.map((it, i) => (
                    <View key={`${date}-${i}`} style={{
                      flexDirection: "row", alignItems: "center", gap: space.sm,
                      marginTop: space.sm, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: theme.line,
                    }}>
                      <View style={{ width: 28, height: 28, borderRadius: radius.pill, backgroundColor: (it.isActivity ? theme.teal : theme.accent) + "1F", alignItems: "center", justifyContent: "center" }}>
                        <Feather name={it.isActivity ? "award" : "repeat"} size={13} color={it.isActivity ? theme.teal : theme.accent} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ ...typo.body, color: theme.ink, fontWeight: "600" }}>{it.label}</Text>
                        <Text style={{ ...typo.caption, color: theme.muted, marginTop: 1 }}>{it.detail}</Text>
                      </View>
                      <Pressable onPress={() => removeFrom(date, i)} hitSlop={10} accessibilityLabel={`Remove ${it.label}`}>
                        <Feather name="x" size={16} color={theme.muted} />
                      </Pressable>
                    </View>
                  ))}
                </Card>
              );
            })}

            {saved && (
              <Text style={{ ...typo.caption, color: theme.teal, marginTop: space.md, textAlign: "center" }}>
                Saved. It is on your calendar and {forName ? `${forName}'s` : "the member's"} too.
              </Text>
            )}
            {error && <Text style={{ ...typo.caption, color: theme.danger, marginTop: space.md }}>{error}</Text>}
          </>
        )}
      </ScrollView>

      <PrescriptionSheet
        theme={theme}
        visible={!!sheetFor}
        dateLabel={sheetFor ? dayLabel(sheetFor) : ""}
        onClose={() => setSheetFor(null)}
        onAdd={(p) => { if (sheetFor) addTo(sheetFor, p); setSheetFor(null); }}
      />

      <PlanChangeSheet
        theme={theme}
        visible={!!conflict}
        members={conflict?.members ?? []}
        planName={name}
        onClose={() => setConflict(null)}
        onChoose={(strategy) => run(() => save(strategy))}
      />
    </Screen>
  );
}
