import { StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import { Badge } from './Badge';
import { colors, difficultyColors, spacing } from '../theme';
import {
  QUESTION_TYPE_LABELS,
  DIFFICULTY_LABELS,
  type Question,
} from '../types/domain';
import { formatDate, truncate } from '../utils/format';

export interface QuestionCardProps {
  question: Question;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Renders a selection checkbox, used when building a quiz. */
  selectable?: boolean;
  selected?: boolean;
  /** Slot for per-card actions such as edit/delete. */
  trailing?: React.ReactNode;
}

export function QuestionCard({
  question,
  onPress,
  onLongPress,
  selectable = false,
  selected = false,
  trailing,
}: QuestionCardProps) {
  const difficulty = difficultyColors[question.difficulty];

  return (
    <Card
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={question.questionText}
      style={selected ? styles.selected : undefined}
    >
      <View style={styles.header}>
        {selectable ? (
          <View
            style={[styles.checkbox, selected && styles.checkboxOn]}
            accessible
            accessibilityRole="checkbox"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={selected ? 'Selected' : 'Not selected'}
          >
            {selected ? (
              <Text variant="label" color={colors.onPrimary}>
                ✓
              </Text>
            ) : null}
          </View>
        ) : null}
        <Text variant="bodyStrong" style={styles.question} numberOfLines={3}>
          {truncate(question.questionText, 160)}
        </Text>
        {trailing}
      </View>

      <View style={styles.badges}>
        <Badge
          label={question.subject}
          fg={colors.primary}
          bg={colors.primarySoft}
        />
        {question.topic ? <Badge label={question.topic} /> : null}
        <Badge label={QUESTION_TYPE_LABELS[question.questionType]} />
        <Badge
          label={DIFFICULTY_LABELS[question.difficulty]}
          fg={difficulty.fg}
          bg={difficulty.bg}
        />
      </View>

      <Text variant="caption" color={colors.textFaint}>
        {formatDate(question.createdAt)}
        {question.source !== 'manual' ? ` · via ${question.source}` : ''}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  question: { flex: 1 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
