import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Download, Leaf, RotateCcw, Send, ShieldCheck, Sparkles } from 'lucide-react-native';
import { Text } from '@/components';
import { useTheme } from '@/theme';
import { useUserStore } from '@/store/userStore';
import { useAiCoachStore } from '@/store/aiCoachStore';
import { useLogStore } from '@/store/logStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useCoachPlanStore, planTitle } from '@/store/coachPlanStore';
import { ChatMessage } from '@/types';
import {
  AI_PREPARING_PROMPT,
  buildMessages,
  coachReply,
  coachRuleReply,
  DOWNLOAD_AI_PROMPT,
  MEDICAL_DISCLAIMER,
  SUGGESTED_PROMPTS,
} from '@/lib/coach';
import { useMoodStore } from '@/store/moodStore';
import { inferStatesFromLatest } from '@/lib/mood/inferStates';
import { CoachAction, parseCoachActions, summarizeActions } from '@/lib/coachActions';
import { MODEL } from '@/lib/llm/config';
import { CoachSuggestion, suggestForChat } from '@/lib/coachSuggest';
import { CoachSuggestionCard } from '@/components/CoachSuggestionCard';

type UiMessage = ChatMessage & { streaming?: boolean; suggestions?: CoachSuggestion[] };

let idCounter = 0;
const nextId = () => `m${idCounter++}`;

