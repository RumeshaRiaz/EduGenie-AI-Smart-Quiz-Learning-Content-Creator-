import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Screen,
  Text,
} from '../../src/ui';
import { QuestionPreview } from '../../src/features/question/QuestionPreview';
import { colors, difficultyColors, spacing } from '../../src/theme';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import { DIFFICULTY_LABELS } from '../../src/types/domain';
import { formatDate } from '../../src/utils/format';

export default function QuizPreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const quiz = useLibraryStore((state) =>
    id ? state.quizzes.find((item) => item.id === id) : undefined,
  );
  const questions = useLibraryStore((state) => state.questions);
  const deleteQuiz = useLibraryStore((state) => state.deleteQuiz);

  if (!quiz || !id) {
    return (
      <Screen>
        <EmptyState
          icon="🔎"
          title="Quiz not found"
          message="It may have been deleted."
          actionLabel="Back to quizzes"
          onAction={() => router.replace('/quizzes')}
        />
      </Screen>
    );
  }

  // Resolve in the quiz's own order; a question deleted from the library simply
  // drops out rather than rendering a broken row.
  const items = quiz.questionIds
    .map((questionId) => questions.find((item) => item.id === questionId))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  const difficulty = difficultyColors[quiz.difficulty];

  const confirmDelete = () => {
    Alert.alert('Delete quiz?', 'The questions stay in your library.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteQuiz(id);
          router.replace('/quizzes');
        },
      },
    ]);
  };

  return (
    <Screen
      scroll
      footer={
        <Button
          label="Edit quiz"
          icon="✏️"
          onPress={() => router.push({ pathname: '/quiz/create', params: { id } })}
        />
      }
    >
      <Card>
        <Text variant="title">{quiz.title}</Text>
        {quiz.description ? (
          <Text
            variant="body"
            color={colors.textMuted}
            style={styles.description}
          >
            {quiz.description}
          </Text>
        ) : null}
        <View style={styles.badges}>
          <Badge
            label={`${items.length} question${items.length === 1 ? '' : 's'}`}
            fg={colors.primary}
            bg={colors.primarySoft}
          />
          <Badge label={quiz.subject} />
          {quiz.topic ? <Badge label={quiz.topic} /> : null}
          <Badge
            label={DIFFICULTY_LABELS[quiz.difficulty]}
            fg={difficulty.fg}
            bg={difficulty.bg}
          />
        </View>
        <Text variant="caption" color={colors.textFaint}>
          Created {formatDate(quiz.createdAt)}
        </Text>
      </Card>

      {items.length === 0 ? (
        <Card>
          <Text variant="body" color={colors.textMuted}>
            This quiz has no questions. Its questions may have been deleted from
            your library. Tap Edit quiz to add some.
          </Text>
        </Card>
      ) : (
        items.map((question, index) => (
          <QuestionPreview
            key={question.id}
            question={question}
            index={index + 1}
          />
        ))
      )}

      <Button label="Delete quiz" variant="danger" onPress={confirmDelete} />
    </Screen>
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
