import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { api } from "../../src/api/client";
import { useAction, useApi } from "../../src/api/hooks";
import { BottomSheet } from "../../src/components/BottomSheet";
import { Card, Pill, Screen } from "../../src/components/ui";
import { MapPlaceholder, MapPreview } from "../../src/components/MapPreview";
import { useAuth } from "../../src/state/auth";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface Gym {
  id: string; name: string; city: string | null; country: string | null;
  status: string; capacity: number | null; memberCount: number; pendingRequests: number; isOwner: boolean;
  address: string | null; phone: string | null; website: string | null;
  mapsUrl: string | null; latitude: string | null; longitude: string | null;
}
interface BrowseGym { id: string; name: string; city: string | null; memberCount: number; pending: boolean }

const STATUS_TONE = (t: ReturnType<typeof useAuth>["theme"], s: string) =>
  s === "active" ? t.teal : s === "pending" ? t.warning : s === "rejected" ? t.danger : t.muted;

/**
 * The gyms a coach works at, plus the two ways to get another one: join a gym
 * an admin already set up, or create your own. Joining is offered first --- a
 * chain's gyms are pre-created, and a coach who creates their own instead ends
 * up with a duplicate nobody's members can find.
 */
export default function Gyms() {
  const { theme } = useAuth();
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<"none" | "create" | "browse">("none");
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [query, setQuery] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number; source: string; label?: string } | null>(null);
  const [locating, setLocating] = useState(false);
  const { busy, error, run } = useAction();

  // Resolve the pin as the coach types, debounced --- Nominatim allows roughly
  // one request a second, and a lookup per keystroke would abuse it.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (sheet !== "create") return;
    if (!mapsUrl.trim() && address.trim().length < 4 && city.trim().length < 3) { setCoords(null); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLocating(true);
      try {
        const r = await api<{ coords: typeof coords }>("/v1/gyms/resolve-location", {
          method: "POST",
          body: { mapsUrl: mapsUrl.trim() || undefined, address: address.trim() || undefined, city: city.trim() || undefined },
        });
        setCoords(r.coords);
      } catch { setCoords(null); } finally { setLocating(false); }
    }, 900);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [mapsUrl, address, city, sheet]);

  const mine = useApi<{ items: Gym[] }>("/v1/gyms");
  const browse = useApi<{ items: BrowseGym[] }>(
    sheet === "browse" ? `/v1/gyms/browse${query.trim() ? `?q=${encodeURIComponent(query)}` : ""}` : null,
    [sheet, query],
  );

  const create = async () => {
    if (!name.trim()) return;
    const ok = await run(() =>
      api("/v1/gyms", {
        method: "POST",
        body: {
          name: name.trim(),
          city: city.trim() || undefined,
          address: address.trim() || undefined,
          phone: phone.trim() || undefined,
          website: website.trim() || undefined,
          mapsUrl: mapsUrl.trim() || undefined,
        },
      }),
    );
    if (ok) {
      setName(""); setCity(""); setAddress(""); setPhone(""); setWebsite(""); setMapsUrl(""); setCoords(null);
      setSheet("none"); mine.refetch();
    }
  };

  const requestJoin = async (id: string) => {
    if (await run(() => api(`/v1/gyms/${id}/join-requests`, { method: "POST", body: {} }))) browse.refetch();
  };

  const field = { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 12, fontSize: 15, color: theme.ink, marginBottom: space.md };

  return (
    <Screen theme={theme}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.inkSoft} />
        </Pressable>
        <Text style={{ ...typo.title, color: theme.ink, flex: 1 }}>Gyms</Text>
        <Pressable onPress={() => setSheet("create")} hitSlop={12}>
          <Feather name="plus" size={22} color={theme.accent} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={mine.refetch} tintColor={theme.accent} />}
      >
        {mine.loading && !mine.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xl }} />
        ) : (mine.data?.items.length ?? 0) === 0 ? (
          <Card theme={theme}>
            <Text style={{ ...typo.heading, color: theme.ink }}>You are not at a gym yet</Text>
            <Text style={{ ...typo.caption, color: theme.muted, marginTop: 6 }}>
              Join one your organisation already set up, or create your own for an admin to approve.
            </Text>
          </Card>
        ) : (
          mine.data!.items.map((g) => (
            <Card key={g.id} theme={theme} style={{ marginBottom: space.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.ink }}>{g.name}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 3 }}>
                    {[g.city, `${g.memberCount} member${g.memberCount === 1 ? "" : "s"}`, g.isOwner ? "You own this" : "Member"]
                      .filter(Boolean).join(" · ")}
                  </Text>
                </View>
                <Pill theme={theme} label={g.status} tone={STATUS_TONE(theme, g.status)} />
              </View>

              {/* A pending gym is invisible to members, which is not obvious
                  from a status chip alone. */}
              {g.status === "pending" && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: theme.line }}>
                  <Feather name="clock" size={13} color={theme.warning} />
                  <Text style={{ ...typo.caption, color: theme.inkSoft, flex: 1 }}>
                    Waiting for admin approval. Members cannot find it yet.
                  </Text>
                </View>
              )}
              {g.status === "rejected" && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: theme.line }}>
                  <Feather name="x-circle" size={13} color={theme.danger} />
                  <Text style={{ ...typo.caption, color: theme.inkSoft, flex: 1 }}>Not approved. Contact your administrator.</Text>
                </View>
              )}
              {(g.latitude && g.longitude) ? (
                <View style={{ marginTop: space.md }}>
                  <MapPreview theme={theme} latitude={Number(g.latitude)} longitude={Number(g.longitude)}
                    label={g.name} mapsUrl={g.mapsUrl} height={140} />
                </View>
              ) : null}

              {(g.address || g.phone || g.website) && (
                <View style={{ marginTop: space.md, gap: 6 }}>
                  {g.address ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Feather name="map-pin" size={13} color={theme.muted} />
                      <Text style={{ ...typo.caption, color: theme.inkSoft, flex: 1 }}>{g.address}</Text>
                    </View>
                  ) : null}
                  {g.phone ? (
                    <Pressable onPress={() => Linking.openURL(`tel:${g.phone}`)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Feather name="phone" size={13} color={theme.muted} />
                      <Text style={{ ...typo.caption, color: theme.accent, flex: 1 }}>{g.phone}</Text>
                    </Pressable>
                  ) : null}
                  {g.website ? (
                    <Pressable onPress={() => Linking.openURL(g.website!)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Feather name="globe" size={13} color={theme.muted} />
                      <Text style={{ ...typo.caption, color: theme.accent, flex: 1 }} numberOfLines={1}>
                        {g.website!.replace(/^https?:\/\//, "")}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              )}

              {g.pendingRequests > 0 && (
                <Pressable onPress={() => router.push("/coach/members")} style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: theme.line }}>
                  <Feather name="user-plus" size={13} color={theme.warning} />
                  <Text style={{ ...typo.caption, color: theme.warning, flex: 1, fontWeight: "600" }}>
                    {g.pendingRequests} join request{g.pendingRequests === 1 ? "" : "s"} waiting
                  </Text>
                  <Feather name="chevron-right" size={15} color={theme.muted} />
                </Pressable>
              )}
            </Card>
          ))
        )}

        <Pressable
          onPress={() => { setQuery(""); setSheet("browse"); }}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: theme.line, borderRadius: radius.pill, paddingVertical: 13, marginTop: space.md }}
        >
          <Feather name="search" size={16} color={theme.accent} />
          <Text style={{ ...typo.heading, color: theme.accent }}>Join an existing gym</Text>
        </Pressable>
      </ScrollView>

      <BottomSheet theme={theme} visible={sheet === "create"} onClose={() => setSheet("none")} heightRatio={0.88}>
        <Text style={{ ...typo.title, color: theme.ink, marginBottom: 4 }}>Create a gym</Text>
        <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.lg }}>
          An administrator reviews it before members can find it.
        </Text>

        <ScrollView keyboardShouldPersistTaps="handled">
          <TextInput style={field} placeholder="Gym name" placeholderTextColor={theme.muted} value={name} onChangeText={setName} />
          <TextInput style={field} placeholder="Street address" placeholderTextColor={theme.muted} value={address} onChangeText={setAddress} />
          <TextInput style={field} placeholder="City" placeholderTextColor={theme.muted} value={city} onChangeText={setCity} />
          <TextInput style={field} placeholder="Contact number" placeholderTextColor={theme.muted} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
          <TextInput style={field} placeholder="Website" placeholderTextColor={theme.muted} autoCapitalize="none" keyboardType="url" value={website} onChangeText={setWebsite} />
          <TextInput style={field} placeholder="Google Maps link (optional)" placeholderTextColor={theme.muted} autoCapitalize="none" value={mapsUrl} onChangeText={setMapsUrl} />

          <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>LOCATION</Text>
          {locating ? (
            <MapPlaceholder theme={theme} message="Finding the location…" height={140} />
          ) : coords ? (
            <>
              <MapPreview theme={theme} latitude={coords.latitude} longitude={coords.longitude} label={name || "Gym"} height={140} />
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: 6 }}>
                {coords.source === "url" ? "Pin taken from the link" : "Found from the address"}
                {coords.label ? ` · ${coords.label.split(",").slice(0, 3).join(",")}` : ""}
              </Text>
            </>
          ) : (
            <MapPlaceholder theme={theme} message="Add an address or paste a Google Maps link to show the location." height={140} />
          )}

          {error && <Text style={{ ...typo.caption, color: theme.danger, marginTop: space.md }}>{error}</Text>}

          <Pressable onPress={create} disabled={busy || !name.trim()}
            style={{ marginTop: space.lg, marginBottom: space.lg, backgroundColor: name.trim() ? theme.accent : theme.cardAlt, borderRadius: radius.pill, paddingVertical: 15, alignItems: "center" }}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text style={{ ...typo.heading, color: name.trim() ? "#FFFFFF" : theme.muted }}>Submit for approval</Text>
            )}
          </Pressable>
        </ScrollView>
      </BottomSheet>

      <BottomSheet theme={theme} visible={sheet === "browse"} onClose={() => setSheet("none")} heightRatio={0.75}>
        <Text style={{ ...typo.title, color: theme.ink, marginBottom: space.md }}>Join a gym</Text>
        <TextInput style={field} placeholder="Search gyms" placeholderTextColor={theme.muted} value={query} onChangeText={setQuery} />
        <ScrollView keyboardShouldPersistTaps="handled">
          {browse.loading && !browse.data ? <ActivityIndicator color={theme.accent} style={{ marginTop: space.lg }} /> :
            (browse.data?.items.length ?? 0) === 0 ? (
              <Text style={{ ...typo.caption, color: theme.muted, textAlign: "center", marginTop: space.xl }}>
                No other gyms available to join.
              </Text>
            ) : browse.data!.items.map((g) => (
              <Card key={g.id} theme={theme} style={{ marginBottom: space.sm, padding: space.md, flexDirection: "row", alignItems: "center", gap: space.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ ...typo.heading, color: theme.ink }}>{g.name}</Text>
                  <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>
                    {[g.city, `${g.memberCount} member${g.memberCount === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
                  </Text>
                </View>
                {g.pending ? (
                  <Pill theme={theme} label="Requested" tone={theme.warning} />
                ) : (
                  <Pressable onPress={() => requestJoin(g.id)} disabled={busy}
                    style={{ paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: theme.accent }}>
                    <Text style={{ ...typo.caption, color: "#FFFFFF", fontWeight: "700" }}>Request</Text>
                  </Pressable>
                )}
              </Card>
            ))}
        </ScrollView>
      </BottomSheet>
    </Screen>
  );
}
