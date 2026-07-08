import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
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
import {
  ChevronRight,
  ChevronUp,
  Cloud,
  Heart,
  Lock,
  Pause,
  Play,
  Square,
  Target,
  Waves,
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
import { useCalmStore } from '@/store/calmStore';
import {
  GUIDED_SESSIONS,
  GuidedSession,
  MEDITATION_SESSIONS,
  STORY_SESSIONS,
} from '@/lib/calmSessions';
import { PRACTICES, Practice } from '@/lib/practices';
import { formatTime, useGuidedPlayer } from '@/lib/useGuidedPlayer';

/**
 * Calm — a mind-relaxation space with two modes:
 *  · Breathe  — guided breathing with a living orb + ambient beds + spoken cues.
 *  · Journeys — narrated Buddhist meditations that play over a soft bed.
 * Both share the same breathing aura so the screen always feels alive.
 */

type Mode = 'practices' | 'journeys';

const IN_SCALE = 1;
const OUT_SCALE = 0.55;

// Muted, low-glare gradient — easy on the eyes in a dark room.
const ORB = ['#4BA3A0', '#6C86D9', '#9385D0'] as const;

export default function Calm() {
  const theme = useTheme();
  const guided = useGuidedPlayer();

  const [mode, setMode] = useState<Mode>('practices');

  // One-time "Clearing the Mind" intro on the first visit to this tab.
  const mindIntroSeen = useSettingsStore((s) => s.mindIntroSeen);
  const completeMindIntro = useSettingsStore((s) => s.completeMindIntro);
  const [showIntro, setShowIntro] = useState(!mindIntroSeen);

  // Persisted calm activity, surfaced on the Progress tab in Calm focus.
  const logSession = useCalmStore((s) => s.startSession);

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

  const settleOrb = () => {
    cancelAnimation(scale);
    scale.value = withTiming(OUT_SCALE, { duration: 500 });
    ambiance.value = withTiming(0, { duration: 500 });
  };

  // Launch a practice full-screen: Breath opens the breathing player, the others
  // open the guided prompt player. Each open counts as a calm session.
  const openPractice = (p: Practice) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    logSession();
    if (p.kind === 'breath') router.push('/breathe');
    else router.push({ pathname: '/practice', params: { id: p.id } });
  };

  const changeMode = (next: Mode) => {
    if (next === mode) return;
    if (next === 'practices') guided.stop(); // stop any playing journey
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
          { label: 'Practices', value: 'practices' },
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
            {mode === 'practices' ? (
              <>
                <Text variant="title3" style={{ color: '#fff', opacity: 0.97, textAlign: 'center' }}>
                  Be here
                </Text>
                <Text variant="footnote" style={{ color: '#fff', opacity: 0.8, marginTop: 4 }}>
                  Choose a practice
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

      {mode === 'practices' ? (
        <PracticesMode onOpenPractice={openPractice} />
      ) : (
        <JourneysMode
          activeSession={activeSession}
          isPlaying={guided.state.isPlaying}
          loadingId={guided.state.loadingId}
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

const PRACTICE_ICON: Record<string, (c: string) => React.ReactNode> = {
  breath: (c) => <Wind size={22} color={c} />,
  focus: (c) => <Target size={22} color={c} />,
  body: (c) => <Waves size={22} color={c} />,
  metta: (c) => <Heart size={22} color={c} />,
  letgo: (c) => <Cloud size={22} color={c} />,
};

function PracticesMode({
  onOpenPractice,
}: {
  onOpenPractice: (p: Practice) => void;
}) {
  const theme = useTheme();
  return (
    <>
      {/* Mood check-in */}
      <View style={{ marginTop: theme.spacing.sm }}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            router.push('/checkin');
          }}
        >
          <GlassCard>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: theme.colors.secondary + '22',
                }}
              >
                <Text style={{ fontSize: 24 }}>🫧</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="headline">How are you feeling?</Text>
                <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                  Take a breath and check in · 30 sec
                </Text>
              </View>
              <ChevronRight size={18} color={theme.colors.textTertiary} />
            </View>
          </GlassCard>
        </Pressable>
      </View>

      {/* Practice list */}
      <View style={{ marginTop: theme.spacing.md }}>
        <SectionHeader title="Practices" subtitle="Choose a way to settle the mind" />
        <View style={{ gap: theme.spacing.sm }}>
          {PRACTICES.map((p) => (
            <Pressable key={p.id} onPress={() => onOpenPractice(p)}>
              <GlassCard>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                  <View
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 15,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: p.accent + '22',
                    }}
                  >
                    {PRACTICE_ICON[p.id]?.(p.accent)}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text variant="headline">{p.name}</Text>
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
                          {p.technique}
                        </Text>
                      </View>
                    </View>
                    <Text variant="caption" color="textTertiary" style={{ marginTop: 2 }}>
                      {p.subtitle} · {p.minutes} min
                    </Text>
                  </View>
                  <ChevronRight size={18} color={theme.colors.textTertiary} />
                </View>
              </GlassCard>
            </Pressable>
          ))}
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
  loadingId,
  progress,
  positionMs,
  durationMs,
  onStartJourney,
  onToggle,
  onStop,
}: {
  activeSession: (typeof GUIDED_SESSIONS)[number] | undefined;
  isPlaying: boolean;
  loadingId: string | null;
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
                  {loadingId === activeSession.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : isPlaying ? (
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

      {/* Guided journeys */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Guided journeys" subtitle="Narrated meditations rooted in Buddhist practice" />
        <View style={{ gap: theme.spacing.sm }}>
          {MEDITATION_SESSIONS.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              active={activeSession?.id === s.id}
              playing={activeSession?.id === s.id && isPlaying}
              loading={loadingId === s.id}
              onPress={() => onStartJourney(s.id)}
            />
          ))}
        </View>
      </View>

      {/* Sleep & morning stories */}
      <View style={{ marginTop: theme.spacing.xl }}>
        <SectionHeader title="Sleep & morning stories" subtitle="Long, gentle stories to drift off or begin the day" />
        <View style={{ gap: theme.spacing.sm }}>
          {STORY_SESSIONS.map((s) => (
            <SessionCard
              key={s.id}
              session={s}
              active={activeSession?.id === s.id}
              playing={activeSession?.id === s.id && isPlaying}
              loading={loadingId === s.id}
              onPress={() => onStartJourney(s.id)}
            />
          ))}
        </View>
      </View>

      <GroundingNote />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function SessionCard({
  session: s,
  active,
  playing,
  loading,
  onPress,
}: {
  session: GuidedSession;
  active: boolean;
  playing: boolean;
  loading: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const locked = !s.takes;
  return (
    <Pressable disabled={locked} onPress={onPress}>
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
            ) : loading ? (
              <ActivityIndicator size="small" color={s.accent} />
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
}

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
