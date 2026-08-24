import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { colors, typography } from '../theme';

type Variant = keyof typeof typography;

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
}

/** Typography primitive; all app text goes through this to stay on-scale. */
export function Text({
  variant = 'body',
  color = colors.text,
  center,
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      style={[
        typography[variant],
        { color },
        center && { textAlign: 'center' },
        style,
      ]}
      {...rest}
    />
  );
}
