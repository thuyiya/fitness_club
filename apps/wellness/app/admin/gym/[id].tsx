import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { api } from "../../../src/api/client";
import { useAction, useApi } from "../../../src/api/hooks";
import { MapPlaceholder, MapPreview } from "../../../src/components/MapPreview";
import { Card, Pill, Screen } from "../../../src/components/ui";
import { useAuth } from "../../../src/state/auth";
import { radius, space, type as typo } from "../../../src/theme/tokens";

interface Detail {
  gym: {
    id: string; name: string; status: string; address: string | null; city: string | null; country: string | null;
    phone: string | null; website: string | null; mapsUrl: string | null;
    latitude: string | null; longitude: string | null; capacity: number | null; createdAt: string;
  };
  owner: { id: string; name: string; email: string; phone: string | null; status: string; createdAt: string; lastSeenAt: string | null };
  instructors: { id: string; name: string; email: string; role: string; joinedAt: string; status: string }[];
  members: { id: string; name: string; email: string; joinedAt: string; status: string }[];
  pendingRequests: number;
  reports: { id: string; reason: string; detail: string | null; status: string; createdAt: string; resolutionNote: string | null; reporter: { id: string; name: string } | null }[];
  openReports: number;
}

const tone = (t: ReturnType<typeof useAuth>["theme"], s: string) =>
  s === "active" || s === "resolved" ? t.teal : s === "pending" || s === "open" || s === "reviewing" ? t.warning
  : s === "rejected" || s === "dismissed" ? t.danger : t.muted;

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

