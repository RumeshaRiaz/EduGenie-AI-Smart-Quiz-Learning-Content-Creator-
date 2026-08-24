import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BottomSheet,
  Button,
  EmptyState,
  Input,
  QuestionCard,
  Screen,
  Select,
  Text,
} from '../../src/ui';
import { colors, radii, spacing } from '../../src/theme';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type Question,
} from '../../src/types/domain';

type SortKey = 'newest' | 'oldest' | 'subject' | 'difficulty';

const SORT_LABELS: Record<SortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  subject: 'Subject A–Z',
  difficulty: 'Difficulty',
};

const ALL = '__all__';
const DIFFICULTY_ORDER = { easy: 0, medium: 1, hard: 2 } as const;

export default function QuestionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const questions = useLibraryStore((state) => state.questions);
  const subjects = useLibraryStore((state) => state.subjects);
  const deleteQuestion = useLibraryStore((state) => state.deleteQuestion);
  const duplicateQuestion = useLibraryStore((state) => state.duplicateQuestion);

  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState(ALL);
  const [type, setType] = useState(ALL);
  const [difficulty, setDifficulty] = useState(ALL);
  const [sort, setSort] = useState<SortKey>('newest');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionFor, setActionFor] = useState<Question | null>(null);

  const activeFilters =
    (subject !== ALL ? 1 : 0) +
    (type !== ALL ? 1 : 0) +
    (difficulty !== ALL ? 1 : 0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();

    const filtered = questions.filter((question) => {
      if (subject !== ALL && question.subject !== subject) return false;
      if (type !== ALL && question.questionType !== type) return false;
      if (difficulty !== ALL && question.difficulty !== difficulty) return false;
      if (!needle) return true;
      // Search covers the fields a teacher would recall a question by.
      return (
        question.questionText.toLowerCase().includes(needle) ||
        question.topic.toLowerCase().includes(needle) ||
        question.subject.toLowerCase().includes(needle)
      );
    });

    return [...filtered].sort((a, b) => {
      switch (sort) {
        case 'oldest':
          return a.createdAt.localeCompare(b.createdAt);
        case 'subject':
          return a.subject.localeCompare(b.subject);
        case 'difficulty':
          return (
            DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty]
          );
        default:
          return b.createdAt.localeCompare(a.createdAt);
      }
    });
  }, [questions, query, subject, type, difficulty, sort]);

  const confirmDelete = (question: Question) => {
    setActionFor(null);
    Alert.alert(
      'Delete question?',
      'This cannot be undone. It will also be removed from any quiz that uses it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteQuestion(question.id),
        },
      ],
    );
  };

  const resetFilters = () => {
    setSubject(ALL);
    setType(ALL);
    setDifficulty(ALL);
  };

  const hasQuestions = questions.length > 0;

  return (
    <Screen padded={false} style={{ paddingTop: insets.top }}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text variant="title">Question Library</Text>
          <Button
            label="New"
            icon="＋"
            size="sm"
            fullWidth={false}
            onPress={() => router.push('/question/create')}
          />
        </View>

        {hasQuestions ? (
          <>
            <Input
              placeholder="Search questions…"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
            <View style={styles.controls}>
              <Pressable
                onPress={() => setFiltersOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Filter and sort questions"
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              >
                <Text variant="label" color={colors.primary}>
                  ⚙ Filter{activeFilters > 0 ? ` (${activeFilters})` : ''}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setFiltersOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Change sort order"
                style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              >
                <Text variant="label" color={colors.primary}>
                  ↕ {SORT_LABELS[sort]}
                </Text>
              </Pressable>
              <Text variant="caption" color={colors.textFaint}>
                {visible.length} of {questions.length}
              </Text>
            </View>
          </>
        ) : null}
      </View>

      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.list,
          visible.length === 0 && styles.listEmpty,
          { paddingBottom: spacing.xxl + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          hasQuestions ? (
            <EmptyState
              icon="🔍"
              title="No matches"
              message="Try a different search or clear your filters."
              actionLabel={activeFilters > 0 ? 'Clear filters' : undefined}
              onAction={activeFilters > 0 ? resetFilters : undefined}
            />
          ) : (
            <EmptyState
              icon="📚"
              title="No questions yet"
              message="Create your first question by typing it, speaking it, or importing a file."
              actionLabel="Create a question"
              onAction={() => router.push('/question/create')}
            />
          )
        }
        renderItem={({ item }) => (
          <QuestionCard
            question={item}
            onPress={() =>
              router.push({
                pathname: '/question/preview',
                params: { id: item.id },
              })
            }
            onLongPress={() => setActionFor(item)}
            trailing={
              <Pressable
                onPress={() => setActionFor(item)}
                accessibilityRole="button"
                accessibilityLabel="More actions"
                hitSlop={8}
                style={({ pressed }) => [styles.more, pressed && styles.pressed]}
              >
                <Text variant="bodyStrong" color={colors.textFaint}>
                  ⋯
                </Text>
              </Pressable>
            }
          />
        )}
      />

      {/* Filter + sort sheet */}
      <BottomSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filter & sort"
      >
        <View style={styles.sheetBody}>
          <Select
            label="Subject"
            value={subject}
            options={[
              { value: ALL, label: 'All subjects' },
              ...subjects.map((name) => ({ value: name, label: name })),
            ]}
            onChange={setSubject}
          />
          <Select
            label="Question type"
            value={type}
            options={[
              { value: ALL, label: 'All types' },
              ...QUESTION_TYPES.map((value) => ({
                value,
                label: QUESTION_TYPE_LABELS[value],
              })),
            ]}
            onChange={setType}
          />
          <Select
            label="Difficulty"
            value={difficulty}
            options={[
              { value: ALL, label: 'Any difficulty' },
              ...DIFFICULTIES.map((value) => ({
                value,
                label: DIFFICULTY_LABELS[value],
              })),
            ]}
            onChange={setDifficulty}
          />
          <Select
            label="Sort by"
            value={sort}
            options={(Object.keys(SORT_LABELS) as SortKey[]).map((key) => ({
              value: key,
              label: SORT_LABELS[key],
            }))}
            onChange={(value) => setSort(value as SortKey)}
          />
          <View style={styles.sheetActions}>
            <Button
              label="Clear filters"
              variant="secondary"
              onPress={resetFilters}
            />
            <Button label="Done" onPress={() => setFiltersOpen(false)} />
          </View>
        </View>
      </BottomSheet>

      {/* Per-question actions */}
      <BottomSheet
        visible={actionFor !== null}
        onClose={() => setActionFor(null)}
        title={actionFor ? 'Question actions' : undefined}
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
                router.push({ pathname: '/question/preview', params: { id } });
              }}
            />
            <Button
              label="Edit"
              icon="✏️"
              variant="secondary"
              onPress={() => {
                const id = actionFor.id;
                setActionFor(null);
                router.push({ pathname: '/question/edit', params: { id } });
              }}
            />
            <Button
              label="Duplicate"
              icon="⧉"
              variant="secondary"
              onPress={() => {
                duplicateQuestion(actionFor.id);
                setActionFor(null);
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  pressed: { opacity: 0.7 },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md },
  listEmpty: { flexGrow: 1 },
  more: { paddingHorizontal: spacing.xs },
  sheetBody: { gap: spacing.md, paddingBottom: spacing.md },
  sheetActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
});
