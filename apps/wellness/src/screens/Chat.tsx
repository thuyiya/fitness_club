import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { api } from "../api/client";
import { useApi } from "../api/hooks";
import type { Message, Thread } from "../api/types";
import { Card, Screen } from "../components/ui";
import { useAuth } from "../state/auth";
import { radius, space, type as typo } from "../theme/tokens";

const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  return today
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};

/** Shared by both personas --- only the palette differs, and that comes from useAuth. */
export function ChatScreen() {
  const { user, theme } = useAuth();
  const insets = useSafeAreaInsets();
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const threads = useApi<{ items: Thread[] }>("/v1/threads");
  const messages = useApi<{ items: Message[] }>(openId ? `/v1/threads/${openId}/messages?limit=100` : null, [openId]);

  // Opening a thread clears its badge; the inbox must reflect that on return.
  useEffect(() => {
    if (!openId) return;
    api(`/v1/threads/${openId}/read`, { method: "POST" }).then(() => threads.refetch()).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !openId) return;
    setSending(true);
    setDraft("");
    try {
      await api(`/v1/threads/${openId}/messages`, { method: "POST", body: { body } });
      messages.refetch();
      threads.refetch();
    } catch {
      setDraft(body); // Put it back rather than losing what they typed.
    } finally {
      setSending(false);
    }
  };

  if (openId) {
    const thread = threads.data?.items.find((t) => t.id === openId);
    const other = thread?.participants[0];
    return (
      <Screen theme={theme}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }} keyboardVerticalOffset={8}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md, padding: space.lg, paddingTop: insets.top + space.md, borderBottomWidth: 1, borderBottomColor: theme.line }}>
            <Pressable onPress={() => setOpenId(null)} hitSlop={12}><Feather name="chevron-left" size={24} color={theme.inkSoft} /></Pressable>
            <View style={{ width: 36, height: 36, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ ...typo.heading, color: theme.accent }}>{other?.name?.[0]?.toUpperCase() ?? "?"}</Text>
            </View>
            <View>
              <Text style={{ ...typo.heading, color: theme.ink }}>{other?.name ?? "Conversation"}</Text>
              <Text style={{ ...typo.caption, color: theme.muted, textTransform: "capitalize" }}>{other?.role}</Text>
            </View>
          </View>

          {messages.loading && !messages.data ? (
            <ActivityIndicator color={theme.accent} style={{ marginTop: space.xxl }} />
          ) : (
            <FlatList
              ref={listRef}
              data={messages.data?.items ?? []}
              keyExtractor={(m) => m.id}
              contentContainerStyle={{ padding: space.lg, gap: space.sm }}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
              renderItem={({ item }) => {
                const mine = item.sender.id === user?.id;
                return (
                  <View style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                    <View style={{
                      backgroundColor: mine ? theme.accent : theme.card,
                      borderRadius: radius.md, borderWidth: mine ? 0 : 1, borderColor: theme.line,
                      paddingHorizontal: space.md, paddingVertical: 10,
                    }}>
                      <Text style={{ ...typo.body, color: mine ? "#FFFFFF" : theme.ink }}>{item.body}</Text>
                    </View>
                    <Text style={{ ...typo.caption, color: theme.muted, marginTop: 3, textAlign: mine ? "right" : "left" }}>
                      {when(item.createdAt)}
                    </Text>
                  </View>
                );
              }}
            />
          )}

          <View style={{ flexDirection: "row", gap: space.sm, padding: space.md, paddingBottom: insets.bottom + space.md, borderTopWidth: 1, borderTopColor: theme.line, alignItems: "flex-end" }}>
            <TextInput
              style={{ flex: 1, backgroundColor: theme.card, borderColor: theme.line, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10, color: theme.ink, maxHeight: 120 }}
              placeholder="Message"
              placeholderTextColor={theme.muted}
              value={draft}
              onChangeText={setDraft}
              multiline
              onSubmitEditing={send}
            />
            <Pressable
              onPress={send}
              disabled={!draft.trim() || sending}
              style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: draft.trim() ? theme.accent : theme.cardAlt, alignItems: "center", justifyContent: "center" }}
            >
              <Feather name="send" size={18} color={draft.trim() ? "#FFFFFF" : theme.muted} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  return (
    <Screen theme={theme}>
      <ScrollView contentContainerStyle={{ padding: space.lg, paddingTop: insets.top + space.md, paddingBottom: 120 }}>
        <Text style={{ ...typo.display, color: theme.ink, marginBottom: space.lg }}>Chat</Text>

        {threads.loading && !threads.data ? (
          <ActivityIndicator color={theme.accent} style={{ marginTop: space.xl }} />
        ) : (threads.data?.items.length ?? 0) === 0 ? (
          <Card theme={theme}>
            <Text style={{ ...typo.body, color: theme.muted }}>
              No conversations yet. {user?.role === "member" ? "Your coach can start one." : "Open one from a member's profile."}
            </Text>
          </Card>
        ) : (
          threads.data!.items.map((t) => {
            const other = t.participants[0];
            return (
              <Pressable key={t.id} onPress={() => setOpenId(t.id)}>
                <Card theme={theme} style={{ marginBottom: space.sm, flexDirection: "row", alignItems: "center", gap: space.md }}>
                  <View style={{ width: 44, height: 44, borderRadius: radius.pill, backgroundColor: theme.accent + "1F", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ ...typo.heading, color: theme.accent }}>{other?.name?.[0]?.toUpperCase() ?? "?"}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ ...typo.heading, color: theme.ink }}>{other?.name ?? "Conversation"}</Text>
                      {t.lastMessage && <Text style={{ ...typo.caption, color: theme.muted }}>{when(t.lastMessage.createdAt)}</Text>}
                    </View>
                    <Text style={{ ...typo.caption, color: t.unreadCount ? theme.ink : theme.muted, marginTop: 3 }} numberOfLines={1}>
                      {t.lastMessage?.body ?? "No messages yet"}
                    </Text>
                  </View>
                  {t.unreadCount > 0 && (
                    <View style={{ minWidth: 20, height: 20, borderRadius: radius.pill, backgroundColor: theme.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>{t.unreadCount}</Text>
                    </View>
                  )}
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}
