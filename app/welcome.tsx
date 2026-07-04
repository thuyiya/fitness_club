import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Apple, Dumbbell, HeartPulse, Sparkles } from 'lucide-react-native';
import { PillButton, Text } from '@/components';
import { palette, useTheme } from '@/theme';

const { width } = Dimensions.get('window');

export default function Welcome() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.hero, { paddingTop: insets.top + 40 }]}>
        <Animated.View entering={FadeIn.duration(700)} style={styles.orbWrap}>
          <LinearGradient
            colors={[palette.primary, palette.secondary]}
            style={styles.orb}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Sparkles size={64} color="#fff" strokeWidth={2} />
          </LinearGradient>

          <FloatingIcon icon={<Apple size={22} color={palette.success} />} top={20} left={-10} delay={300} />
          <FloatingIcon icon={<Dumbbell size={22} color={palette.warning} />} top={140} left={width - 120} delay={500} />
          <FloatingIcon icon={<HeartPulse size={22} color={palette.danger} />} top={200} left={20} delay={700} />
        </Animated.View>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeInDown.delay(300).springify().damping(16)}>
          <Text variant="largeTitle" center>
            Meet your personal{'\n'}wellness coach
          </Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(450).springify().damping(16)}>
          <Text
            variant="body"
            color="textSecondary"
            center
            style={{ marginTop: theme.spacing.md, paddingHorizontal: theme.spacing.md }}
          >
            Nutrition, fitness and progress — personalized for you and powered by intelligent coaching.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(650).springify().damping(16)}
          style={{ marginTop: theme.spacing.xxl }}
        >
          <PillButton label="Get Started" onPress={() => router.push('/onboarding')} />
          <Text variant="caption" color="textTertiary" center style={{ marginTop: theme.spacing.md }}>
            Takes about 2 minutes • No account needed
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

function FloatingIcon({
  icon,
  top,
  left,
  delay,
}: {
  icon: React.ReactNode;
  top: number;
  left: number;
  delay: number;
}) {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeIn.delay(delay).duration(600)}
      style={[
        styles.floatIcon,
        {
          top,
          left,
          backgroundColor: theme.colors.backgroundElevated,
          ...theme.shadows.soft,
        },
      ]}
    >
      {icon}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { flex: 1, alignItems: 'center' },
  orbWrap: { width: width, height: 280, alignItems: 'center', justifyContent: 'center' },
  orb: {
    width: 160,
    height: 160,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  floatIcon: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 24 },
});
