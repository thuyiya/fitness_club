import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useApi } from "../../src/api/hooks";
import { Card, Pill, Screen } from "../../src/components/ui";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface Gym { id: string; name: string; city: string | null; coachCount: number; memberCount: number; alreadyMember: boolean; requested: boolean }
interface Coach {
  id: string; name: string; headline: string | null; bio: string | null;
  specialties: string[] | null; yearsExperience: number | null; acceptingClients: boolean | null;
  priceFrom: number | null; currency: string | null; memberCount: number; gymNames: string[]; activePromotions: number;
}

/**
 * Two ways in, because people arrive with different questions: "who coaches at
 * my gym?" and "I was told to look up this person". Searching by gym first is
 * the default, since most members are choosing within somewhere they already go.
 */
export default function FindCoach() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ gymId?: string; gymName?: string }>();
  const [tab, setTab] = useState<"gyms" | "coaches">(params.gymId ? "coaches" : "gyms");
  const [query, setQuery] = useState("");
  const [gymFilter, setGymFilter] = useState<{ id: string; name: string } | null>(
    params.gymId ? { id: params.gymId, name: params.gymName ?? "this gym" } : null,
  );

  const gyms = useApi<{ items: Gym[] }>(
    tab === "gyms" ? `/v1/discover/gyms${query.trim() ? `?q=${encodeURIComponent(query)}` : ""}` : null, [tab, query]);
  const coaches = useApi<{ items: Coach[] }>(
    tab === "coaches"
      ? `/v1/discover/coaches?${gymFilter ? `gymId=${gymFilter.id}&` : ""}${query.trim() ? `q=${encodeURIComponent(query)}` : ""}`
      : null,
    [tab, query, gymFilter?.id],
  );

  return (
    <Screen theme={theme}>
      <View style={{ paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, marginBottom: space.md }}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Feather name="chevron-left" size={24} color={theme.inkSoft} />
          </Pressable>
          <Text style={{ ...typo.title, color: theme.ink, flex: 1 }}>Find your coach</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 6, marginBottom: space.md }}>
          {(["gyms", "coaches"] as const).map((t) => (
            <Pressable key={t} onPress={() => { setTab(t); setQuery(""); if (t === "gyms") setGymFilter(null); }} style={{
              flex: 1, paddingVertical: 9, borderRadius: radius.sm, alignItems: "center", borderWidth: 1,
              borderColor: tab === t ? theme.accent : theme.line,
              backgroundColor: tab === t ? theme.accent + "14" : theme.card,
            }}>
              <Text style={{ ...typo.body, color: tab === t ? theme.accent : theme.inkSoft, fontWeight: "600" }}>
                {t === "gyms" ? "By gym" : "By name"}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, paddingHorizontal: 12 }}>
          <Feather name="search" size={16} color={theme.muted} />
          <TextInput
            style={{ flex: 1, paddingVertical: 11, fontSize: 15, color: theme.ink }}
            placeholder={tab === "gyms" ? "Search gyms by name or city" : "Search coaches by name"}
            placeholderTextColor={theme.muted}
            value={query}
            onChangeText={setQuery}
            autoCorrect={false}
          />
        </View>

        {gymFilter && tab === "coaches" && (
          <Pressable onPress={() => setGymFilter(null)} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.md }}>
            <Pill theme={theme} label={`At ${gymFilter.name}`} tone={theme.accent} />
            <Feather name="x" size={14} color={theme.muted} />
          </Pressable>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
        {tab === "gyms" && (
          gyms.loading && !gyms.data ? <ActivityIndicator color={theme.accent} style={{ marginTop: space.xl }} /> :
          (gyms.data?.items.length ?? 0) === 0 ? (
            <Card theme={theme}><Text style={{ ...typo.body, color: theme.muted }}>No gyms matched.</Text></Card>
          ) : gyms.data!.items.map((g) => (
            <Pressable key={g.id} onPress={() => { setGymFilter({ id: g.id, name: g.name }); setTab("coaches"); setQuery(""); }}>
              <Card theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View style={{ width: 42, height: 42, borderRadius: radius.pill, backgroundColor: theme.teal + "1F", alignItems: "center", justifyContent: "center" }}>
                  <Feather name="map-pin" size={18} color={theme.teal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.ink }}>{g.name}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                    {[g.city, `${g.coachCount} coach${g.coachCount === 1 ? "" : "es"}`].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                {g.alreadyMember ? <Pill theme={theme} label="Your gym" tone={theme.teal} />
                  : g.requested ? <Pill theme={theme} label="Requested" tone={theme.warning} /> : null}
                <Feather name="chevron-right" size={18} color={theme.muted} />
              </Card>
            </Pressable>
          ))
        )}

        {tab === "coaches" && (
          coaches.loading && !coaches.data ? <ActivityIndicator color={theme.accent} style={{ marginTop: space.xl }} /> :
          (coaches.data?.items.length ?? 0) === 0 ? (
            <Card theme={theme}>
              <Text style={{ ...typo.body, color: theme.muted }}>
                {gymFilter ? "No coaches listed at this gym yet." : "No coaches matched."}
              </Text>
            </Card>
          ) : coaches.data!.items.map((c) => (
            <Pressable key={c.id} onPress={() => router.push({ pathname: "/member/coach/[id]", params: { id: c.id } })}>
              <Card theme={theme} style={{ marginBottom: space.sm }}>
                <View style={{ flexDirection: "row", gap: space.md }}>
                  <View style={{ width: 48, height: 48, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ ...typo.title, color: theme.accent }}>{c.name[0]?.toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ ...typo.heading, color: theme.ink, flex: 1 }}>{c.name}</Text>
                      {c.acceptingClients === false && <Pill theme={theme} label="Full" tone={theme.muted} />}
                      {c.activePromotions > 0 && <Pill theme={theme} label="Offer" tone={theme.accent} />}
                    </View>
                    {c.headline ? (
                      <Text style={{ ...typo.caption, color: theme.inkSoft, marginTop: 3 }} numberOfLines={2}>{c.headline}</Text>
                    ) : null}
                    <Text style={{ ...typo.caption, color: theme.muted, marginTop: 4 }}>
                      {[
                        c.yearsExperience ? `${c.yearsExperience} yrs` : null,
                        `${c.memberCount} member${c.memberCount === 1 ? "" : "s"}`,
                        c.gymNames?.[0],
                      ].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                </View>
                {(c.specialties?.length ?? 0) > 0 && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: space.md }}>
                    {c.specialties!.slice(0, 4).map((s) => (
                      <View key={s} style={{ backgroundColor: theme.cardAlt, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 4 }}>
                        <Text style={{ ...typo.caption, color: theme.inkSoft }}>{s}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
