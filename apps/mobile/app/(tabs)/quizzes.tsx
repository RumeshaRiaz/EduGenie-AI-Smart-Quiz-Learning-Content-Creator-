import { useRouter } from 'expo-router';
import { Alert, FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheet,
  Button,
  EmptyState,
  QuizCard,
  Screen,
  Text,
} from '../../src/ui';
import { spacing } from '../../src/theme';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import { useState } from 'react';
import type { Quiz } from '../../src/types/domain';

export default function QuizzesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const quizzes = useLibraryStore((state) => state.quizzes);
  const questionCount = useLibraryStore((state) => state.questions.length);
  const deleteQuiz = useLibraryStore((state) => state.deleteQuiz);

  const [actionFor, setActionFor] = useState<Quiz | null>(null);

  const startQuiz = () => {
    if (questionCount === 0) {
      Alert.alert(
        'No questions yet',
        'A quiz is built from saved questions. Create at least one question first.',
        [
          { text: 'Not now', style: 'cancel' },
          {
            text: 'Create a question',
            onPress: () => router.push('/question/create'),
          },
        ],
      );
      return;
    }
    router.push('/quiz/create');
  };

  const confirmDelete = (quiz: Quiz) => {
    setActionFor(null);
    Alert.alert(
      'Delete quiz?',
      'The quiz will be removed. Its questions stay in your library.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteQuiz(quiz.id),
        },
      ],
    );
  };

  return (
    <Screen padded={false} style={{ paddingTop: insets.top }}>
      <View style={styles.header}>
        <Text variant="title">Quizzes</Text>
        <Button
          label="New quiz"
          icon="＋"
          size="sm"
          fullWidth={false}
          onPress={startQuiz}
        />
      </View>

      <FlatList
        data={quizzes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          quizzes.length === 0 && styles.listEmpty,
          { paddingBottom: spacing.xxl + insets.bottom },
        ]}
        ListEmptyComponent={
          <EmptyState
            icon="📝"
            title="No quizzes yet"
            message="Group questions from your library into a quiz you can share or print."
            actionLabel="Create a quiz"
            onAction={startQuiz}
          />
        }
        renderItem={({ item }) => (
          <QuizCard
            quiz={item}
            onPress={() =>
              router.push({ pathname: '/quiz/preview', params: { id: item.id } })
            }
            onLongPress={() => setActionFor(item)}
          />
        )}
      />

      <BottomSheet
        visible={actionFor !== null}
        onClose={() => setActionFor(null)}
        title="Quiz actions"
      >
        {actionFor ? (
          <View style={styles.sheetBody}>
            <Button
              label="Preview"
              icon="👁"
              variant="secondary"
              onPress={() => {
                const id = actionFor.id;
                setActionFor(null);
                router.push({ pathname: '/quiz/preview', params: { id } });
              }}
            />
            <Button
              label="Edit"
              icon="✏️"
              variant="secondary"
              onPress={() => {
                const id = actionFor.id;
                setActionFor(null);
                router.push({ pathname: '/quiz/create', params: { id } });
              }}
            />
            <Button
              label="Delete"
              icon="🗑"
              variant="danger"
              onPress={() => confirmDelete(actionFor)}
            />
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
  listEmpty: { flexGrow: 1 },
  sheetBody: { gap: spacing.md, paddingBottom: spacing.md },
});
