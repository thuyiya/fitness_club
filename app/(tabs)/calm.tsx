import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Moon, Pause, Play, RotateCcw, Sparkles, Wind } from 'lucide-react-native';
import { GlassCard, Screen, SectionHeader, Text } from '@/components';
import { MindIntro } from '@/components/MindIntro';
import { useTheme } from '@/theme';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * Calm — a mind-relaxation space. Guided breathing with a living orb that
 * expands on the inhale and settles on the exhale. Techniques are described in
 * plain wellness language so anyone under stress can just follow the rhythm.
 */

type Phase = { label: string; seconds: number; scale: number };
type Pattern = {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  phases: Phase[];
};

const IN_SCALE = 1;
const OUT_SCALE = 0.55;

function usePatterns() {
  const theme = useTheme();
  const patterns: Pattern[] = [
    {
      id: 'box',
      name: 'Steady Square',
      subtitle: 'In 4 · Hold 4 · Out 4 · Hold 4 — even and grounding',
      icon: <Wind size={18} color={theme.colors.water} />,
      phases: [
        { label: 'Breathe in', seconds: 4, scale: IN_SCALE },
        { label: 'Hold', seconds: 4, scale: IN_SCALE },
        { label: 'Breathe out', seconds: 4, scale: OUT_SCALE },
        { label: 'Hold', seconds: 4, scale: OUT_SCALE },
      ],
    },
    {
      id: 'calm478',
      name: 'Deep Calm',
      subtitle: 'In 4 · Hold 7 · Out 8 — melts tension quickly',
      icon: <Sparkles size={18} color={theme.colors.protein} />,
      phases: [
        { label: 'Breathe in', seconds: 4, scale: IN_SCALE },
        { label: 'Hold', seconds: 7, scale: IN_SCALE },
        { label: 'Breathe out', seconds: 8, scale: OUT_SCALE },
      ],
    },
    {
      id: 'release',
      name: 'Let Go',
      subtitle: 'In 4 · Hold 2 · Out 6 — a longer exhale to release',
      icon: <Moon size={18} color={theme.colors.secondary} />,
      phases: [
        { label: 'Breathe in', seconds: 4, scale: IN_SCALE },
        { label: 'Hold', seconds: 2, scale: IN_SCALE },
        { label: 'Breathe out', seconds: 6, scale: OUT_SCALE },
      ],
    },
    {
      id: 'balance',
      name: 'Even Balance',
      subtitle: 'In 5 · Out 5 — a calm, coherent rhythm',
      icon: <Wind size={18} color={theme.colors.walking} />,
      phases: [
        { label: 'Breathe in', seconds: 5, scale: IN_SCALE },
        { label: 'Breathe out', seconds: 5, scale: OUT_SCALE },
      ],
    },
  ];
  return patterns;
}

const ORB = ['#5EEAD4', '#38BDF8', '#818CF8'] as const;