export default function AdminGymDetail() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useApi<Detail>(id ? `/v1/admin/gyms/${id}` : null, [id]);
  const { busy, run } = useAction();

  const decide = async (decision: "active" | "rejected" | "archived") => {
    if (await run(() => api(`/v1/admin/gyms/${id}/decide`, { method: "POST", body: { decision } }))) d.refetch();
  };
  const resolveReport = async (reportId: string, status: "resolved" | "dismissed") => {
    if (await run(() => api(`/v1/admin/gym-reports/${reportId}`, { method: "PATCH", body: { status } }))) d.refetch();
  };

  const g = d.data?.gym;

  return (
    <Screen theme={theme}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.inkSoft} />
        </Pressable>
        <Text style={{ ...typo.title, color: theme.ink, flex: 1 }} numberOfLines={1}>{g?.name ?? "Gym"}</Text>
        {g ? <Pill theme={theme} label={g.status} tone={tone(theme, g.status)} /> : null}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 140 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={d.refetch} tintColor={theme.accent} />}
      >
        {d.loading && !d.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xxl }} />
        ) : !d.data || !g ? (
          <Card theme={theme}><Text style={{ ...typo.body, color: theme.danger }}>{d.error ?? "Not found"}</Text></Card>
        ) : (
          <>
            {g.latitude && g.longitude ? (
              <MapPreview theme={theme} latitude={Number(g.latitude)} longitude={Number(g.longitude)}
                label={g.name} mapsUrl={g.mapsUrl} height={150} />
            ) : (
              <MapPlaceholder theme={theme} message="No location on file for this gym." height={110} />
            )}

            <Card theme={theme} style={{ marginTop: space.md, marginBottom: space.lg }}>
              <View style={{ flexDirection: "row" }}>
                {[
                  { k: "Coaches", v: d.data.instructors.length },
                  { k: "Members", v: d.data.members.length },
                  { k: "Requests", v: d.data.pendingRequests },
                  { k: "Reports", v: d.data.openReports },
                ].map((s) => (
                  <View key={s.k} style={{ flex: 1 }}>
                    <Text style={{ ...typo.title, color: s.k === "Reports" && s.v > 0 ? theme.danger : theme.ink }}>{s.v}</Text>
                    <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{s.k}</Text>
                  </View>
                ))}
              </View>
            </Card>

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Contact</Text>
            <Card theme={theme} style={{ marginBottom: space.lg, gap: 10 }}>
              {[
                { icon: "map-pin" as const, value: [g.address, g.city, g.country].filter(Boolean).join(", ") || "No address", link: null },
                { icon: "phone" as const, value: g.phone ?? "No number", link: g.phone ? `tel:${g.phone}` : null },
                { icon: "globe" as const, value: g.website?.replace(/^https?:\/\//, "") ?? "No website", link: g.website },
                { icon: "users" as const, value: g.capacity ? `Capacity ${g.capacity}` : "No capacity set", link: null },
              ].map((r) => (
                <Pressable key={r.icon} disabled={!r.link} onPress={() => r.link && Linking.openURL(r.link)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Feather name={r.icon} size={14} color={theme.muted} />
                  <Text style={{ ...typo.body, color: r.link ? theme.accent : theme.inkSoft, flex: 1 }} numberOfLines={1}>{r.value}</Text>
                </Pressable>
              ))}
            </Card>

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Owner</Text>
            <Card theme={theme} style={{ marginBottom: space.lg }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ ...typo.title, color: theme.accent }}>{d.data.owner.name[0]?.toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.ink }}>{d.data.owner.name}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{d.data.owner.email}</Text>
                </View>
                <Pill theme={theme} label={d.data.owner.status} tone={tone(theme, d.data.owner.status)} />
              </View>
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: theme.line }}>
                Joined {when(d.data.owner.createdAt)}
                {d.data.owner.lastSeenAt ? ` · last seen ${when(d.data.owner.lastSeenAt)}` : " · never signed in"}
              </Text>
            </Card>

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>
              Instructors ({d.data.instructors.length})
            </Text>
            {d.data.instructors.length === 0 ? (
              <Card theme={theme} style={{ marginBottom: space.lg }}>
                <Text style={{ ...typo.body, color: theme.muted }}>No coaches attached yet.</Text>
              </Card>
            ) : (
              <View style={{ marginBottom: space.lg }}>
                {d.data.instructors.map((i) => (
                  <Card key={i.id} theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md }}>
                    <View style={{ width: 34, height: 34, borderRadius: radius.pill, backgroundColor: theme.teal + "1F", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ ...typo.heading, color: theme.teal }}>{i.name[0]?.toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typo.body, color: theme.ink }}>{i.name}</Text>
                      <Text style={{ ...typo.caption, color: theme.muted }}>{i.email}</Text>
                    </View>
                    <Pill theme={theme} label={i.role} tone={theme.muted} />
                  </Card>
                ))}
              </View>
            )}

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>
              Members ({d.data.members.length})
            </Text>
            {d.data.members.length === 0 ? (
              <Card theme={theme} style={{ marginBottom: space.lg }}>
                <Text style={{ ...typo.body, color: theme.muted }}>Nobody has joined yet.</Text>
              </Card>
            ) : (
              <View style={{ marginBottom: space.lg }}>
                {d.data.members.slice(0, 10).map((m) => (
                  <Card key={m.id} theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md, paddingVertical: space.md }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ ...typo.body, color: theme.ink }}>{m.name}</Text>
                      <Text style={{ ...typo.caption, color: theme.muted }}>joined {when(m.joinedAt)}</Text>
                    </View>
                  </Card>
                ))}
                {d.data.members.length > 10 && (
                  <Text style={{ ...typo.caption, color: theme.muted, textAlign: "center" }}>
                    and {d.data.members.length - 10} more
                  </Text>
                )}
              </View>
            )}

            <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>
              Complaints ({d.data.reports.length})
            </Text>
            {d.data.reports.length === 0 ? (
              <Card theme={theme} style={{ marginBottom: space.lg }}>
                <Text style={{ ...typo.body, color: theme.muted }}>None filed against this gym.</Text>
                <Text style={{ ...typo.caption, color: theme.muted, marginTop: 6 }}>
                  Members cannot file one from the app yet — the moderation side is built, the reporting form is not.
                </Text>
              </Card>
            ) : (
              <View style={{ marginBottom: space.lg }}>
                {d.data.reports.map((r) => (
                  <Card key={r.id} theme={theme} style={{ marginBottom: space.sm }}>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Text style={{ ...typo.heading, color: theme.ink, flex: 1, textTransform: "capitalize" }}>
                        {r.reason.replace(/_/g, " ")}
                      </Text>
                      <Pill theme={theme} label={r.status} tone={tone(theme, r.status)} />
                    </View>
                    {r.detail && <Text style={{ ...typo.body, color: theme.inkSoft, marginTop: 6 }}>{r.detail}</Text>}
                    <Text style={{ ...typo.caption, color: theme.muted, marginTop: 6 }}>
                      {r.reporter?.name ?? "Deleted account"} · {when(r.createdAt)}
                    </Text>
                    {(r.status === "open" || r.status === "reviewing") && (
                      <View style={{ flexDirection: "row", gap: space.sm, marginTop: space.md }}>
                        <Pressable onPress={() => resolveReport(r.id, "resolved")} disabled={busy}
                          style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.sm, backgroundColor: theme.teal }}>
                          <Text style={{ ...typo.caption, color: "#FFFFFF", fontWeight: "700" }}>Resolve</Text>
                        </Pressable>
                        <Pressable onPress={() => resolveReport(r.id, "dismissed")} disabled={busy}
                          style={{ flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.sm, borderWidth: 1, borderColor: theme.line }}>
                          <Text style={{ ...typo.caption, color: theme.inkSoft, fontWeight: "700" }}>Dismiss</Text>
                        </Pressable>
                      </View>
                    )}
                  </Card>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {g?.status === "pending" && (
        <View style={{ position: "absolute", left: space.lg, right: space.lg, bottom: insets.bottom + space.lg, flexDirection: "row", gap: space.sm }}>
          <Pressable onPress={() => decide("rejected")} disabled={busy}
            style={{ flex: 1, alignItems: "center", paddingVertical: 15, borderRadius: radius.pill, borderWidth: 1, borderColor: theme.line, backgroundColor: theme.card }}>
            <Text style={{ ...typo.heading, color: theme.inkSoft }}>Reject</Text>
          </Pressable>
          <Pressable onPress={() => decide("active")} disabled={busy}
            style={{ flex: 2, alignItems: "center", paddingVertical: 15, borderRadius: radius.pill, backgroundColor: theme.teal }}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ ...typo.heading, color: "#FFFFFF" }}>Approve gym</Text>}
          </Pressable>
        </View>
      )}
    </Screen>
  );
}
