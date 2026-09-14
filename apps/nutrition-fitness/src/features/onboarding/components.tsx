import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Check, Minus, Plus } from 'lucide-react-native';
import { Text } from '@/components';
import { useTheme } from '@/theme';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Large selectable option card with emoji + title + optional subtitle. */
export function OptionCard({
  title,
  subtitle,
  emoji,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  emoji?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={() => (scale.value = withSpring(0.97, theme.timing.spring))}
      onPressOut={() => (scale.value = withSpring(1, theme.timing.spring))}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[
        style,
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          padding: theme.spacing.md,
          borderRadius: theme.radius.lg,
          borderWidth: 2,
          borderColor: selected ? theme.colors.primary : theme.colors.cardBorder,
          backgroundColor: selected
            ? theme.colors.primary + '14'
            : theme.colors.backgroundElevated,
        },
      ]}
    >
      {emoji && <Text style={{ fontSize: 26 }}>{emoji}</Text>}
      <View style={{ flex: 1 }}>
        <Text variant="headline">{title}</Text>
        {subtitle && (
          <Text variant="footnote" color="textTertiary">
            {subtitle}
          </Text>
        )}
      </View>
      <View
        style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: selected ? theme.colors.primary : theme.colors.textTertiary,
          backgroundColor: selected ? theme.colors.primary : 'transparent',
        }}
      >
        {selected && <Check size={14} color="#fff" strokeWidth={3} />}
      </View>
    </AnimatedPressable>
  );
}

/** Chip for multi-select lists (allergies, conditions). */
export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={{
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.xs + 2,
        borderRadius: theme.radius.pill,
        borderWidth: 1.5,
        borderColor: selected ? theme.colors.primary : theme.colors.cardBorder,
        backgroundColor: selected ? theme.colors.primary : theme.colors.backgroundElevated,
      }}
    >
      <Text variant="subhead" color={selected ? 'textInverse' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

/** Numeric stepper with big value display and +/- controls. */
export function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const theme = useTheme();
  const change = (delta: number) => {
    const next = Math.min(max, Math.max(min, Math.round((value + delta) * 10) / 10));
    Haptics.selectionAsync().catch(() => {});
    onChange(next);
  };

  return (
    <View style={{ alignItems: 'center', gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
        <Text variant="numberLarge">{value}</Text>
        {unit && (
          <Text variant="title3" color="textTertiary">
            {unit}
          </Text>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: theme.spacing.lg }}>
        <StepBtn icon={<Minus size={24} color={theme.colors.primary} />} onPress={() => change(-step)} />
        <StepBtn icon={<Plus size={24} color={theme.colors.primary} />} onPress={() => change(step)} />
      </View>
    </View>
  );
}

function StepBtn({ icon, onPress }: { icon: React.ReactNode; onPress: () => void }) {
  const theme = useTheme();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      onPressIn={() => (scale.value = withTiming(0.9, { duration: 80 }))}
      onPressOut={() => (scale.value = withSpring(1))}
      onPress={onPress}
      style={[
        style,
        {
          width: 64,
          height: 64,
          borderRadius: 24,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.primary + '18',
        },
      ]}
    >
      {icon}
    </AnimatedPressable>
  );
}

/** Progress dots / bar for the onboarding step indicator. */
export function StepIndicator({ step, total }: { step: number; total: number }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <StepDot key={i} active={i <= step} current={i === step} />
      ))}
    </View>
  );
}

function StepDot({ active, current }: { active: boolean; current: boolean }) {
  const theme = useTheme();
  const w = useSharedValue(current ? 24 : 8);
  React.useEffect(() => {
    w.value = withSpring(current ? 24 : 8, theme.timing.softSpring);
  }, [current, w, theme.timing.softSpring]);
  const style = useAnimatedStyle(() => ({ width: w.value }));
  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: 4,
          backgroundColor: active ? theme.colors.primary : theme.colors.separator,
        },
        style,
      ]}
    />
  );
}
