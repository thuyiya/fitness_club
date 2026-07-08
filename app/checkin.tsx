import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ChevronDown } from 'lucide-react-native';
import { GlassCard, PillButton, Text } from '@/components';
import { EMOTION_OPTIONS, EmojiMoodPicker, EmotionOption } from '@/components/EmojiMoodPicker';
import { MoodSlider } from '@/components/MoodSlider';
import { useTheme } from '@/theme';
import { useMoodStore, MoodEmotion } from '@/store/moodStore';

/**
 * "How are you feeling?" — a gamified, low-friction mood check-in.
 *
 * The user taps an emotion, nudges two sliders (pleasantness + energy) and can
 * add a short note. A big living emoji reflects the current state and pops on
 * every change. Saving writes to the mood store and dismisses the modal — this
 * is the destination for the "take a breath" notification deep-link.
 *
 * Full-screen modal (registered as a fullScreenModal in app/_layout.tsx).
 */

// Sensible starting points for each emotion so the sliders feel pre-filled and
// the big emoji lands somewhere believable the instant you tap a chip.
const EMOTION_DEFAULTS: Record<MoodEmotion, { valence: number; energy: number; intensity: number }> = {
  happy: { valence: 0.8, energy: 0.7, intensity: 0.6 },
  calm: { valence: 0.5, energy: 0.2, intensity: 0.5 },
  grateful: { valence: 0.7, energy: 0.45, intensity: 0.6 },
  neutral: { valence: 0.0, energy: 0.4, intensity: 0.4 },
  tired: { valence: -0.2, energy: 0.12, intensity: 0.5 },
  anxious: { valence: -0.5, energy: 0.8, intensity: 0.7 },
  sad: { valence: -0.7, energy: 0.25, intensity: 0.6 },
  angry: { valence: -0.6, energy: 0.85, intensity: 0.75 },
  hurting: { valence: -0.85, energy: 0.4, intensity: 0.8 },
  numb: { valence: -0.2, energy: 0.1, intensity: 0.35 },
};

// A face for the big orb derived from valence when no emotion is picked yet.
function faceForValence(v: number): string {
  if (v >= 0.6) return '😄';
  if (v >= 0.25) return '🙂';
  if (v > -0.25) return '😐';
  if (v > -0.6) return '😕';
  return '😢';
}

function valenceHeadline(v: number): string {
  if (v >= 0.6) return 'Feeling great';
  if (v >= 0.25) return 'Pretty good';
  if (v > -0.25) return 'Just okay';
  if (v > -0.6) return 'A bit low';
  return 'Having a hard time';
}

