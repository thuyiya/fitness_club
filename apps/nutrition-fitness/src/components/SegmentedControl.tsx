import React from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/theme';
import { Text } from './Text';

interface Option<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** iOS-style animated segmented control with a sliding pill indicator. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useTheme();
  const [width, setWidth] = React.useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const segWidth = width > 0 ? (width - 8) / options.length : 0;
  const translate = useSharedValue(0);

  React.useEffect(() => {
    translate.value = withSpring(index * segWidth, theme.timing.softSpring);
  }, [index, segWidth, translate, theme.timing.softSpring]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translate.value }],
  }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.separator,
        borderRadius: theme.radius.pill,
        padding: 4,
      }}
    >
      {segWidth > 0 && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 4,
              left: 4,
              bottom: 4,
              width: segWidth,
              borderRadius: theme.radius.pill,
              backgroundColor: theme.colors.backgroundElevated,
              ...theme.shadows.soft,
            },
            indicatorStyle,
          ]}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onChange(o.value);
            }}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center' }}
          >
            <Text
              variant="subhead"
              color={active ? 'text' : 'textTertiary'}
              style={{ fontWeight: active ? '700' : '500' }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
