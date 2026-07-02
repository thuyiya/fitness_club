import React from 'react';
import { ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface FadeInViewProps {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}

/** Staggered entrance wrapper — fades + slides content up on mount. */
export function FadeInView({ children, delay = 0, style }: FadeInViewProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify().damping(16)} style={style}>
      {children}
    </Animated.View>
  );
}
