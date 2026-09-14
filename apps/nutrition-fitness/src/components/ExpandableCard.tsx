import React, { useState } from 'react';
import { LayoutAnimation, Platform, Pressable, UIManager, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { GlassCard } from './GlassCard';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ExpandableCardProps {
  header: React.ReactNode;
  children: React.ReactNode;
  initiallyOpen?: boolean;
}

/** Glass card that expands to reveal content with a layout animation. */
export function ExpandableCard({ header, children, initiallyOpen = false }: ExpandableCardProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(initiallyOpen);
  const rotation = useSharedValue(initiallyOpen ? 180 : 0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    rotation.value = withTiming(open ? 0 : 180, { duration: 250 });
    setOpen((o) => !o);
  };

  return (
    <GlassCard padded={false}>
      <Pressable onPress={toggle} style={{ padding: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>{header}</View>
          <Animated.View style={chevronStyle}>
            <ChevronDown size={20} color={theme.colors.textTertiary} />
          </Animated.View>
        </View>
      </Pressable>
      {open && (
        <View
          style={{
            paddingHorizontal: theme.spacing.md,
            paddingBottom: theme.spacing.md,
            gap: theme.spacing.sm,
          }}
        >
          {children}
        </View>
      )}
    </GlassCard>
  );
}
