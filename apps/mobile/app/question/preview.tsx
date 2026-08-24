import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, StyleSheet, View } from 'react-native';
import { Button, EmptyState, Screen, Text } from '../../src/ui';
import { QuestionPreview } from '../../src/features/question/QuestionPreview';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import { colors, spacing } from '../../src/theme';
import { formatDate } from '../../src/utils/format';

export default function QuestionPreviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const question = useLibraryStore((state) =>
    id ? state.questions.find((item) => item.id === id) : undefined,
  );
  const deleteQuestion = useLibraryStore((state) => state.deleteQuestion);
  const duplicateQuestion = useLibraryStore((state) => state.duplicateQuestion);

  if (!question || !id) {
    return (
      <Screen>
        <EmptyState
          icon="🔎"
          title="Question not found"
          message="It may have been deleted."
          actionLabel="Back to library"
          onAction={() => router.replace('/questions')}
        />
      </Screen>
    );
  }

  const confirmDelete = () => {
    Alert.alert(
      'Delete question?',
      'This cannot be undone. It will also be removed from any quiz that uses it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteQuestion(id);
            router.replace('/questions');
          },
        },
      ],
    );
  };

  return (
    <Screen
      scroll
      footer={
        <View style={styles.footer}>
          <Button
            label="Edit"
            icon="✏️"
            variant="secondary"
            onPress={() =>
              router.push({ pathname: '/question/edit', params: { id } })
            }
            style={styles.flex}
          />
          <Button
            label="Duplicate"
            icon="⧉"
            variant="secondary"
            onPress={() => {
              duplicateQuestion(id);
              router.replace('/questions');
            }}
            style={styles.flex}
          />
        </View>
      }
    >
      <QuestionPreview question={question} />

      <View style={styles.meta}>
        <Text variant="caption" color={colors.textFaint}>
          Created {formatDate(question.createdAt)}
          {question.updatedAt !== question.createdAt
            ? ` · Updated ${formatDate(question.updatedAt)}`
            : ''}
        </Text>
        <Text variant="caption" color={colors.textFaint}>
          Source: {question.source}
        </Text>
      </View>

      <Button label="Delete question" variant="danger" onPress={confirmDelete} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
  meta: { gap: spacing.xs, paddingHorizontal: spacing.xs },
});
