import { Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { BottomSheet } from "./BottomSheet";
import { radius, space, type as typo, type Theme } from "../theme/tokens";

export type PlanStrategy = "propagate" | "fork" | "detach";

/**
 * Asked when a coach edits a plan that members are already following.
 *
 * The plan is on their phones, so this is a decision about PEOPLE, not about a
 * document, and there is no safe default: silently propagating rewrites a
 * programme mid-block, and silently forking leaves everyone on a version the
 * coach thinks they fixed. So the choice is explicit and the consequence of
 * each option is spelled out.
 */
export function PlanChangeSheet({
  theme, visible, members, planName, onClose, onChoose,
}: {
  theme: Theme; visible: boolean;
  members: { id: string; name: string }[];
  planName: string;
  onClose: () => void;
  onChoose: (s: PlanStrategy) => void;
}) {
  const who = members.length === 1 ? members[0]!.name : `${members.length} members`;

  const options: { key: PlanStrategy; icon: keyof typeof Feather.glyphMap; tone: string; title: string; body: string }[] = [
    {
      key: "propagate", icon: "refresh-cw", tone: theme.accent,
      title: "Update for everyone",
      body: `${who} will see the change immediately, mid-programme. Right for a correction.`,
    },
    {
      key: "fork", icon: "copy", tone: theme.teal,
      title: "Save as a new plan",
      body: `${who} stay on the current version untouched. Right for a next-intake revision.`,
    },
    {
      key: "detach", icon: "user-minus", tone: theme.warning,
      title: "Update and unassign",
      body: `Applies the change and removes ${who} from it, so nobody follows a plan that moved.`,
    },
  ];

  return (
    <BottomSheet theme={theme} visible={visible} onClose={onClose} heightRatio={0.66}>
      <Text style={{ ...typo.title, color: theme.ink }}>This plan is in use</Text>
      <Text style={{ ...typo.body, color: theme.muted, marginTop: 4, marginBottom: space.lg }}>
        {members.length === 1 ? "1 member is" : `${members.length} members are`} following “{planName}”.
        What should happen to them?
      </Text>

      {members.length > 0 && (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: space.lg }}>
          {members.slice(0, 6).map((m) => (
            <View key={m.id} style={{ backgroundColor: theme.cardAlt, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ ...typo.caption, color: theme.inkSoft }}>{m.name}</Text>
            </View>
          ))}
          {members.length > 6 && (
            <View style={{ backgroundColor: theme.cardAlt, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ ...typo.caption, color: theme.muted }}>+{members.length - 6}</Text>
            </View>
          )}
        </View>
      )}

      <ScrollView>
        {options.map((o) => (
          <Pressable
            key={o.key}
            onPress={() => { onChoose(o.key); onClose(); }}
            style={({ pressed }) => ({
              flexDirection: "row", gap: space.md, padding: space.md, marginBottom: space.sm,
              backgroundColor: pressed ? theme.cardAlt : theme.card,
              borderRadius: radius.md, borderWidth: 1, borderColor: theme.line,
            })}
          >
            <View style={{ width: 38, height: 38, borderRadius: radius.pill, backgroundColor: o.tone + "1F", alignItems: "center", justifyContent: "center" }}>
              <Feather name={o.icon} size={18} color={o.tone} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ ...typo.heading, color: theme.ink }}>{o.title}</Text>
              <Text style={{ ...typo.caption, color: theme.muted, marginTop: 3 }}>{o.body}</Text>
            </View>
          </Pressable>
        ))}

        <Pressable onPress={onClose} style={{ alignItems: "center", paddingVertical: space.md }}>
          <Text style={{ ...typo.body, color: theme.inkSoft }}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </BottomSheet>
  );
}
