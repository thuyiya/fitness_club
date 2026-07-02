import React, { useRef, useState } from 'react';
import {
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
import { Send, Sparkles } from 'lucide-react-native';
import { Text } from '@/components';
import { useTheme } from '@/theme';
import { useUserStore } from '@/store/userStore';
import { ChatMessage } from '@/types';
import { coachReply, MEDICAL_DISCLAIMER, SUGGESTED_PROMPTS } from '@/lib/coach';

let idCounter = 0;
const nextId = () => `m${idCounter++}`;

export default function Coach() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useUserStore((s) => s.profile);
  const plan = useUserStore((s) => s.plan);
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: nextId(),
      role: 'coach',
      text: `Hi ${profile?.name ?? 'there'}! I'm your AI coach. Ask me about meals, workouts, macros, your progress — or just say you need motivation. 💪`,
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');

  const send = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || !profile || !plan) return;
    const userMsg: ChatMessage = { id: nextId(), role: 'user', text: trimmed, createdAt: Date.now() };
    const reply: ChatMessage = {
      id: nextId(),
      role: 'coach',
      text: coachReply(trimmed, profile, plan),
      createdAt: Date.now() + 1,
    };
    setMessages((m) => [...m, userMsg, reply]);
    setInput('');
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

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
            <Text variant="title3">AI Coach</Text>
            <Text variant="caption" color="success">● Online · here to help</Text>
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
          <Pressable onPress={() => send(input)}>
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }}
            >
              <Send size={20} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
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
      <Text variant="callout" style={{ lineHeight: 22 }}>{message.text}</Text>
    </Animated.View>
  );
}
