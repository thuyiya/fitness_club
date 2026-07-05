import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { HeartPulse, Leaf, Sprout } from 'lucide-react-native';
import { PillButton, Text } from '@/components';
import { useTheme } from '@/theme';
import { useSettingsStore } from '@/store/settingsStore';

/**
 * A soft, three-screen wellness intro shown once — right after the splash on the
 * very first launch. It sets a calm tone and then drops the user into the app.
 * The health questionnaire (weight/height/age) is a separate flow, prompted
 * later from the Home banner when the user is ready to personalize.
 */

interface Slide {
  icon: React.ReactNode;
  tint: [string, string];
  eyebrow: string;
  title: string;
  body: string;
}

const SLIDES: Slide[] = [
  {
    icon: <HeartPulse size={58} color="#fff" strokeWidth={2} />,
    tint: ['#9DBE7A', '#6E8F55'],
    eyebrow: 'BREATHE',
    title: 'You’ve arrived',
    body: 'This is your quiet corner — a calm space made to help your mind settle and your thoughts soften.',
  },
  {
    icon: <Leaf size={58} color="#fff" strokeWidth={2} />,
    tint: ['#8FB3C9', '#5E86A6'],
    eyebrow: 'GENTLY',
    title: 'We heal, softly',
    body: 'No pressure. No judgement. Just small moments of care, every day, to help you feel more like yourself.',
  },
  {
    icon: <Sprout size={58} color="#fff" strokeWidth={2} />,
    tint: ['#B6A6D6', '#7F6BB0'],
    eyebrow: 'TOGETHER',
    title: 'We grow with you',
    body: 'Nourish the body, calm the mind. Let’s shape a little wellness ritual that quietly stays by your side.',
  },
];

export default function Welcome() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const completeWelcome = useSettingsStore((s) => s.completeWelcome);
  const [page, setPage] = useState(0);
  const slide = SLIDES[page];
  const last = page === SLIDES.length - 1;

  const enterApp = () => {
    completeWelcome();
    router.replace('/(tabs)');
  };

  // A slow, breathing pulse behind the mark — sets a calm pace before anything else.
  const breath = useSharedValue(0);
  useEffect(() => {
    breath.value = withRepeat(
      withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [breath]);
  const breathStyle = useAnimatedStyle(() => ({
    opacity: 0.25 + breath.value * 0.35,
    transform: [{ scale: 1 + breath.value * 0.14 }],
  }));

  const next = () => {
    if (last) enterApp();
    else setPage((p) => p + 1);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.top, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={enterApp} hitSlop={12} style={styles.skip}>
          <Text variant="subhead" color="textTertiary">
            Skip
          </Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <View style={styles.orbWrap}>
          <Animated.View
            style={[styles.breath, breathStyle, { backgroundColor: slide.tint[0] }]}
          />
          <Animated.View
            key={`orb-${page}`}
            entering={FadeIn.duration(600)}
            style={styles.orb}
          >
            <LinearGradient
              colors={slide.tint}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.orbFill}
            >
              {slide.icon}
            </LinearGradient>
          </Animated.View>
        </View>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Animated.View key={`text-${page}`} entering={FadeInDown.duration(500).springify().damping(18)}>
          <Text variant="caption" center style={{ letterSpacing: 3, color: slide.tint[1] }}>
            {slide.eyebrow}
          </Text>
          <Text variant="largeTitle" center style={{ marginTop: 8 }}>
            {slide.title}
          </Text>
          <Text
            variant="body"
            color="textSecondary"
            center
            style={{ marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.md, lineHeight: 26 }}
          >
            {slide.body}
          </Text>
        </Animated.View>

        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: i === page ? 22 : 8,
                  backgroundColor: i === page ? theme.colors.primary : theme.colors.separator,
                },
              ]}
            />
          ))}
        </View>

        <View style={{ marginTop: theme.spacing.xl }}>
          <PillButton label={last ? 'Enter Solace' : 'Continue'} onPress={next} />
          {last && (
            <Text variant="caption" color="textTertiary" center style={{ marginTop: theme.spacing.md }}>
              No account needed • Your space stays private
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: { paddingHorizontal: 20, alignItems: 'flex-end' },
  skip: { paddingVertical: 6, paddingHorizontal: 4 },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  orbWrap: { width: 260, height: 260, alignItems: 'center', justifyContent: 'center' },
  breath: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  orb: {
    width: 160,
    height: 160,
    borderRadius: 52,
    overflow: 'hidden',
  },
  orbFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 24 },
  dots: { flexDirection: 'row', gap: 6, alignSelf: 'center', marginTop: 24 },
  dot: { height: 8, borderRadius: 4 },
});
