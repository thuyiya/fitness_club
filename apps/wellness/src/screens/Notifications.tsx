import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { api } from "../api/client";
import { useApi } from "../api/hooks";
import { Card, Screen } from "../components/ui";
import { useAuth } from "../state/auth";
import { radius, space, type as typo } from "../theme/tokens";

interface Notification {
  id: string; kind: string; title: string; body: string | null;
  data: Record<string, unknown> | null; readAt: string | null; createdAt: string;
}

const ICON: Record<string, keyof typeof Feather.glyphMap> = {
  announcement: "volume-2",
  message: "message-circle",
  plan_assigned: "clipboard",
  session_reminder: "calendar",
  hydration_reminder: "droplet",
  survey_assigned: "check-square",
  join_request: "user-plus",
  system: "target",
};

const ago = (iso: string) => {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export function NotificationsScreen() {
  const { theme, user } = useAuth();
  const insets = useSafeAreaInsets();
  const feed = useApi<{ items: Notification[]; unreadCount: number }>("/v1/notifications");
  const items = feed.data?.items ?? [];

  const markAll = async () => {
    await api("/v1/notifications/read", { method: "POST", body: {} }).catch(() => {});
    feed.refetch();
  };

  // Each kind knows where it leads; a notification that opens nothing is noise.
  /**
   * Where each notification leads.
   *
   * The destination depends on the ROLE as well as the kind: a join request
   * tells a coach there is something to approve and belongs in the queue, while
   * the same kind tells a member the answer came back. Routing on kind alone
   * sent coaches somewhere they could not act.
   */
  const openTarget = (n: Notification) => {
    const role = user?.role ?? "member";
    const isCoach = role === "coach" || role === "admin";

    switch (n.kind) {
      case "join_request":
        // The only notification that carries an action for the recipient.
        router.push(isCoach ? "/coach/members" : "/member/find-coach");
        return;
      case "message":
        router.push(isCoach ? "/coach/chat" : "/member/chat");
        return;
      case "session_reminder":
        router.push(isCoach ? "/coach/calendar" : "/member/calendar");
        return;
      case "plan_assigned":
        router.push(isCoach ? "/coach/settings" : "/member/training");
        return;
      case "survey_assigned":
        router.push(isCoach ? "/coach/settings" : "/member");
        return;
      case "announcement":
        router.push(isCoach ? "/coach" : "/member");
        return;
      case "hydration_reminder":
        router.push(isCoach ? "/coach" : "/member");
        return;
      default:
        // "system" covers goals set by either side.
        router.push(isCoach ? "/coach" : "/member/progress");
    }
  };

  return (
    <Screen theme={theme}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: space.lg, paddingTop: insets.top + space.md, paddingBottom: space.md }}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Feather name="chevron-left" size={24} color={theme.inkSoft} />
        </Pressable>
        <Text style={{ ...typo.title, color: theme.ink }}>Notifications</Text>
        <Pressable onPress={markAll} hitSlop={12} disabled={(feed.data?.unreadCount ?? 0) === 0}>
          <Text style={{ ...typo.caption, color: (feed.data?.unreadCount ?? 0) > 0 ? theme.accent : "transparent", fontWeight: "700" }}>
            Mark all
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: space.lg, paddingTop: 0, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={false} onRefresh={feed.refetch} tintColor={theme.accent} />}
      >
        {feed.loading && !feed.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xxl }} />
        ) : items.length === 0 ? (
          <Card theme={theme}>
            <Text style={{ ...typo.body, color: theme.muted }}>Nothing yet. You will hear about plans, sessions, surveys and messages here.</Text>
          </Card>
        ) : (
          items.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => {
                // Mark read before navigating: a badge that survives acting on
                // the thing it announced trains people to ignore the badge.
                if (!n.readAt) api("/v1/notifications/read", { method: "POST", body: { ids: [n.id] } }).then(() => feed.refetch()).catch(() => {});
                openTarget(n);
              }}
            >
              <Card
                theme={theme}
                style={{
                  marginBottom: space.sm, flexDirection: "row", gap: space.md,
                  // Unread carries a tinted edge rather than a dot: it survives
                  // a glance down a long list.
                  borderLeftWidth: n.readAt ? 1 : 3,
                  borderLeftColor: n.readAt ? theme.line : theme.accent,
                }}
              >
                <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: theme.accent + "14", alignItems: "center", justifyContent: "center" }}>
                  <Feather name={ICON[n.kind] ?? "bell"} size={17} color={theme.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={{ ...typo.heading, color: theme.ink, flex: 1 }}>{n.title}</Text>
                    <Text style={{ ...typo.caption, color: theme.muted }}>{ago(n.createdAt)}</Text>
                  </View>
                  {n.body && <Text style={{ ...typo.caption, color: theme.inkSoft, marginTop: 3 }}>{n.body}</Text>}
                  {n.kind === "join_request" && (user?.role === "coach" || user?.role === "admin") ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6 }}>
                      <Text style={{ ...typo.caption, color: theme.accent, fontWeight: "700" }}>Review request</Text>
                      <Feather name="arrow-right" size={12} color={theme.accent} />
                    </View>
                  ) : null}
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