export default function CheckIn() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const addEntry = useMoodStore((s) => s.addEntry);

  const [emotion, setEmotion] = useState<EmotionOption | null>(null);
  const [valence, setValence] = useState(0);
  const [energy, setEnergy] = useState(0.4);
  const [intensity, setIntensity] = useState(0.5);
  const [note, setNote] = useState('');

  // Big emoji: gentle continuous breathing + a pop on every change.
  const pulse = useSharedValue(1);
  const pop = useSharedValue(0);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.05, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bump = () => {
    pop.value = withSequence(
      withTiming(1, { duration: 90 }),
      withSpring(0, { damping: 9, stiffness: 200 }),
    );
  };

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value + pop.value * 0.14 }],
  }));

  const bigEmoji = emotion ? EMOTION_OPTIONS.find((o) => o.key === emotion.key)?.emoji ?? '😐' : faceForValence(valence);
  const accent = emotion?.accent ?? theme.colors.primary;

  // Orb gradient tints toward the current accent so hard emotions feel held, too.
  const orbColors = useMemo(
    () => [accent, theme.colors.secondary, accent] as string[],
    [accent, theme.colors.secondary],
  );

  const selectEmotion = (opt: EmotionOption) => {
    setEmotion(opt);
    const d = EMOTION_DEFAULTS[opt.key];
    setValence(d.valence);
    setEnergy(d.energy);
    setIntensity(d.intensity);
    bump();
  };

  const onValence = (v: number) => {
    setValence(v);
  };

  const canSave = emotion !== null;

  const save = () => {
    if (!canSave) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    addEntry({
      valence,
      energy,
      intensity,
      primary: emotion.key,
      note: note.trim() || undefined,
    });
    router.back();
  };

  const close = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.back();
  };

  return (
    <View style={[styles.fill, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.mode === 'dark' ? 'light' : 'dark'} />
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.gradientEnd]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      {/* Soft accent wash from the top, tinted by the chosen emotion */}
      <LinearGradient
        colors={[accent + '30', 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 300 }}
      />

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={close} hitSlop={10}>
          <View
            style={[
              styles.glassBtn,
              { backgroundColor: theme.colors.surfaceGlass, borderColor: theme.colors.separator },
            ]}
          >
            <ChevronDown size={24} color={theme.colors.text} />
          </View>
        </Pressable>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 40}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: theme.spacing.lg,
            paddingBottom: insets.bottom + theme.spacing.xxl,
          }}
        >
          {/* Header */}
          <View style={{ alignItems: 'center', marginTop: theme.spacing.xs }}>
            <Text variant="subhead" color="textTertiary">
              A moment for you
            </Text>
            <Text variant="title1" center style={{ marginTop: 2 }}>
              How are you feeling?
            </Text>
          </View>

          {/* Big living emoji */}
          <View style={{ alignItems: 'center', marginVertical: theme.spacing.lg }}>
            <Animated.View style={orbStyle}>
              <LinearGradient
                colors={orbColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.orb, theme.shadows.medium]}
              >
                <Text style={styles.bigEmoji}>{bigEmoji}</Text>
              </LinearGradient>
            </Animated.View>
            <Text variant="headline" color="textSecondary" style={{ marginTop: theme.spacing.md }}>
              {emotion ? emotion.label : valenceHeadline(valence)}
            </Text>
          </View>

          {/* Emotion picker */}
          <Text variant="footnote" color="textTertiary" style={{ marginBottom: theme.spacing.sm }}>
            Pick what fits best right now
          </Text>
          <EmojiMoodPicker
            value={emotion?.key ?? null}
            onChange={selectEmotion}
          />

          {/* Sliders */}
          <GlassCard style={{ marginTop: theme.spacing.xl }}>
            <View style={{ gap: theme.spacing.xl }}>
              <MoodSlider
                title="How pleasant does it feel?"
                value={valence}
                onChange={onValence}
                onSettle={bump}
                min={-1}
                max={1}
                trackColors={[theme.colors.danger, theme.colors.textTertiary, theme.colors.success]}
                labels={['Unpleasant', 'Pleasant']}
              />
              <MoodSlider
                title="How much energy do you have?"
                value={energy}
                onChange={setEnergy}
                onSettle={bump}
                min={0}
                max={1}
                trackColors={[theme.colors.water, theme.colors.warning]}
                labels={['Calm / low', 'Energized']}
              />
              <MoodSlider
                title="How strong is the feeling?"
                value={intensity}
                onChange={setIntensity}
                onSettle={bump}
                min={0}
                max={1}
                trackColors={[accent + '88', accent]}
                labels={['Barely', 'Very strong']}
              />
            </View>
          </GlassCard>

          {/* Optional note */}
          <Text
            variant="footnote"
            color="textTertiary"
            style={{ marginTop: theme.spacing.xl, marginBottom: theme.spacing.sm }}
          >
            Anything on your mind? (optional)
          </Text>
          <GlassCard>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="A word or two about why…"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              maxLength={280}
              style={[
                theme.typography.body,
                { color: theme.colors.text, minHeight: 64, textAlignVertical: 'top' },
              ]}
            />
          </GlassCard>

          {/* Save */}
          <View style={{ marginTop: theme.spacing.xl }}>
            <PillButton
              label={canSave ? 'Save how I feel' : 'Pick an emotion first'}
              onPress={save}
              disabled={!canSave}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  glassBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  orb: {
    width: 172,
    height: 172,
    borderRadius: 86,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigEmoji: {
    fontSize: 92,
    lineHeight: 104,
  },
});
