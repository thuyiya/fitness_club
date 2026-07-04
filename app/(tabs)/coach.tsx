import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Download, RotateCcw, Send, ShieldCheck, Sparkles } from 'lucide-react-native';
import { Text } from '@/components';
import { useTheme } from '@/theme';
import { useUserStore } from '@/store/userStore';
import { useAiCoachStore } from '@/store/aiCoachStore';
import { ChatMessage } from '@/types';
import { buildMessages, coachReply, MEDICAL_DISCLAIMER, SUGGESTED_PROMPTS } from '@/lib/coach';
import { MODEL } from '@/lib/llm/config';

type UiMessage = ChatMessage & { streaming?: boolean };

let idCounter = 0;
const nextId = () => `m${idCounter++}`;

export default function Coach() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useUserStore((s) => s.profile);
  const plan = useUserStore((s) => s.plan);
  const scrollRef = useRef<ScrollView>(null);

  const ai = useAiCoachStore();

  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: nextId(),
      role: 'coach',
      text: `Hi ${profile?.name ?? 'there'}! I'm your coach. Ask me about meals, workouts, macros, your progress — or just say you need motivation. 💪`,
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  // If the model was downloaded in a previous session, load it into memory when
  // the tab opens so the first message uses the on-device LLM.
  useEffect(() => {
    if (ai.available && ai.downloaded && ai.status !== 'ready' && ai.status !== 'preparing') {
      ai.ensureReady();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ai.available, ai.downloaded]);

  const scrollToEnd = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !profile || !plan || busy) return;

    const history = messages.map((m) => ({ role: m.role, text: m.text }));
    const userMsg: UiMessage = { id: nextId(), role: 'user', text: trimmed, createdAt: Date.now() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    scrollToEnd();

    // On-device LLM path (streaming) when the model is ready.
    if (ai.status === 'ready') {
      const replyId = nextId();
      setMessages((m) => [
        ...m,
        { id: replyId, role: 'coach', text: '', createdAt: Date.now() + 1, streaming: true },
      ]);
      setBusy(true);
      try {
        const msgs = buildMessages(trimmed, profile, plan, history);
        await ai.generate(msgs, (token) => {
          setMessages((m) =>
            m.map((x) => (x.id === replyId ? { ...x, text: x.text + token } : x)),
          );
          scrollToEnd();
        });
        setMessages((m) =>
          m.map((x) =>
            x.id === replyId
              ? { ...x, streaming: false, text: x.text.trim() || coachReply(trimmed, profile, plan) }
              : x,
          ),
        );
      } catch {
        // Fall back to the rule engine if generation fails.
        setMessages((m) =>
          m.map((x) =>
            x.id === replyId
              ? { ...x, streaming: false, text: coachReply(trimmed, profile, plan) }
              : x,
          ),
        );
      } finally {
        setBusy(false);
        scrollToEnd();
      }
      return;
    }

    // Rule-based fallback (offline, or model not connected yet).
    const reply: UiMessage = {
      id: nextId(),
      role: 'coach',
      text: coachReply(trimmed, profile, plan),
      createdAt: Date.now() + 1,
    };
    setMessages((m) => [...m, reply]);
    scrollToEnd();
  };

  const subtitle =
    ai.status === 'ready'
      ? '● On-device · private'
      : ai.status === 'downloading'
        ? `● Downloading · ${Math.round(ai.progress * 100)}%`
        : ai.status === 'preparing'
          ? '● Loading…'
          : '● Online · here to help';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.background]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }}
      />

      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            style={{ width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
          >
            <Sparkles size={22} color="#fff" />
          </LinearGradient>
          <View>
            <Text variant="title3">Coach</Text>
            <Text variant="caption" color="success">{subtitle}</Text>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.sm, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {ai.available && ai.status !== 'ready' && <ConnectCard />}

          {messages.map((m) => (
            <Bubble key={m.id} message={m} />
          ))}

          {messages.length <= 1 && (
            <View style={{ marginTop: theme.spacing.md, gap: 8 }}>
              <Text variant="caption" color="textTertiary">TRY ASKING</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {SUGGESTED_PROMPTS.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => send(p)}
                    style={{
                      paddingHorizontal: theme.spacing.md,
                      paddingVertical: 10,
                      borderRadius: theme.radius.pill,
                      backgroundColor: theme.colors.backgroundElevated,
                      borderWidth: 1,
                      borderColor: theme.colors.cardBorder,
                    }}
                  >
                    <Text variant="subhead" color="primary">{p}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          <Text variant="caption" color="textTertiary" center style={{ marginTop: theme.spacing.lg }}>
            {MEDICAL_DISCLAIMER}
          </Text>
        </ScrollView>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            paddingHorizontal: theme.spacing.lg,
            paddingTop: theme.spacing.sm,
            paddingBottom: insets.bottom + 70,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach anything…"
            placeholderTextColor={theme.colors.textTertiary}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            editable={!busy}
            style={{
              flex: 1,
              height: 50,
              borderRadius: theme.radius.pill,
              paddingHorizontal: theme.spacing.lg,
              backgroundColor: theme.colors.backgroundElevated,
              borderWidth: 1,
              borderColor: theme.colors.cardBorder,
              color: theme.colors.text,
              fontSize: 16,
            }}
          />
          <Pressable onPress={() => send(input)} disabled={busy}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.6 : 1 }}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Send size={20} color="#fff" />}
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

/** Opt-in / download / loading card for the on-device coach model. */
function ConnectCard() {
  const theme = useTheme();
  const { status, progress, error, downloaded, connect, ensureReady } = useAiCoachStore();

  const card = (children: React.ReactNode) => (
    <View
      style={{
        backgroundColor: theme.colors.backgroundElevated,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.md,
        gap: 10,
        ...theme.shadows.soft,
      }}
    >
      {children}
    </View>
  );

  if (status === 'downloading') {
    const pct = Math.round(progress * 100);
    return card(
      <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Download size={18} color={theme.colors.primary} />
          <Text variant="subhead">Downloading model…</Text>
        </View>
        <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.colors.cardBorder, overflow: 'hidden' }}>
          <View style={{ width: `${pct}%`, height: '100%' }}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </View>
        </View>
        <Text variant="caption" color="textTertiary">
          {pct}% of {MODEL.sizeLabel} · keeps going in the background. You can keep chatting meanwhile.
        </Text>
      </>,
    );
  }

  if (status === 'preparing') {
    return card(
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text variant="subhead">Warming up your on-device coach…</Text>
      </View>,
    );
  }

  if (status === 'error') {
    return card(
      <>
        <Text variant="subhead">Couldn't set up your coach</Text>
        <Text variant="caption" color="textTertiary">{error ?? 'Please try again.'}</Text>
        <Pressable onPress={() => (downloaded ? ensureReady() : connect())}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <RotateCcw size={16} color={theme.colors.primary} />
            <Text variant="subhead" color="primary">Try again</Text>
          </View>
        </Pressable>
      </>,
    );
  }

  // idle — offer to connect (or resume a paused download)
  return card(
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={18} color={theme.colors.primary} />
        <Text variant="subhead">Run the coach on your device</Text>
      </View>
      <Text variant="caption" color="textTertiary">
        A private coach that runs fully on your phone — your data never leaves the device.
        One-time {MODEL.sizeLabel} download over Wi-Fi.
      </Text>
      <Pressable onPress={() => connect()} style={{ marginTop: 2 }}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            paddingVertical: 12,
            borderRadius: theme.radius.pill,
          }}
        >
          <Download size={18} color="#fff" />
          <Text variant="subhead" color="textInverse">
            {downloaded ? 'Resume download' : `Enable coach (${MODEL.sizeLabel})`}
          </Text>
        </LinearGradient>
      </Pressable>
    </>,
  );
}

function Bubble({ message }: { message: UiMessage }) {
  const theme = useTheme();
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <Animated.View entering={FadeInDown.springify().damping(18)} style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
            borderRadius: theme.radius.lg,
            borderBottomRightRadius: 6,
          }}
        >
          <Text variant="callout" color="textInverse">{message.text}</Text>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18)}
      style={{
        alignSelf: 'flex-start',
        maxWidth: '86%',
        backgroundColor: theme.colors.backgroundElevated,
        borderWidth: 1,
        borderColor: theme.colors.cardBorder,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.radius.lg,
        borderBottomLeftRadius: 6,
        ...theme.shadows.soft,
      }}
    >
      <Text variant="callout" style={{ lineHeight: 22 }}>
        {message.text || (message.streaming ? '…' : '')}
      </Text>
    </Animated.View>
  );
}
