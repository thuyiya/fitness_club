import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  Check,
  Cloud,
  CloudOff,
  Moon,
  Sparkles,
  Sun,
} from 'lucide-react-native';
import { PillButton, Text } from '@/components';
import {
  darkColors,
  glassColors,
  lightColors,
  ThemeColors,
  useTheme,
} from '@/theme';
import {
  DataMode,
  ThemePreference,
  useSettingsStore,
} from '@/store/settingsStore';

/**
 * First-launch app setup — two quick choices that shape the whole experience:
 *   1. Theme (dark / light / glass), applied live so the screen previews itself.
 *   2. Data (offline vs cloud).
 * All of these are editable later from Settings.
 */

const THEME_OPTIONS: {
  value: Exclude<ThemePreference, 'system'>;
  label: string;
  hint: string;
  colors: ThemeColors;
  icon: React.ReactNode;
}[] = [
  { value: 'dark', label: 'Dark', hint: 'Charcoal & ember', colors: darkColors, icon: <Moon size={18} color="#fff" /> },
  { value: 'light', label: 'Light', hint: 'Warm stone', colors: lightColors, icon: <Sun size={18} color="#fff" /> },
  { value: 'glass', label: 'Glass', hint: 'Frosted & translucent', colors: glassColors, icon: <Sparkles size={18} color="#fff" /> },
];

const DATA_OPTIONS: {
  value: DataMode;
  title: string;
  desc: string;
  icon: (c: string) => React.ReactNode;
}[] = [
  {
    value: 'offline',
    title: 'Keep it offline',
    desc: 'Everything stays on this device. Private by default, no account.',
    icon: (c) => <CloudOff size={24} color={c} />,
  },
  {
    value: 'cloud',
    title: 'Connect to cloud',
    desc: 'Back up your journey and sync it across your devices.',
    icon: (c) => <Cloud size={24} color={c} />,
  },
];

const STEPS = 2;

export default function Welcome() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const themePreference = useSettingsStore((s) => s.themePreference);
  const dataMode = useSettingsStore((s) => s.dataMode);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setDataMode = useSettingsStore((s) => s.setDataMode);
  const completeWelcome = useSettingsStore((s) => s.completeWelcome);

  const [page, setPage] = useState(0);
  const last = page === STEPS - 1;

  const finish = () => {
    completeWelcome();
    router.replace('/(tabs)');
  };

  const next = () => (last ? finish() : setPage((p) => p + 1));

  const c = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <LinearGradient colors={[c.gradientStart, c.background]} style={StyleSheet.absoluteFill} />

      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <View style={styles.dots}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === page ? 22 : 8,
                  backgroundColor: i === page ? c.primary : c.separator,
                },
              ]}
            />
          ))}
        </View>
        <Pressable onPress={finish} hitSlop={12}>
          <Text variant="subhead" color="textTertiary">Skip</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View key={page} entering={FadeInDown.duration(400).springify().damping(18)}>
          {page === 0 && <ThemeStep selected={themePreference} onSelect={setTheme} />}
          {page === 1 && <DataStep selected={dataMode} onSelect={setDataMode} />}
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeIn} style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PillButton label={last ? 'Get Started' : 'Continue'} onPress={next} />
      </Animated.View>
    </View>
  );
}

function StepHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text variant="caption" color="primary" style={{ letterSpacing: 2 }}>
        {eyebrow}
      </Text>
      <Text variant="title1" style={{ marginTop: 6 }}>{title}</Text>
      <Text variant="subhead" color="textSecondary" style={{ marginTop: 6, lineHeight: 22 }}>
        {subtitle}
      </Text>
    </View>
  );
}

function ThemeStep({
  selected,
  onSelect,
}: {
  selected: ThemePreference;
  onSelect: (v: ThemePreference) => void;
}) {
  const theme = useTheme();
  return (
    <View>
      <StepHeader
        eyebrow="APPEARANCE"
        title="Pick your look"
        subtitle="Choose a theme — the whole app updates instantly so you can feel it."
      />
      <View style={{ gap: theme.spacing.md }}>
        {THEME_OPTIONS.map((opt) => {
          const active = selected === opt.value;
          return (
            <Pressable key={opt.value} onPress={() => onSelect(opt.value)}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.md,
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.xl,
                  backgroundColor: theme.colors.card,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? theme.colors.primary : theme.colors.cardBorder,
                }}
              >
                <ThemeSwatch colors={opt.colors} icon={opt.icon} />
                <View style={{ flex: 1 }}>
                  <Text variant="headline">{opt.label}</Text>
                  <Text variant="caption" color="textTertiary">{opt.hint}</Text>
                </View>
                <SelectDot active={active} />
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function ThemeSwatch({ colors, icon }: { colors: ThemeColors; icon: React.ReactNode }) {
  return (
    <View
      style={{
        width: 64,
        height: 64,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.cardBorder,
      }}
    >
      <LinearGradient colors={[colors.gradientStart, colors.background]} style={StyleSheet.absoluteFill} />
      <View
        style={{
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 10,
          height: 22,
          borderRadius: 8,
          backgroundColor: colors.card,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.cardBorder,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: 10,
          left: 10,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
    </View>
  );
}

function DataStep({ selected, onSelect }: { selected: DataMode; onSelect: (v: DataMode) => void }) {
  const theme = useTheme();
  return (
    <View>
      <StepHeader
        eyebrow="YOUR DATA"
        title="Cloud or offline?"
        subtitle="Decide where your information lives. Nothing is shared without you."
      />
      <View style={{ gap: theme.spacing.md }}>
        {DATA_OPTIONS.map((opt) => (
          <ChoiceCard
            key={opt.value}
            active={selected === opt.value}
            title={opt.title}
            desc={opt.desc}
            icon={opt.icon}
            onPress={() => onSelect(opt.value)}
          />
        ))}
      </View>
    </View>
  );
}

function ChoiceCard({
  active,
  title,
  desc,
  icon,
  onPress,
}: {
  active: boolean;
  title: string;
  desc: string;
  icon: (c: string) => React.ReactNode;
  onPress: () => void;
}) {
  const theme = useTheme();
  const accent = theme.colors.primary;
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.md,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.xl,
          backgroundColor: theme.colors.card,
          borderWidth: active ? 2 : 1,
          borderColor: active ? accent : theme.colors.cardBorder,
        }}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: accent + '1A',
          }}
        >
          {icon(accent)}
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="headline">{title}</Text>
          <Text variant="footnote" color="textSecondary" style={{ marginTop: 2, lineHeight: 19 }}>
            {desc}
          </Text>
        </View>
        <SelectDot active={active} />
      </View>
    </Pressable>
  );
}

function SelectDot({ active }: { active: boolean }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: active ? 0 : 1.5,
        borderColor: theme.colors.separator,
        backgroundColor: active ? theme.colors.primary : 'transparent',
      }}
    >
      {active && <Check size={15} color={theme.colors.textInverse} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
});
