import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { BottomSheet } from "./BottomSheet";
import { radius, space, type as typo, type Theme } from "../theme/tokens";

/**
 * The coach's centre "+".
 *
 * It used to offer five things, four of which were dead ends a coach reached
 * from somewhere better anyway --- a plan is written FOR someone, so it starts
 * at that someone. Finding a member is the one action that is genuinely
 * context-free, so it is the only one here.
 *
 * The sheet closes before it navigates. Pushing a route out from under a modal
 * leaves the backdrop over the new screen on Android, and it also reads wrong:
 * a search page is a place you go, not a layer over where you were.
 */
export function CoachActionSheet({
  theme, visible, onClose,
}: { theme: Theme; visible: boolean; onClose: () => void }) {
  const findMember = () => {
    onClose();
    // Long enough for the dismissal animation; the sheet's own close spring
    // runs at speed 14, which settles well inside this.
    setTimeout(() => router.push("/coach/members"), 250);
  };

  return (
    <BottomSheet theme={theme} visible={visible} onClose={onClose} heightRatio={0.28}>
      <Text style={{ ...typo.title, color: theme.ink, marginBottom: space.md }}>Create</Text>

      <Pressable onPress={findMember} style={({ pressed }) => ({
        flexDirection: "row", alignItems: "center", gap: space.md, padding: space.md,
        backgroundColor: pressed ? theme.cardAlt : theme.card, borderRadius: radius.md,
        borderWidth: 1, borderColor: theme.line,
      })}>
        <View style={{ width: 40, height: 40, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
          <Feather name="users" size={19} color={theme.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...typo.heading, color: theme.ink }}>Find a member</Text>
          <Text style={{ ...typo.caption, color: theme.muted, marginTop: 1 }}>
            Open their profile to write or edit their plans
          </Text>
        </View>
        <Feather name="chevron-right" size={19} color={theme.muted} />
      </Pressable>
    </BottomSheet>
  );
}
