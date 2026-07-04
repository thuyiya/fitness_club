import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Lock,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Square,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react-native';
import {
  BreathingAura,
  GlassCard,
  Screen,
  SectionHeader,
  SegmentedControl,
  Text,
} from '@/components';
import { MindIntro } from '@/components/MindIntro';
import { useTheme } from '@/theme';
import { useSettingsStore } from '@/store/settingsStore';
import { useCalmAudio } from '@/lib/useCalmAudio';
import { BedId, BEDS } from '@/lib/calmSounds';
import { GUIDED_SESSIONS } from '@/lib/calmSessions';
import { formatTime, useGuidedPlayer } from '@/lib/useGuidedPlayer';

/**
 * Calm — a mind-relaxation space with two modes:
 *  · Breathe  — guided breathing with a living orb + ambient beds + spoken cues.
 *  · Journeys — narrated Buddhist meditations that play over a soft bed.
 * Both share the same breathing aura so the screen always feels alive.
 */

type Mode = 'breathe' | 'journeys';

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
  const audio = useCalmAudio();
  const guided = useGuidedPlayer();

  const [mode, setMode] = useState<Mode>('breathe');

  // One-time "Clearing the Mind" intro on the first visit to this tab.
  const mindIntroSeen = useSettingsStore((s) => s.mindIntroSeen);
  const completeMindIntro = useSettingsStore((s) => s.completeMindIntro);
  const [showIntro, setShowIntro] = useState(!mindIntroSeen);

  // Sound + voice preferences (persisted).
  const calmBed = useSettingsStore((s) => s.calmBed) as BedId;
  const setCalmBed = useSettingsStore((s) => s.setCalmBed);
  const calmVoiceCues = useSettingsStore((s) => s.calmVoiceCues);
  const toggleCalmVoiceCues = useSettingsStore((s) => s.toggleCalmVoiceCues);

  const [patternId, setPatternId] = useState(patterns[0].id);
  const [running, setRunning] = useState(false);
  const [phaseLabel, setPhaseLabel] = useState('Ready when you are');
  const [count, setCount] = useState(0);
  const [rounds, setRounds] = useState(0);

  const pattern = patterns.find((p) => p.id === patternId) ?? patterns[0];

  const scale = useSharedValue(OUT_SCALE);
  const ambiance = useSharedValue(0);
  const ripple = useSharedValue(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const voiceRef = useRef(calmVoiceCues);
  voiceRef.current = calmVoiceCues;
  const bedRef = useRef(calmBed);
  bedRef.current = calmBed;

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

      if (phase.label === 'Breathe in') {
        ripple.value = 0;
        ripple.value = withTiming(1, {
          duration: phase.seconds * 1000,
          easing: Easing.out(Easing.quad),
        });
      }
      if (voiceRef.current) audio.speakCue(phase.label);

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

  // In Journeys mode, gently auto-breathe the orb while a session plays.
  useEffect(() => {
    if (mode !== 'journeys') return;
    if (guided.state.isPlaying) {
      ambiance.value = withTiming(1, { duration: 900 });
      scale.value = withRepeat(
        withTiming(IN_SCALE, { duration: 5000, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
      cancelAnimation(ripple);
      ripple.value = 0;
      ripple.value = withRepeat(
        withTiming(1, { duration: 5000, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      );
    } else {
      cancelAnimation(scale);
      cancelAnimation(ripple);
      scale.value = withTiming(OUT_SCALE, { duration: 800 });
      ambiance.value = withTiming(guided.state.activeId ? 0.4 : 0, { duration: 600 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, guided.state.isPlaying, guided.state.activeId]);

  const orbStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * 1.35 }],
    opacity: 0.25 + (scale.value - OUT_SCALE) * 0.4,
  }));

  const toggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const next = !running;
    setRunning(next);
    if (next) {
      ambiance.value = withTiming(1, { duration: 900 });
      audio.startBed(bedRef.current);
    } else {
      ambiance.value = withTiming(0, { duration: 700 });
      audio.pauseBed();
      audio.stopSpeaking();
    }
  };

  const reset = () => {
    clearTimers();
    setRunning(false);
    setRounds(0);
    setCount(0);
    setPhaseLabel('Ready when you are');
    cancelAnimation(scale);
    scale.value = withTiming(OUT_SCALE, { duration: 400 });
    ambiance.value = withTiming(0, { duration: 500 });
    audio.pauseBed();
    audio.stopSpeaking();
  };

  const selectPattern = (id: string) => {
    if (id === patternId) return;
    clearTimers();
    setRunning(false);
    setRounds(0);
    setCount(0);
    setPhaseLabel('Ready when you are');
    scale.value = withTiming(OUT_SCALE, { duration: 400 });
    ambiance.value = withTiming(0, { duration: 500 });
    audio.pauseBed();
    audio.stopSpeaking();
    setPatternId(id);
  };

  const selectBed = (id: BedId) => {
    setCalmBed(id);
    if (running) audio.startBed(id);
  };

  const onToggleVoice = () => {
    Haptics.selectionAsync().catch(() => {});
    if (calmVoiceCues) audio.stopSpeaking();
    toggleCalmVoiceCues();
  };

  const changeMode = (next: Mode) => {
    if (next === mode) return;
    if (next === 'journeys') {
      reset(); // stop any breathing session + its audio
    } else {
      guided.stop();
      cancelAnimation(scale);
      scale.value = withTiming(OUT_SCALE, { duration: 500 });
      ambiance.value = withTiming(0, { duration: 500 });
    }
    setMode(next);
  };

  const onPlayJourney = (id: string) => {
    const session = GUIDED_SESSIONS.find((s) => s.id === id);
    if (!session || !session.takes) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (guided.state.activeId === id) {
      guided.togglePlay();
    } else {
      guided.play(session);
    }
  };

  const activeSession = GUIDED_SESSIONS.find((s) => s.id === guided.state.activeId);
  const remainingMs = Math.max(guided.state.durationMs - guided.state.positionMs, 0);

  // Orb centre content depends on the current mode / state.
  const orbColors =
    mode === 'journeys' && activeSession
      ? ([ORB[0], activeSession.accent, ORB[2]] as const)
      : ORB;

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

      <SegmentedControl<Mode>
        options={[
          { label: 'Breathe', value: 'breathe' },
          { label: 'Journeys', value: 'journeys' },
        ]}
        value={mode}
        onChange={changeMode}
      />

      {/* Breathing orb with its living aura (shared by both modes) */}
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 320, marginTop: theme.spacing.sm }}>
        <BreathingAura scale={scale} ambiance={ambiance} ripple={ripple} colors={orbColors} />

        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 220,
              height: 220,
              borderRadius: 110,
              backgroundColor: orbColors[1],
            },
            glowStyle,
          ]}
        />
        <Animated.View style={orbStyle}>
          <LinearGradient
            colors={orbColors as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              width: 220,
              height: 220,
              borderRadius: 110,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 24,
              ...theme.shadows.medium,
            }}
          >
            {mode === 'breathe' ? (
              <>
                <Text variant="title2" color="textInverse" style={{ opacity: 0.95 }}>
                  {phaseLabel}
                </Text>
                {count > 0 && (
                  <Text variant="numberLarge" color="textInverse">
                    {count}
                  </Text>
                )}
              </>
            ) : guided.state.activeId ? (
              <>
                <Text
                  variant="caption"
                  color="textInverse"
                  style={{ opacity: 0.85, letterSpacing: 1 }}
                >
                  {guided.state.isPlaying ? 'NOW PLAYING' : 'PAUSED'}
                </Text>
                <Text variant="numberLarge" color="textInverse">
                  {formatTime(remainingMs)}
                </Text>
              </>
            ) : (
              <Text
                variant="title3"
                color="textInverse"
                style={{ opacity: 0.95, textAlign: 'center' }}
              >
                Pick a{'\n'}journey
              </Text>
            )}
          </LinearGradient>
        </Animated.View>
      </View>

      {mode === 'breathe' ? (
        <BreatheMode
          running={running}
          rounds={rounds}
          patterns={patterns}
          patternId={patternId}
          calmBed={calmBed}
          calmVoiceCues={calmVoiceCues}
          onToggle={toggle}
          onReset={reset}
          onSelectPattern={selectPattern}
          onSelectBed={selectBed}
          onToggleVoice={onToggleVoice}
        />
      ) : (
        <JourneysMode
          activeSession={activeSession}
          isPlaying={guided.state.isPlaying}
          progress={guided.state.progress}
          positionMs={guided.state.positionMs}
          durationMs={guided.state.durationMs}
          onPlay={onPlayJourney}
          onStop={guided.stop}
        />
      )}

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