export default function Coach() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useUserStore((s) => s.profile);
  const plan = useUserStore((s) => s.plan);
  const updateProfile = useUserStore((s) => s.updateProfile);
  const log = useLogStore();
  const setFocus = useSettingsStore((s) => s.setFocus);
  const addPlan = useCoachPlanStore((s) => s.addPlan);
  const scrollRef = useRef<ScrollView>(null);

  const ai = useAiCoachStore();

  const [messages, setMessages] = useState<UiMessage[]>([
    {
      id: nextId(),
      role: 'coach',
      text: `Hi ${profile?.name ?? 'there'}! I'm Lumora, your wellness coach. Ask me anything — or tell me what you ate, how you moved, or how you're feeling. If something's weighing on you, I can suggest a journey or breath you can play right here. 🌿`,
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [offerCalm, setOfferCalm] = useState(false);
  const [kbVisible, setKbVisible] = useState(false);

  // Track the keyboard so the composer hugs it (and drops the tab-bar clearance).
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKbVisible(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKbVisible(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  /** Apply a parsed action to the relevant store. */
  const applyAction = (a: CoachAction) => {
    switch (a.type) {
      case 'meal':
        log.addMeal(a.calories, a.proteinG);
        break;
      case 'walk':
        if (a.minutes > 0) log.addWalking(a.minutes);
        if (a.distanceKm > 0) log.addDistance(a.distanceKm);
        break;
      case 'workout':
        log.addWorkout(a.minutes);
        break;
      case 'sleep':
        log.setSleep(a.hours);
        break;
      case 'water':
        log.addWater(a.ml);
        break;
      case 'targetWeight':
        updateProfile({ targetWeightKg: a.kg });
        break;
      case 'focus':
        setFocus(a.mode);
        break;
    }
  };

  /** Save the coach's most recent substantial reply as a workout/meal plan. */
  const handleSavePlan = (kind: 'workout' | 'meal') => {
    const lastCoach = [...messages].reverse().find((m) => m.role === 'coach' && m.text.length > 60);
    if (!lastCoach) {
      pushCoach(
        `Tell me what you'd like first — e.g. "make me a 3-day ${kind} plan" — then say "add it to my ${kind} plan" and I'll save it to your ${kind === 'workout' ? 'Workouts' : 'Meals'} tab. 🙂`,
      );
      return;
    }
    addPlan(kind, { title: planTitle(lastCoach.text, kind), body: lastCoach.text });
    pushCoach(
      `Saved to your ${kind === 'workout' ? 'Workouts' : 'Meals'} tab under "From your coach". You can open it there anytime. ✅`,
    );
  };

  const pushCoach = (text: string, suggestions?: CoachSuggestion[]) =>
    setMessages((m) => [
      ...m,
      { id: nextId(), role: 'coach', text, createdAt: Date.now() + 1, suggestions },
    ]);

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
    setOfferCalm(false);
    scrollToEnd();

    // How the user feels right now: their words + latest mood check-in. Drives
    // the playable journey/breath suggestions attached to Lumora's reply.
    const moodStates = inferStatesFromLatest(useMoodStore.getState().latest());
    const suggestions = suggestForChat(trimmed, moodStates);

    // 1) Deterministic intents: logging, profile edits, plan-saving, distress.
    //    Handled locally so they're reliable and instant, model or not.
    const parsed = parseCoachActions(trimmed);
    if (parsed.savePlan) {
      handleSavePlan(parsed.savePlan);
      scrollToEnd();
      return;
    }
    if (parsed.actions.length > 0) {
      parsed.actions.forEach(applyAction);
      pushCoach(summarizeActions(parsed.actions));
      scrollToEnd();
      return;
    }
    if (parsed.calm) {
      // Offer concrete, playable sessions when we can match the feeling;
      // otherwise fall back to the generic "Open Calm" pill.
      if (suggestions.length > 0) pushCoach(parsed.calm, suggestions);
      else {
        pushCoach(parsed.calm);
        setOfferCalm(true);
      }
      scrollToEnd();
      return;
    }

    // 2) On-device LLM path (streaming) when the model is ready.
    if (ai.status === 'ready') {
      const replyId = nextId();
      setMessages((m) => [
        ...m,
        { id: replyId, role: 'coach', text: '', createdAt: Date.now() + 1, streaming: true },
      ]);
      setBusy(true);
      try {
        const msgs = buildMessages(trimmed, profile, plan, history, log.today(), moodStates);
        await ai.generate(msgs, (token) => {
          setMessages((m) =>
            m.map((x) => (x.id === replyId ? { ...x, text: x.text + token } : x)),
          );
          scrollToEnd();
        });
        setMessages((m) =>
          m.map((x) =>
            x.id === replyId
              ? {
                  ...x,
                  streaming: false,
                  text: x.text.trim() || coachReply(trimmed, profile, plan),
                  suggestions: suggestions.length ? suggestions : undefined,
                }
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

    // Rule-based fallback (offline, or model not connected yet). If the rule
    // engine can't answer specifically, nudge the user to download the offline
    // coach rather than showing generic filler.
    const specific = coachRuleReply(trimmed, profile, plan);
    let fallbackText: string;
    if (specific) {
      fallbackText = specific;
    } else if (ai.status === 'downloading' || ai.status === 'preparing') {
      fallbackText = AI_PREPARING_PROMPT;
    } else if (ai.available) {
      fallbackText = DOWNLOAD_AI_PROMPT;
    } else {
      fallbackText = coachReply(trimmed, profile, plan);
    }
    const reply: UiMessage = {
      id: nextId(),
      role: 'coach',
      text: fallbackText,
      createdAt: Date.now() + 1,
      suggestions: suggestions.length ? suggestions : undefined,
    };
    setMessages((m) => [...m, reply]);
    scrollToEnd();
  };

  const preparing = ai.status === 'preparing';
  // Block sending while the model loads into memory — it can take a moment and
  // tapping send would otherwise feel broken. `busy` covers active generation.
  const sendDisabled = busy || preparing;

  const subtitle =
    ai.status === 'ready'
      ? '● On-device · private'
      : ai.status === 'downloading'
        ? `● Downloading · ${Math.round(ai.progress * 100)}%`
        : ai.status === 'preparing'
          ? '● Setting up…'
          : '● Online · here to help';

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.background]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 260 }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              style={{ width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}
            >
              <Sparkles size={22} color="#fff" />
            </LinearGradient>
            <View>
              <Text variant="title3">Lumora</Text>
              <Text variant="caption" color="success">{subtitle}</Text>
            </View>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: theme.spacing.lg, gap: theme.spacing.sm, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {ai.available && ai.status !== 'ready' && <ConnectCard />}

          {messages.map((m) => (
            <Bubble key={m.id} message={m} />
          ))}

          {offerCalm && (
            <Pressable onPress={() => router.navigate('/calm')} style={{ alignSelf: 'flex-start' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  paddingHorizontal: theme.spacing.md,
                  paddingVertical: 10,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.backgroundElevated,
                  borderWidth: 1,
                  borderColor: theme.colors.cardBorder,
                }}
              >
                <Leaf size={16} color={theme.colors.primary} />
                <Text variant="subhead" color="primary">
                  Open Calm & breathe
                </Text>
              </View>
            </Pressable>
          )}

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
            // Hug the keyboard when open; clear the floating tab bar when closed.
            paddingBottom: kbVisible ? theme.spacing.sm : insets.bottom + 70,
          }}
        >
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={preparing ? 'Setting up your coach…' : 'Ask Lumora anything…'}
            placeholderTextColor={theme.colors.textTertiary}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            editable={!sendDisabled}
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
              opacity: preparing ? 0.6 : 1,
            }}
          />
          <Pressable onPress={() => send(input)} disabled={sendDisabled}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', opacity: sendDisabled ? 0.6 : 1 }}
            >
              {sendDisabled ? <ActivityIndicator color="#fff" /> : <Send size={20} color="#fff" />}
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
  const { status, progress, error, downloaded, connect, ensureReady, redownload } = useAiCoachStore();

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
      <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text variant="subhead">Setting up your coach…</Text>
        </View>
        <Text variant="caption" color="textTertiary">
          Loading the model into memory — this takes a few moments the first time. You can chat as soon as it's ready.
        </Text>
      </>,
    );
  }

  if (status === 'error') {
    return card(
      <>
        <Text variant="subhead">Couldn't set up your coach</Text>
        <Text variant="caption" color="textTertiary">
          {downloaded
            ? "The model downloaded but couldn't load. This usually fixes itself on a retry — or re-download a fresh copy."
            : error ?? 'Please try again.'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 2 }}>
          <Pressable onPress={() => (downloaded ? ensureReady() : connect())}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <RotateCcw size={16} color={theme.colors.primary} />
              <Text variant="subhead" color="primary">Try again</Text>
            </View>
          </Pressable>
          {downloaded && (
            <Pressable onPress={() => redownload()}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Download size={16} color={theme.colors.textTertiary} />
                <Text variant="subhead" color="textTertiary">Re-download</Text>
              </View>
            </Pressable>
          )}
        </View>
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

      {message.suggestions && message.suggestions.length > 0 && (
        <View style={{ marginTop: 12, gap: 8 }}>
          <Text variant="caption" color="textTertiary">
            FOR HOW YOU'RE FEELING
          </Text>
          {message.suggestions.map((s) => (
            <CoachSuggestionCard key={`${s.kind}:${s.id}`} suggestion={s} />
          ))}
        </View>
      )}
    </Animated.View>
  );
}
