import React from 'react';
import { Pressable, View } from 'react-native';
import { useTheme } from '@/theme';
import { Text } from './Text';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  right?: React.ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onAction,
  right,
}: SectionHeaderProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
        marginTop: theme.spacing.lg,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text variant="title3">{title}</Text>
        {subtitle && (
          <Text variant="footnote" color="textTertiary">
            {subtitle}
          </Text>
        )}
      </View>
      {right}
      {actionLabel && (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text variant="subhead" color="primary">
            {actionLabel}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
