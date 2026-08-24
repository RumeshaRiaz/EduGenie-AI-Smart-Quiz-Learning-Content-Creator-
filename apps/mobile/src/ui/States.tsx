import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { colors, spacing } from '../theme';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Shown when a list has no content yet, with an optional primary action. */
export function EmptyState({
  icon = '📚',
  title,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.icon}>{icon}</Text>
      <Text variant="heading" center>
        {title}
      </Text>
      {message ? (
        <Text variant="body" color={colors.textMuted} center>
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          onPress={onAction}
          fullWidth={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

export interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading…' }: LoadingStateProps) {
  return (
    <View style={styles.center} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text variant="body" color={colors.textMuted} center>
        {message}
      </Text>
    </View>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <View style={styles.center}>
      <Text style={styles.icon}>⚠️</Text>
      <Text variant="heading" center>
        {title}
      </Text>
      <Text variant="body" color={colors.textMuted} center>
        {message}
      </Text>
      {onRetry ? (
        <Button
          label={retryLabel}
          onPress={onRetry}
          variant="secondary"
          fullWidth={false}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

/**
 * Inline banner for a recoverable error inside a form, where a full-screen
 * error state would lose the user's in-progress input.
 */
export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text variant="caption" color={colors.danger} style={styles.bannerText}>
        {message}
      </Text>
      {onRetry ? (
        <Button
          label="Retry"
          onPress={onRetry}
          variant="ghost"
          size="sm"
          fullWidth={false}
        />
      ) : null}
    </View>
  );
}

/** Shown while an AI request is in flight. */
export function AIProcessingIndicator({
  message = 'AI is working…',
  detail,
}: {
  message?: string;
  detail?: string;
}) {
  return (
    <View style={styles.ai} accessibilityRole="progressbar">
      <ActivityIndicator color={colors.accent} />
      <View style={styles.aiText}>
        <Text variant="bodyStrong" color={colors.accent}>
          {message}
        </Text>
        {detail ? (
          <Text variant="caption" color={colors.textMuted}>
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  icon: { fontSize: 44 },
  action: { marginTop: spacing.md },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  bannerText: { flex: 1 },
  ai: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.accentSoft,
    borderRadius: 12,
    padding: spacing.lg,
  },
  aiText: { flex: 1, gap: 2 },
});
