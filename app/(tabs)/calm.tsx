import React, { useEffect, useState } from 'react';
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
import { router } from 'expo-router';
import { ChevronUp, Lock, Moon, Pause, Play, Sparkles, Square, Wind } from 'lucide-react-native';
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
import { useCalmStore } from '@/store/calmStore';
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

// Muted, low-glare gradient — easy on the eyes in a dark room.
const ORB = ['#4BA3A0', '#6C86D9', '#9385D0'] as const;

export default function Calm() {
  const theme = useTheme();
  const patterns = usePatterns();
  const guided = useGuidedPlayer();

  const [mode, setMode] = useState<Mode>('breathe');

  // One-time "Clearing the Mind" intro on the first visit to this tab.
  const mindIntroSeen = useSettingsStore((s) => s.mindIntroSeen);
  const completeMindIntro = useSettingsStore((s) => s.completeMindIntro);
  const [showIntro, setShowIntro] = useState(!mindIntroSeen);

  // Ambient bed preference (persisted).
  const calmBed = useSettingsStore((s) => s.calmBed) as BedId;
  const setCalmBed = useSettingsStore((s) => s.setCalmBed);

  // Persisted calm activity, surfaced on the Progress tab in Calm focus.
  const logSession = useCalmStore((s) => s.startSession);

  const [patternId, setPatternId] = useState(patterns[0].id);
  const pattern = patterns.find((p) => p.id === patternId) ?? patterns[0];

  const scale = useSharedValue(OUT_SCALE);
  const ambiance = useSharedValue(0);
  const ripple = useSharedValue(0);

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
    transform: [{ scale: scale.value * 1.3 }],
    opacity: 0.16 + (scale.value - OUT_SCALE) * 0.28,
  }));

  // Breathing runs in a dedicated full-screen focus player.
  const beginBreathe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    logSession();
    router.push({ pathname: '/breathe', params: { pattern: patternId } });
  };

  const settleOrb = () => {
    cancelAnimation(scale);
    scale.value = withTiming(OUT_SCALE, { duration: 500 });
    ambiance.value = withTiming(0, { duration: 500 });
  };

  const selectPattern = (id: string) => {
    if (id === patternId) return;
    settleOrb();
    setPatternId(id);
  };

  const selectBed = (id: BedId) => setCalmBed(id);

  const changeMode = (next: Mode) => {
    if (next === mode) return;
    if (next === 'breathe') guided.stop(); // stop any playing journey
    settleOrb();
    setMode(next);
  };

  // Start a journey (if it isn't already the active one) and open the full-screen player.
  const startJourney = (id: string) => {
    const session = GUIDED_SESSIONS.find((s) => s.id === id);
    if (!session || !session.takes) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (guided.state.activeId !== id) guided.play(session);
    router.push({ pathname: '/player', params: { id } });
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
      <View style={{ alignItems: 'center', justifyContent: 'center', height: 300, marginTop: theme.spacing.sm }}>
        {/* Aura is clipped to a circle so it never bleeds into the UI above/below */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: 150,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <BreathingAura scale={scale} ambiance={ambiance} ripple={ripple} colors={orbColors} />
        </View>

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
                <Text variant="title3" style={{ color: '#fff', opacity: 0.97, textAlign: 'center' }}>
                  {pattern.name}
                </Text>
                <Text variant="footnote" style={{ color: '#fff', opacity: 0.8, marginTop: 4 }}>
                  Tap Begin
                </Text>
              </>
            ) : guided.state.activeId ? (
              <>
                <Text
                  variant="caption"
                  style={{ color: '#fff', opacity: 0.9, letterSpacing: 1 }}
                >
                  {guided.state.isPlaying ? 'NOW PLAYING' : 'PAUSED'}
                </Text>
                <Text variant="numberLarge" style={{ color: '#fff' }}>
                  {formatTime(remainingMs)}
                </Text>
              </>
            ) : (
              <Text
                variant="title3"
                style={{ color: '#fff', opacity: 0.97, textAlign: 'center' }}
              >
                Pick a{'\n'}journey
              </Text>
            )}
          </LinearGradient>
        </Animated.View>
      </View>

      {mode === 'breathe' ? (
        <BreatheMode
          patterns={patterns}
          patternId={patternId}
          calmBed={calmBed}
          onBegin={beginBreathe}
          onSelectPattern={selectPattern}
          onSelectBed={selectBed}
        />
      ) : (
        <JourneysMode
          activeSession={activeSession}
          isPlaying={guided.state.isPlaying}
          progress={guided.state.progress}
          positionMs={guided.state.positionMs}
          durationMs={guided.state.durationMs}
          onStartJourney={startJourney}
          onToggle={guided.togglePlay}
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
  patterns,
  patternId,
  calmBed,
  onBegin,
  onSelectPattern,
  onSelectBed,
}: {
  patterns: Pattern[];
  patternId: string;
  calmBed: BedId;
  onBegin: () => void;
  onSelectPattern: (id: string) => void;
  onSelectBed: (id: BedId) => void;
}) {
  const theme = useTheme();
  return (
    <>
      {/* Begin — opens the full-screen focus player */}
      <Pressable onPress={onBegin} style={{ marginTop: theme.spacing.sm }}>
        {({ pressed }) => (
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              paddingVertical: 16,
              borderRadius: theme.radius.pill,
              opacity: pressed ? 0.9 : 1,
              ...theme.shadows.glow,
            }}
          >
            <Play size={22} color="#fff" fill="#fff" />
            <Text variant="headline" style={{ color: '#fff' }}>
              Begin session
            </Text>
          </LinearGradient>
        )}
      </Pressable>

      {/* Soundscape */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Soundscape" subtitle="Choose an ambient bed to breathe to" />

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
  onStartJourney,
  onToggle,
  onStop,
}: {
  activeSession: (typeof GUIDED_SESSIONS)[number] | undefined;
  isPlaying: boolean;
  progress: number;
  positionMs: number;
  durationMs: number;
  onStartJourney: (id: string) => void;
  onToggle: () => void;
  onStop: () => void;
}) {
  const theme = useTheme();
  return (
    <>
      {/* Now-playing bar — tap the title to reopen the full-screen player */}
      {activeSession && (
        <View style={{ marginTop: theme.spacing.md }}>
          <GlassCard style={{ borderColor: activeSession.accent, borderWidth: 1.5 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <Pressable onPress={onToggle}>
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

              <Pressable style={{ flex: 1 }} onPress={() => onStartJourney(activeSession.id)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text variant="headline" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {activeSession.title}
                  </Text>
                  <ChevronUp size={15} color={theme.colors.textTertiary} />
                </View>
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
              </Pressable>

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
              <Pressable key={s.id} disabled={locked} onPress={() => onStartJourney(s.id)}>
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
