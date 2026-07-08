import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Text } from './Text';
import type { MoodEmotion } from '@/store/moodStore';

/** One selectable emotion: its emoji, a friendly label, and an accent color. */
export interface EmotionOption {
  key: MoodEmotion;
  emoji: string;
  label: string;
  accent: string;
}

/**
 * The default palette of primary emotions. Ordered roughly pleasant → hard so
 * the row reads like a spectrum. Accents are drawn from the Solace palette.
 */
export const EMOTION_OPTIONS: EmotionOption[] = [
  { key: 'happy', emoji: '😄', label: 'Happy', accent: '#8FBF6F' },
  { key: 'calm', emoji: '😌', label: 'Calm', accent: '#6EC5AE' },
  { key: 'grateful', emoji: '🥰', label: 'Grateful', accent: '#D585A2' },
  { key: 'neutral', emoji: '😐', label: 'Okay', accent: '#8A9A7A' },
  { key: 'tired', emoji: '🥱', label: 'Tired', accent: '#8677BE' },
  { key: 'anxious', emoji: '😰', label: 'Anxious', accent: '#D99A34' },
  { key: 'sad', emoji: '😢', label: 'Sad', accent: '#4FA3C4' },
  { key: 'angry', emoji: '😠', label: 'Angry', accent: '#CE6258' },
  { key: 'hurting', emoji: '💔', label: 'Hurting', accent: '#EC8B82' },
  { key: 'numb', emoji: '🫥', label: 'Numb', accent: '#7E8B70' },
];

interface EmojiMoodPickerProps {
  value: MoodEmotion | null;
  onChange: (emotion: EmotionOption) => void;
  options?: EmotionOption[];
}

/** A wrapping grid of tappable emoji chips with a springy selected state. */
export function EmojiMoodPicker({ value, onChange, options = EMOTION_OPTIONS }: EmojiMoodPickerProps) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => (
        <EmojiChip
          key={opt.key}
          option={opt}
          selected={value === opt.key}
          onPress={() => onChange(opt)}
        />
      ))}
    </View>
  );
}

function EmojiChip({
  option,
  selected,
  onPress,
}: {
  option: EmotionOption;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);

  const press = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    // A little pop on tap.
    scale.value = withSequence(
      withTiming(1.18, { duration: 110 }),
      withSpring(1, { damping: 10, stiffness: 220 }),
    );
    onPress();
  };

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Pressable
      onPress={press}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={option.label}
    >
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: selected ? option.accent + '2A' : theme.colors.surfaceGlass,
            borderColor: selected ? option.accent : theme.colors.separator,
            borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          },
          animatedStyle,
        ]}
      >
        <Text style={styles.emoji}>{option.emoji}</Text>
        <Text
          variant="caption"
          color={selected ? 'text' : 'textTertiary'}
          style={{ fontWeight: selected ? '700' : '600' }}
        >
          {option.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  chip: {
    minWidth: 74,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 26,
    lineHeight: 32,
  },
});