/* ------------------------------------------------------------------ */
/* Breathe mode                                                        */
/* ------------------------------------------------------------------ */

function BreatheMode({
  running,
  rounds,
  patterns,
  patternId,
  calmBed,
  calmVoiceCues,
  onToggle,
  onReset,
  onSelectPattern,
  onSelectBed,
  onToggleVoice,
}: {
  running: boolean;
  rounds: number;
  patterns: Pattern[];
  patternId: string;
  calmBed: BedId;
  calmVoiceCues: boolean;
  onToggle: () => void;
  onReset: () => void;
  onSelectPattern: (id: string) => void;
  onSelectBed: (id: BedId) => void;
  onToggleVoice: () => void;
}) {
  const theme = useTheme();
  return (
    <>
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
        <RoundButton onPress={onReset} outline>
          <RotateCcw size={22} color={theme.colors.textSecondary} />
        </RoundButton>

        <Pressable onPress={onToggle}>
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

      {/* Sound + voice */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Soundscape" subtitle="Choose an ambient bed and spoken cues" />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: 2 }}
        >
          {BEDS.map((b) => {
            const active = b.id === calmBed;
            return (
              <Pressable key={b.id} onPress={() => onSelectBed(b.id)}>
                <View
                  style={{
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: 10,
                    borderRadius: 999,
                    backgroundColor: active ? theme.colors.primary : theme.colors.surfaceGlass,
                    borderWidth: active ? 0 : 1,
                    borderColor: theme.colors.separator,
                  }}
                >
                  <Text
                    variant="subhead"
                    color={active ? 'textInverse' : 'textSecondary'}
                    style={{ fontWeight: '600' }}
                  >
                    {b.label}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable onPress={onToggleVoice} style={{ marginTop: theme.spacing.md }}>
          <GlassCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    (calmVoiceCues ? theme.colors.primary : theme.colors.textTertiary) + '14',
                }}
              >
                {calmVoiceCues ? (
                  <Volume2 size={20} color={theme.colors.primary} />
                ) : (
                  <VolumeX size={20} color={theme.colors.textTertiary} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="headline">Spoken breath cues</Text>
                <Text variant="caption" color="textTertiary">
                  {calmVoiceCues
                    ? 'A gentle voice guides each breath'
                    : 'Silent — follow the orb and haptics'}
                </Text>
              </View>
              <View
                style={{
                  width: 52,
                  height: 30,
                  borderRadius: 15,
                  padding: 3,
                  backgroundColor: calmVoiceCues ? theme.colors.primary : theme.colors.separator,
                  alignItems: calmVoiceCues ? 'flex-end' : 'flex-start',
                  justifyContent: 'center',
                }}
              >
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' }} />
              </View>
            </View>
          </GlassCard>
        </Pressable>
      </View>

      {/* Pattern picker */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Choose a rhythm" subtitle="Pick what feels right today" />
        <View style={{ gap: theme.spacing.sm }}>
          {patterns.map((p) => {
            const active = p.id === patternId;
            return (
              <Pressable key={p.id} onPress={() => onSelectPattern(p.id)}>
                <GlassCard
                  style={active ? { borderColor: theme.colors.primary, borderWidth: 1.5 } : undefined}
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

      <GroundingNote />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Journeys mode                                                       */
/* ------------------------------------------------------------------ */

function JourneysMode({
  activeSession,
  isPlaying,
  progress,
  positionMs,
  durationMs,
  onPlay,
  onStop,
}: {
  activeSession: (typeof GUIDED_SESSIONS)[number] | undefined;
  isPlaying: boolean;
  progress: number;
  positionMs: number;
  durationMs: number;
  onPlay: (id: string) => void;
  onStop: () => void;
}) {
  const theme = useTheme();
  return (
    <>
      {/* Now-playing bar */}
      {activeSession && (
        <View style={{ marginTop: theme.spacing.md }}>
          <GlassCard style={{ borderColor: activeSession.accent, borderWidth: 1.5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <Pressable onPress={() => onPlay(activeSession.id)}>
                <View
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 26,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: activeSession.accent,
                  }}
                >
                  {isPlaying ? (
                    <Pause size={22} color="#fff" fill="#fff" />
                  ) : (
                    <Play size={22} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />
                  )}
                </View>
              </Pressable>

              <View style={{ flex: 1 }}>
                <Text variant="headline" numberOfLines={1}>
                  {activeSession.title}
                </Text>
                <View
                  style={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: theme.colors.separator,
                    marginTop: 8,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: 4,
                      borderRadius: 2,
                      width: `${Math.round(progress * 100)}%`,
                      backgroundColor: activeSession.accent,
                    }}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text variant="caption" color="textTertiary">
                    {formatTime(positionMs)}
                  </Text>
                  <Text variant="caption" color="textTertiary">
                    {formatTime(durationMs)}
                  </Text>
                </View>
              </View>

              <Pressable onPress={onStop} hitSlop={8}>
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: theme.colors.surfaceGlass,
                    borderWidth: 1,
                    borderColor: theme.colors.separator,
                  }}
                >
                  <Square size={18} color={theme.colors.textSecondary} fill={theme.colors.textSecondary} />
                </View>
              </Pressable>
            </View>
          </GlassCard>
        </View>
      )}

      {/* Session list */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Guided journeys" subtitle="Narrated meditations rooted in Buddhist practice" />
        <View style={{ gap: theme.spacing.sm }}>
          {GUIDED_SESSIONS.map((s) => {
            const locked = !s.takes;
            const active = activeSession?.id === s.id;
            const playing = active && isPlaying;
            return (
              <Pressable key={s.id} disabled={locked} onPress={() => onPlay(s.id)}>
                <GlassCard
                  style={{
                    opacity: locked ? 0.55 : 1,
                    ...(active ? { borderColor: s.accent, borderWidth: 1.5 } : {}),
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                    <View
                      style={{
                        width: 46,
                        height: 46,
                        borderRadius: 23,
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: locked ? theme.colors.separator : s.accent + '22',
                      }}
                    >
                      {locked ? (
                        <Lock size={18} color={theme.colors.textTertiary} />
                      ) : playing ? (
                        <Pause size={20} color={s.accent} fill={s.accent} />
                      ) : (
                        <Play size={20} color={s.accent} fill={s.accent} style={{ marginLeft: 2 }} />
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text variant="headline" color={locked ? 'textTertiary' : 'text'}>
                        {s.title}
                      </Text>
                      <Text variant="caption" color="textTertiary" numberOfLines={1}>
                        {s.subtitle}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                        <Chip label={s.duration} />
                        <Chip label={s.technique} />
                      </View>
                    </View>

                    {locked && (
                      <View
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 999,
                          backgroundColor: theme.colors.separator,
                        }}
                      >
                        <Text variant="caption" color="textSecondary" style={{ fontWeight: '700' }}>
                          Soon
                        </Text>
                      </View>
                    )}
                  </View>
                </GlassCard>
              </Pressable>
            );
          })}
        </View>
      </View>

      <GroundingNote />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function Chip({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: theme.colors.surfaceGlass,
        borderWidth: 1,
        borderColor: theme.colors.separator,
      }}
    >
      <Text variant="caption" color="textTertiary" style={{ fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

function GroundingNote() {
  const theme = useTheme();
  return (
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
        borderWidth: outline ? 1 : 0,
        borderColor: theme.colors.separator,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}
