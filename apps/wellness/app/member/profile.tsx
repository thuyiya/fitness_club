import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { api } from "../../src/api/client";
import { isoDate, useAction, useApi } from "../../src/api/hooks";
import { Card } from "../../src/components/ui";
import { SettingsScreen } from "../../src/components/SettingsScreen";
import { useAuth } from "../../src/state/auth";
import { useUnits } from "../../src/state/units";
import { radius, space, type as typo } from "../../src/theme/tokens";

interface Me {
  user: {
    name: string; email: string; bio: string | null; sex: string | null;
    heightCm: string | null; dateOfBirth: string | null;
    activityLevel: string | null; goalType: string | null; sportProfileId: string | null;
  };
}
interface Targets {
  ready: boolean; missing?: string[];
  basis?: { tdeeKcal: number; weightKg: number; sportProfile: { label: string } | null };
  targets: { calories: number; proteinG: number; carbsG: number; fatG: number } | null;
}

const ACTIVITY = ["sedentary", "lightly_active", "moderately_active", "very_active", "extra_active"];
const GOALS = ["fat_loss", "maintain", "muscle_gain", "recomposition", "endurance", "general_health"];
const label = (s: string) => s.replace(/_/g, " ");

export default function Profile() {
  const { user, theme } = useAuth();
  const { weight: fmtWeight, height: fmtHeight, weightUnit, toKg } = useUnits();
  const me = useApi<Me>("/v1/auth/me");
  const targets = useApi<Targets>("/v1/me/targets");
  const sports = useApi<{ items: { id: string; label: string }[] }>("/v1/sport-profiles");
  const { busy, error, run } = useAction();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [height, setHeight] = useState("");
  const [newWeight, setNewWeight] = useState("");
  const [dirty, setDirty] = useState(false);

  const u = me.data?.user;
  useEffect(() => {
    if (!u) return;
    setName(u.name);
    setBio(u.bio ?? "");
    setHeight(u.heightCm ? String(Math.round(Number(u.heightCm))) : "");
  }, [u?.email]);

  const save = async () => {
    if (await run(() => api("/v1/me", { method: "PATCH", body: { name: name.trim(), bio: bio.trim(), ...(height ? { heightCm: Number(height) } : {}) } }))) {
      setDirty(false); me.refetch(); targets.refetch();
    }
  };
  const patch = async (body: Record<string, unknown>) => {
    if (await run(() => api("/v1/me", { method: "PATCH", body }))) { me.refetch(); targets.refetch(); }
  };
  const logWeight = async () => {
    const v = Number(newWeight);
    if (!Number.isFinite(v) || v <= 0) return;
    if (await run(() => api("/v1/logs/body-metrics", { method: "POST", body: { date: isoDate(new Date()), weightKg: toKg(v) } }))) {
      setNewWeight(""); targets.refetch();
    }
  };

  const field = { backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 13, fontSize: 15, color: theme.ink };
  const chip = (on: boolean) => ({
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1,
    borderColor: on ? theme.accent : theme.line, backgroundColor: on ? theme.accent + "14" : theme.card,
  });

  return (
    <SettingsScreen title="Profile">
      <View style={{ alignItems: "center", marginBottom: space.xl }}>
        <View style={{ width: 72, height: 72, borderRadius: radius.pill, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: "#FFFFFF" }}>{user?.name?.[0]?.toUpperCase() ?? "?"}</Text>
        </View>
        <Text style={{ ...typo.caption, color: theme.muted, marginTop: space.sm }}>{user?.email}</Text>
      </View>

      <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>NAME</Text>
      <TextInput style={{ ...field, marginBottom: space.lg }} value={name} onChangeText={(v) => { setName(v); setDirty(true); }} placeholderTextColor={theme.muted} />

      <Text style={{ ...typo.caption, color: theme.muted, marginBottom: 4 }}>BIO</Text>
      <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>
        Injuries, preferences, anything your coach should know before writing a plan.
      </Text>
      <TextInput
        style={{ ...field, height: 110, textAlignVertical: "top", marginBottom: space.lg }}
        value={bio}
        onChangeText={(v) => { setBio(v); setDirty(true); }}
        placeholder="Recovering from a knee injury, prefer morning sessions…"
        placeholderTextColor={theme.muted}
        multiline
      />

      <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Body</Text>
      <Card theme={theme} style={{ marginBottom: space.md }}>
        <View style={{ flexDirection: "row", paddingBottom: 10 }}>
          <Text style={{ ...typo.body, color: theme.muted, flex: 1 }}>Current weight</Text>
          <Text style={{ ...typo.body, color: theme.ink, fontWeight: "600" }}>
            {targets.data?.basis ? fmtWeight(targets.data.basis.weightKg) : "—"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: space.sm, alignItems: "center", borderTopWidth: 1, borderTopColor: theme.line, paddingTop: space.md }}>
          <TextInput
            style={{ flex: 1, backgroundColor: theme.bg, borderColor: theme.line, borderWidth: 1, borderRadius: radius.sm, padding: 11, color: theme.ink }}
            placeholder={`Log today's weight (${weightUnit})`}
            placeholderTextColor={theme.muted}
            keyboardType="decimal-pad"
            value={newWeight}
            onChangeText={setNewWeight}
          />
          <Pressable onPress={logWeight} disabled={busy || !newWeight}
            style={{ paddingHorizontal: space.lg, paddingVertical: 12, borderRadius: radius.sm, backgroundColor: newWeight ? theme.accent : theme.cardAlt }}>
            <Text style={{ ...typo.heading, color: newWeight ? "#FFFFFF" : theme.muted }}>Log</Text>
          </Pressable>
        </View>
      </Card>

      <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.lg }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>HEIGHT (CM)</Text>
          <TextInput style={field} value={height} onChangeText={(v) => { setHeight(v); setDirty(true); }} keyboardType="number-pad" placeholderTextColor={theme.muted} />
          {u?.heightCm ? <Text style={{ ...typo.caption, color: theme.muted, marginTop: 4 }}>{fmtHeight(u.heightCm)}</Text> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>SEX</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {["male", "female"].map((s) => (
              <Pressable key={s} onPress={() => patch({ sex: s })} style={{ ...chip(u?.sex === s), flex: 1, alignItems: "center" }}>
                <Text style={{ ...typo.caption, color: u?.sex === s ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Activity level</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: space.lg }}>
        {ACTIVITY.map((a) => (
          <Pressable key={a} onPress={() => patch({ activityLevel: a })} style={chip(u?.activityLevel === a)}>
            <Text style={{ ...typo.caption, color: u?.activityLevel === a ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{label(a)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Goal</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: space.lg }}>
        {GOALS.map((g) => (
          <Pressable key={g} onPress={() => patch({ goalType: g })} style={chip(u?.goalType === g)}>
            <Text style={{ ...typo.caption, color: u?.goalType === g ? theme.accent : theme.inkSoft, fontWeight: "600", textTransform: "capitalize" }}>{label(g)}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: 4 }}>Sport of focus</Text>
      <Text style={{ ...typo.caption, color: theme.muted, marginBottom: space.sm }}>
        Replaces the generic macro split with that sport's own g/kg prescription.
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: space.lg }}>
        <Pressable onPress={() => patch({ sportProfileId: null })} style={chip(!u?.sportProfileId)}>
          <Text style={{ ...typo.caption, color: !u?.sportProfileId ? theme.accent : theme.inkSoft, fontWeight: "600" }}>None</Text>
        </Pressable>
        {(sports.data?.items ?? []).map((s) => (
          <Pressable key={s.id} onPress={() => patch({ sportProfileId: s.id })} style={chip(u?.sportProfileId === s.id)}>
            <Text style={{ ...typo.caption, color: u?.sportProfileId === s.id ? theme.accent : theme.inkSoft, fontWeight: "600" }}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {targets.data?.ready && targets.data.targets ? (
        <Card theme={theme}>
          <Text style={{ ...typo.label, color: theme.muted, textTransform: "uppercase", marginBottom: space.sm }}>Daily targets</Text>
          <View style={{ flexDirection: "row" }}>
            {[
              { k: "Calories", v: targets.data.targets.calories.toLocaleString() },
              { k: "Protein", v: `${targets.data.targets.proteinG}g` },
              { k: "Carbs", v: `${targets.data.targets.carbsG}g` },
              { k: "Fat", v: `${targets.data.targets.fatG}g` },
            ].map((s) => (
              <View key={s.k} style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ ...typo.heading, color: theme.ink }}>{s.v}</Text>
                <Text style={{ ...typo.caption, color: theme.muted, marginTop: 2 }}>{s.k}</Text>
              </View>
            ))}
          </View>
          <Text style={{ ...typo.caption, color: theme.muted, marginTop: space.md, paddingTop: space.md, borderTopWidth: 1, borderTopColor: theme.line }}>
            TDEE {targets.data.basis!.tdeeKcal.toLocaleString()} kcal
            {targets.data.basis!.sportProfile ? ` · ${targets.data.basis!.sportProfile.label} prescription` : " · goal-based split"}
          </Text>
        </Card>
      ) : targets.data ? (
        <Card theme={theme} style={{ borderColor: theme.warning }}>
          <Text style={{ ...typo.body, color: theme.inkSoft }}>
            Still needed for your targets: {targets.data.missing?.join(", ")}
          </Text>
        </Card>
      ) : null}

      {error && <Text style={{ ...typo.caption, color: theme.danger, marginTop: space.md }}>{error}</Text>}

      {dirty && (
        <Pressable onPress={save} disabled={busy}
          style={{ marginTop: space.lg, backgroundColor: theme.accent, borderRadius: radius.pill, paddingVertical: 15, alignItems: "center" }}>
          {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={{ ...typo.heading, color: "#FFFFFF" }}>Save changes</Text>}
        </Pressable>
      )}
    </SettingsScreen>
  );
}
