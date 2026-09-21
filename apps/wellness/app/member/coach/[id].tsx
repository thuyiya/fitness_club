import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../../src/api/client";
import { useAction, useApi } from "../../../src/api/hooks";
import { MapPreview } from "../../../src/components/MapPreview";
import { Card, Pill, Screen } from "../../../src/components/ui";
import { useAuth } from "../../../src/state/auth";
import { radius, space, type as typo } from "../../../src/theme/tokens";

interface Profile {
  coach: {
    id: string; name: string; bio: string | null; headline: string | null;
    specialties: string[] | null; certifications: string[] | null; languages: string[] | null;
    yearsExperience: number | null; acceptingClients: boolean | null;
    priceFrom: number | null; currency: string | null; createdAt: string;
  };
  gyms: { id: string; name: string; city: string | null; address: string | null; latitude: string | null; longitude: string | null; isOwner: boolean }[];
  promotions: { id: string; kind: string; title: string; body: string | null; offerText: string | null; endsOn: string | null }[];
  memberCount: number;
  relationship: string | null;
}

const KIND_LABEL: Record<string, string> = {
  intro_offer: "Intro offer", discount: "Discount", free_consultation: "Free consultation",
  programme_launch: "New programme", announcement: "News",
};

export default function CoachProfile() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const p = useApi<Profile>(id ? `/v1/discover/coaches/${id}` : null, [id]);
  const { busy, error, run } = useAction();

  const contact = async () => {
    const ok = await run(() => api("/v1/threads/direct", { method: "POST", body: { userId: id } }));
    if (ok) router.push("/member/chat");
  };

  const requests = useApi<{ items: { gym: { id: string }; status: string }[] }>("/v1/me/join-requests", [id]);
  const statusFor = (gymId: string) => requests.data?.items.find((r) => r.gym.id === gymId)?.status ?? null;

  // Naming the coach is the point: approval then links the member to the
  // person whose profile they were reading, not to whoever clears the queue.
  const joinGym = async (gymId: string) => {
    const ok = await run(() =>
      api(`/v1/gyms/${gymId}/join-requests`, {
        method: "POST",
        body: { coachId: id, message: `Found ${c?.name ?? "you"} through the coach directory.` },
      }),
    );
    if (ok) requests.refetch();
  };

  const c = p.data?.coach;
  const connected = p.data?.relationship === "active";

  return (
    <Screen theme={theme}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.inkSoft} />
        </Pressable>
        <Text style={{ ...typo.title, color: theme.ink, flex: 1 }} numberOfLines={1}>{c?.name ?? "Coach"}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 150 }}>
        {p.loading && !p.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xxl }} />
        ) : !c ? (
          <Card theme={theme}><Text style={{ ...typo.body, color: theme.danger }}>{p.error ?? "Not found"}</Text></Card>
        ) : (
          <>
            <View style={{ alignItems: "center", marginBottom: space.lg }}>
              <View style={{ width: 76, height: 76, borderRadius: radius.pill, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 30, fontWeight: "700", color: "#FFFFFF" }}>{c.name[0]?.toUpperCase()}</Text>
              </View>
              <Text style={{ ...typo.title, color: theme.ink, marginTop: space.md }}>{c.name}</Text>
              {c.headline ? (
                <Text style={{ ...typo.body, color: theme.inkSoft, marginTop: 4, textAlign: "center" }}>{c.headline}</Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 6, marginTop: space.md }}>
                {connected && <Pill theme={theme} label="Your coach" tone={theme.teal} />}
                {c.acceptingClients === false && <Pill theme={theme} label="Not taking clients" tone={theme.muted} />}
                {c.priceFrom ? <Pill theme={theme} label={`From £${(c.priceFrom / 100).toFixed(0)}/mo`} tone={theme.accent} /> : null}
              </View>
            </View>

            {(p.data!.gyms.some((g) => statusFor(g.id) === "pending")) && (
              <Card theme={theme} style={{ marginBottom: space.md, borderColor: theme.warning, flexDirection: "row", alignItems: "center", gap: space.md }}>
                <Feather name="clock" size={17} color={theme.warning} />
                <Text style={{ ...typo.body, color: theme.inkSoft, flex: 1 }}>
                  Your request is with {c.name}. You will hear back once it is reviewed.
                </Text>
              </Card>
            )}

            <Card theme={theme} style={{ marginBottom: space.lg, flexDirection: "row" }}>
              {[
                { k: "Members", v: `${p.data!.memberCount}` },
                { k: "Experience", v: c.yearsExperience ? `${c.yearsExperience} yrs` : "—" },
                { k: "Gyms", v: `${p.data!.gyms.length}` },
              ].map((s) => (
                <View key={s.k} style={{ flex: 1, alignItems: "center" }}>
                  <Text style={{ ...typo.title, color: theme.ink }}>{s.v}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{s.k}</Text>
                </View>
              ))}
            </Card>

            {/* Promotions lead, because they are the reason to make contact. */}
            {(p.data!.promotions.length ?? 0) > 0 && (
              <>
                <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Currently offering</Text>
                {p.data!.promotions.map((promo) => (
                  <Card key={promo.id} theme={theme} style={{ marginBottom: space.sm, borderColor: theme.accent }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginBottom: 6 }}>
                      <Pill theme={theme} label={KIND_LABEL[promo.kind] ?? promo.kind} tone={theme.accent} />
                      {promo.offerText ? (
                        <Text style={{ ...typo.heading, color: theme.accent }}>{promo.offerText}</Text>
                      ) : null}
                    </View>
                    <Text style={{ ...typo.heading, color: theme.ink }}>{promo.title}</Text>
                    {promo.body ? <Text style={{ ...typo.body, color: theme.inkSoft, marginTop: 4 }}>{promo.body}</Text> : null}
                    {promo.endsOn ? (
                      <Text style={{ ...typo.caption, color: theme.muted, marginTop: 6 }}>Ends {promo.endsOn}</Text>
                    ) : null}
                  </Card>
                ))}
                <View style={{ height: space.lg }} />
              </>
            )}

            {c.bio ? (
              <>
                <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>About</Text>
                <Card theme={theme} style={{ marginBottom: space.lg }}>
                  <Text style={{ ...typo.body, color: theme.inkSoft, lineHeight: 21 }}>{c.bio}</Text>
                </Card>
              </>
            ) : null}

            {(c.specialties?.length ?? 0) > 0 && (
              <>
                <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Specialties</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: space.lg }}>
                  {c.specialties!.map((s) => (
                    <View key={s} style={{ backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 }}>
                      <Text style={{ ...typo.caption, color: theme.inkSoft }}>{s}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {(c.certifications?.length ?? 0) > 0 && (
              <>
                <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Qualifications</Text>
                <Card theme={theme} style={{ marginBottom: space.lg }}>
                  {c.certifications!.map((q, i) => (
                    <View key={q} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, borderTopWidth: i ? 1 : 0, borderTopColor: theme.line }}>
                      <Feather name="award" size={14} color={theme.teal} />
                      <Text style={{ ...typo.body, color: theme.ink }}>{q}</Text>
                    </View>
                  ))}
                </Card>
              </>
            )}

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Where they coach</Text>
            {p.data!.gyms.map((g) => (
              <Card key={g.id} theme={theme} style={{ marginBottom: space.sm }}>
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ ...typo.heading, color: theme.ink }}>{g.name}</Text>
                    <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                      {[g.city, g.isOwner ? "Owner" : "Coach"].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  {(() => {
                    const st = statusFor(g.id);
                    if (connected) return null;
                    if (st === "pending") return <Pill theme={theme} label="Requested" tone={theme.warning} />;
                    if (st === "approved") return <Pill theme={theme} label="Joined" tone={theme.teal} />;
                    return (
                      <Pressable onPress={() => joinGym(g.id)} disabled={busy}
                        style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: theme.accent }}>
                        <Text style={{ ...typo.caption, color: "#FFFFFF", fontWeight: "700" }}>
                          {st === "rejected" ? "Ask again" : "Request to join"}
                        </Text>
                      </Pressable>
                    );
                  })()}
                </View>
                {g.latitude && g.longitude ? (
                  <View style={{ marginTop: space.md }}>
                    <MapPreview theme={theme} latitude={Number(g.latitude)} longitude={Number(g.longitude)} label={g.name} height={120} />
                  </View>
                ) : null}
              </Card>
            ))}

            {error && <Text style={{ ...typo.caption, color: theme.danger, marginTop: space.md }}>{error}</Text>}
          </>
        )}
      </ScrollView>

      {c && (
        <View style={{ position: "absolute", left: space.lg, right: space.lg, bottom: insets.bottom + space.lg }}>
          {/* Message before committing --- nobody picks a coach without a
              conversation, and requiring a join first inverts that. */}
          <Pressable onPress={contact} disabled={busy}
            style={{ backgroundColor: theme.accent, borderRadius: radius.pill, paddingVertical: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 }}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <Feather name="message-circle" size={18} color="#FFFFFF" />
                <Text style={{ ...typo.heading, color: "#FFFFFF" }}>
                  {connected ? "Message your coach" : "Message before joining"}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
