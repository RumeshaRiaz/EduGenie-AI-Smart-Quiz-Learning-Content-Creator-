import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors, radii, spacing } from '../theme';

export interface BadgeProps {
  label: string;
  fg?: string;
  bg?: string;
}

/** Small pill used for subject, type and difficulty metadata. */
export function Badge({
  label,
  fg = colors.textMuted,
  bg = colors.surfaceAlt,
}: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text variant="label" color={fg} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
});
