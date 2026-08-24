/**
 * Read-only rendering of a question as a learner would see it, with the
 * correct answer and explanation revealed for the author.
 */

import { StyleSheet, View } from 'react-native';
import { Badge, Card, Text } from '../../ui';
import { colors, difficultyColors, radii, spacing } from '../../theme';
import {
  DIFFICULTY_LABELS,
  QUESTION_TYPE_LABELS,
  requiresOptions,
  type Question,
  type QuestionDraft,
} from '../../types/domain';
import { correctAnswerText } from '../../types/ai';

export function QuestionPreview({
  question,
  index,
}: {
  question: Question | QuestionDraft;
  /** 1-based position, shown when previewing a quiz. */
  index?: number;
}) {
  const difficulty = difficultyColors[question.difficulty];
  const answer = correctAnswerText(question);
  const showOptions =
    requiresOptions(question.questionType) && question.options.length > 0;

  return (
    <Card>
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

      <Text variant="heading" style={styles.question}>
        {index !== undefined ? `${index}. ` : ''}
        {question.questionText}
      </Text>

      {showOptions ? (
        <View style={styles.options}>
          {question.options.map((option, position) => {
            const isCorrect = option.id === question.correctAnswer;
            return (
              <View
                key={option.id}
                style={[styles.option, isCorrect && styles.optionCorrect]}
              >
                <Text
                  variant="bodyStrong"
                  color={isCorrect ? colors.success : colors.textMuted}
                  style={styles.optionLetter}
                >
                  {String.fromCharCode(65 + position)}
                </Text>
                <Text
                  variant="body"
                  color={isCorrect ? colors.success : colors.text}
                  style={styles.optionText}
                >
                  {option.text}
                </Text>
                {isCorrect ? (
                  <Text variant="bodyStrong" color={colors.success}>
                    ✓
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.answerBlock}>
          <Text variant="label" color={colors.textMuted}>
            CORRECT ANSWER
          </Text>
          <Text variant="bodyStrong" color={colors.success}>
            {answer || '—'}
          </Text>
        </View>
      )}

      {question.explanation ? (
        <View style={styles.explanation}>
          <Text variant="label" color={colors.textMuted}>
            EXPLANATION
          </Text>
          <Text variant="body" color={colors.textMuted}>
            {question.explanation}
          </Text>
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  question: { marginBottom: spacing.md },
  options: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  optionCorrect: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
  optionLetter: { width: 18 },
  optionText: { flex: 1 },
  answerBlock: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.successSoft,
  },
  explanation: {
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
