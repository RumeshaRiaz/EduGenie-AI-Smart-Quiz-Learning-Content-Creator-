import { StyleSheet, View } from 'react-native';
import { Card } from './Card';
import { Text } from './Text';
import { Badge } from './Badge';
import { colors, difficultyColors, spacing } from '../theme';
import { DIFFICULTY_LABELS, type Quiz } from '../types/domain';
import { formatDate } from '../utils/format';

export function QuizCard({
  quiz,
  onPress,
  onLongPress,
}: {
  quiz: Quiz;
  onPress?: () => void;
  onLongPress?: () => void;
}) {
  const difficulty = difficultyColors[quiz.difficulty];
  const count = quiz.questionIds.length;

  return (
    <Card
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityLabel={quiz.title}
    >
      <Text variant="heading" numberOfLines={2}>
        {quiz.title}
      </Text>
      {quiz.description ? (
        <Text
          variant="caption"
          color={colors.textMuted}
          numberOfLines={2}
          style={styles.description}
        >
          {quiz.description}
        </Text>
      ) : null}

      <View style={styles.badges}>
        <Badge
          label={`${count} question${count === 1 ? '' : 's'}`}
          fg={colors.primary}
          bg={colors.primarySoft}
        />
        <Badge label={quiz.subject} />
        <Badge
          label={DIFFICULTY_LABELS[quiz.difficulty]}
          fg={difficulty.fg}
          bg={difficulty.bg}
        />
      </View>

      <Text variant="caption" color={colors.textFaint}>
        {formatDate(quiz.createdAt)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  description: { marginTop: spacing.xs },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
