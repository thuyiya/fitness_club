import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Download, ShieldCheck, Sparkles, WifiOff, Zap } from 'lucide-react-native';
import { Text } from '@/components';
import { useTheme } from '@/theme';
import { useAiCoachStore } from '@/store/aiCoachStore';
import { MODEL } from '@/lib/llm/config';

/**
 * Post-onboarding step that offers to download the on-device AI model. Kept
 * optional: users can skip and enable it later from the Coach tab or Settings.
 * The download runs in the store, so navigating away lets it continue.
 */
export default function AISetup() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { available, status, progress, error, connect } = useAiCoachStore();

  const goToApp = () => router.replace('/(tabs)');

  // If the engine isn't in this build, don't strand the user here.
  useEffect(() => {
    if (!available) goToApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available]);

  const downloading = status === 'downloading';
  const preparing = status === 'preparing';
  const ready = status === 'ready';
  const pct = Math.round(progress * 100);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <LinearGradient
        colors={[theme.colors.gradientStart, theme.colors.background]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 360 }}
      />

      <View style={{ flex: 1, paddingTop: insets.top + 40, paddingHorizontal: theme.spacing.xl, paddingBottom: insets.bottom + 24 }}>
        <Animated.View entering={FadeIn.duration(500)} style={{ alignItems: 'center', gap: 18 }}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.secondary]}
            style={{ width: 88, height: 88, borderRadius: 28, alignItems: 'center', justifyContent: 'center', ...theme.shadows.glow }}
          >
            <Sparkles size={44} color="#fff" />
          </LinearGradient>
          <Text variant="title1" center>Meet your AI coach</Text>
          <Text variant="callout" color="textSecondary" center style={{ lineHeight: 22 }}>
            Add a private AI that runs fully on your phone. It answers questions about your meals,
            workouts and progress — using your real plan, right on device.
          </Text>
        </Animated.View>

        <View style={{ gap: 14, marginTop: theme.spacing.xl }}>
          <Feature icon={<ShieldCheck size={20} color={theme.colors.primary} />} title="100% private" body="Your data never leaves your phone." />
          <Feature icon={<WifiOff size={20} color={theme.colors.primary} />} title="Works offline" body="No internet needed once installed." />
          <Feature icon={<Zap size={20} color={theme.colors.primary} />} title={`One-time ${MODEL.sizeLabel} download`} body="Keeps the app tiny to install. Best on Wi-Fi." />
        </View>

        <View style={{ flex: 1 }} />

        {(downloading || preparing) && (
          <Animated.View entering={FadeInDown} style={{ gap: 8, marginBottom: theme.spacing.lg }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: theme.colors.cardBorder, overflow: 'hidden' }}>
              <View style={{ width: `${preparing ? 100 : pct}%`, height: '100%' }}>
                <LinearGradient colors={[theme.colors.primary, theme.colors.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
              </View>
            </View>
            <Text variant="caption" color="textTertiary" center>
              {preparing ? 'Loading model…' : `Downloading ${pct}% of ${MODEL.sizeLabel} · you can continue and it keeps going`}
            </Text>
          </Animated.View>
        )}

        {error && !downloading && (
          <Text variant="caption" color="danger" center style={{ marginBottom: theme.spacing.md }}>{error}</Text>
        )}

        {/* Primary action */}
        {ready ? (
          <PrimaryButton label="You're all set — Continue" onPress={goToApp} theme={theme} />
        ) : downloading || preparing ? (
          <PrimaryButton label="Continue — download in background" onPress={goToApp} theme={theme} />
        ) : (
          <PrimaryButton
            icon={<Download size={18} color="#fff" />}
            label={`Download AI coach (${MODEL.sizeLabel})`}
            onPress={() => connect()}
            theme={theme}
          />
        )}

        {!ready && !downloading && !preparing && (
          <Pressable onPress={goToApp} style={{ paddingVertical: 14, alignItems: 'center' }}>
            <Text variant="callout" color="textTertiary">Maybe later</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: theme.colors.backgroundElevated,
          borderWidth: 1,
          borderColor: theme.colors.cardBorder,
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="subhead">{title}</Text>
        <Text variant="caption" color="textTertiary">{body}</Text>
      </View>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  icon,
  theme,
}: {
  label: string;
  onPress: () => void;
  icon?: React.ReactNode;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <Pressable onPress={onPress}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingVertical: 16,
          borderRadius: theme.radius.pill,
          ...theme.shadows.glow,
        }}
      >
        {icon}
        <Text variant="headline" color="textInverse">{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}
