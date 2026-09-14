import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { useTheme } from '@/theme';
import { TypographyVariant } from '@/theme/tokens';

type ColorToken =
  | 'text'
  | 'textSecondary'
  | 'textTertiary'
  | 'textInverse'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger';

interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: ColorToken;
  center?: boolean;
  style?: TextStyle | TextStyle[];
}

export function Text({
  variant = 'body',
  color = 'text',
  center,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme();
  return (
    <RNText
      {...rest}
      style={[
        theme.typography[variant],
        { color: theme.colors[color] },
        center && { textAlign: 'center' },
        style as TextStyle,
      ]}
    />
  );
}
