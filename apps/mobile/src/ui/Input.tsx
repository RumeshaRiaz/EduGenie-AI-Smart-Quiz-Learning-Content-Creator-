import { useState } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { Text } from './Text';
import { colors, radii, spacing, typography } from '../theme';

export interface InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  multiline?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
}

/** Labelled text field with focus and error states. */
export function Input({
  label,
  error,
  hint,
  multiline,
  containerStyle,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text variant="label" color={colors.textMuted} style={styles.label}>
          {label.toUpperCase()}
        </Text>
      ) : null}
      <TextInput
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.errored,
        ]}
        placeholderTextColor={colors.textFaint}
        multiline={multiline}
        // Multiline fields grow from the top rather than centring on Android.
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={(event) => {
          setFocused(true);
          rest.onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          rest.onBlur?.(event);
        }}
        accessibilityLabel={label}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color={colors.danger} style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color={colors.textFaint} style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { marginBottom: spacing.xs },
  input: {
    ...typography.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 50,
  },
  multiline: { minHeight: 110, paddingTop: spacing.md },
  focused: { borderColor: colors.primary, backgroundColor: colors.surface },
  errored: { borderColor: colors.danger },
  helper: { marginTop: spacing.xs },
});