export default function Calm() {
  const theme = useTheme();
  const patterns = usePatterns();

  // One-time "Clearing the Mind" intro on the first visit to this tab.
  const mindIntroSeen = useSettingsStore((s) => s.mindIntroSeen);
  const completeMindIntro = useSettingsStore((s) => s.completeMindIntro);
  const [showIntro, setShowIntro] = useState(!mindIntroSeen);

  const [patternId, setPatternId] = useState(patterns[0].id);
  const [running, setRunning] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('Ready when you are');
  const [count, setCount] = useState(0);
  const [rounds, setRounds] = useState(0);

  const pattern = patterns.find((p) => p.id === patternId) ?? patterns[0];

  const scale = useSharedValue(OUT_SCALE);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    timeoutRef.current = null;
    intervalRef.current = null;
  };

  // Drive the breathing loop whenever we're running (restarts on pattern change).
  useEffect(() => {
    if (!running) return;

    const phases = pattern.phases;
    let idx = 0;

    const startPhase = (i: number) => {
      const phase = phases[i];
      setPhaseLabel(phase.label);
      setCount(phase.seconds);
      scale.value = withTiming(phase.scale, {
        duration: phase.seconds * 1000,
        easing: Easing.inOut(Easing.quad),
      });
      Haptics.selectionAsync().catch(() => {});

      let remaining = phase.seconds;
      intervalRef.current = setInterval(() => {
        remaining -= 1;
        setCount(Math.max(remaining, 0));
      }, 1000);

      timeoutRef.current = setTimeout(() => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        const next = (i + 1) % phases.length;
        if (next === 0) setRounds((r) => r + 1);
        idx = next;
        startPhase(next);
      }, phase.seconds * 1000);
    };

    startPhase(idx);
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, patternId]);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 1.35 }],
    opacity: 0.25 + (scale.value - OUT_SCALE) * 0.4,
  }));

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setRunning((r) => !r);
  };

  const reset = () => {
    clearTimers();
    setRunning(false);
    setRounds(0);
    setCount(0);
    setPhaseLabel('Ready when you are');
    scale.value = withTiming(OUT_SCALE, { duration: 400 });
  };

  const selectPattern = (id: string) => {
    if (id === patternId) return;
    clearTimers();
    setRunning(false);
    setRounds(0);
    setCount(0);
    setPhaseLabel('Ready when you are');
    scale.value = withTiming(OUT_SCALE, { duration: 400 });
    setPatternId(id);
  };

  return (
    <Screen>
      <View style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        <Text variant="subhead" color="textTertiary">
          A moment for you
        </Text>
        <Text variant="largeTitle">Calm</Text>
        <Text variant="footnote" color="textTertiary" style={{ marginTop: 2 }}>
          Slow your breath, soften your body, and let the mind settle.
        </Text>
      </View>

      {/* Breathing orb */}
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 320 }}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 240,
              height: 240,
              borderRadius: 120,
              backgroundColor: ORB[1],
            },
            glowStyle,
          ]}
        />
        <Animated.View style={orbStyle}>
          <LinearGradient
            colors={ORB as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 240,
              height: 240,
              borderRadius: 120,
              alignItems: 'center',
              justifyContent: 'center',
              ...theme.shadows.medium,
            }}
          >
            <Text variant="title2" color="textInverse" style={{ opacity: 0.95 }}>
              {phaseLabel}
            </Text>
            {count > 0 && (
              <Text variant="numberLarge" color="textInverse">
                {count}
              </Text>
            )}
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Controls */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.md,
          marginTop: theme.spacing.sm,
        }}
      >
        <RoundButton onPress={reset} outline>
          <RotateCcw size={22} color={theme.colors.textSecondary} />
        </RoundButton>

        <Pressable onPress={toggle}>
          {({ pressed }) => (
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.secondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
                ...theme.shadows.glow,
              }}
            >
              {running ? (
                <Pause size={30} color="#fff" fill="#fff" />
              ) : (
                <Play size={30} color="#fff" fill="#fff" style={{ marginLeft: 3 }} />
              )}
            </LinearGradient>
          )}
        </Pressable>

        <RoundButton outline>
          <View style={{ alignItems: 'center' }}>
            <Text variant="headline">{rounds}</Text>
            <Text variant="caption" color="textTertiary">
              rounds
            </Text>
          </View>
        </RoundButton>
      </View>

      {/* Pattern picker */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Choose a rhythm" subtitle="Pick what feels right today" />
        <View style={{ gap: theme.spacing.sm }}>
          {patterns.map((p) => {
            const active = p.id === patternId;
            return (
              <Pressable key={p.id} onPress={() => selectPattern(p.id)}>
                <GlassCard
                  style={
                    active
                      ? { borderColor: theme.colors.primary, borderWidth: 1.5 }
                      : undefined
                  }
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 14,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.colors.primary + '14',
                      }}
                    >
                      {p.icon}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text variant="headline" color={active ? 'primary' : 'text'}>
                        {p.name}
                      </Text>
                      <Text variant="caption" color="textTertiary">
                        {p.subtitle}
                      </Text>
                    </View>
                  </View>
                </GlassCard>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Grounding note */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <GlassCard>
          <Text variant="subhead" style={{ fontWeight: '700', marginBottom: 4 }}>
            Gentle reminder
          </Text>
          <Text variant="footnote" color="textSecondary" style={{ lineHeight: 20 }}>
            There's nowhere to be but here. Let each out-breath be a little longer than the
            in-breath, unclench your jaw and shoulders, and let thoughts drift by like clouds.
            Even a few rounds is enough.
          </Text>
        </GlassCard>
      </View>

      <MindIntro
        visible={showIntro}
        onDone={() => {
          completeMindIntro();
          setShowIntro(false);
        }}
      />
    </Screen>
  );
}

function RoundButton({
  children,
  onPress,
  outline,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  outline?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surfaceGlass,
        borderWidth: outline ? StyleSheet_hairline : 0,
        borderColor: theme.colors.separator,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

const StyleSheet_hairline = 1;
