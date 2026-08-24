import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  Input,
  QuestionCard,
  Screen,
  Select,
  Text,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  type Difficulty,
} from '../../src/types/domain';
import { truncate } from '../../src/utils/format';

/** Questions shown at once in the picker sheet; the count is surfaced in the UI. */
const PICKER_LIMIT = 20;

/**
 * Quiz builder, used for both creating and editing.
 *
 * Passing `?id=` loads an existing quiz; otherwise a new one is created.
 * Question order is managed with explicit up/down controls rather than
 * drag-and-drop — it is reliable, accessible and needs no gesture library.
 */
export default function CreateQuizScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const questions = useLibraryStore((state) => state.questions);
  const subjects = useLibraryStore((state) => state.subjects);
  const existing = useLibraryStore((state) =>
    id ? state.quizzes.find((quiz) => quiz.id === id) : undefined,
  );
  const addQuiz = useLibraryStore((state) => state.addQuiz);
  const updateQuiz = useLibraryStore((state) => state.updateQuiz);
  const preferences = useLibraryStore((state) => state.preferences);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [subject, setSubject] = useState(
    existing?.subject ?? preferences.defaultSubject,
  );
  const [topic, setTopic] = useState(existing?.topic ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>(
    existing?.difficulty ?? preferences.defaultDifficulty,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>(
    existing?.questionIds ?? [],
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showTitleError, setShowTitleError] = useState(false);

  /** Selected questions, in the order the quiz defines. */
  const selected = useMemo(
    () =>
      selectedIds
        .map((questionId) =>
          questions.find((question) => question.id === questionId),
        )
        .filter((question): question is NonNullable<typeof question> =>
          Boolean(question),
        ),
    [selectedIds, questions],
  );

  const pickable = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return questions;
    return questions.filter(
      (question) =>
        question.questionText.toLowerCase().includes(needle) ||
        question.subject.toLowerCase().includes(needle) ||
        question.topic.toLowerCase().includes(needle),
    );
  }, [questions, search]);

  const toggle = (questionId: string) => {
    setSelectedIds((current) =>
      current.includes(questionId)
        ? current.filter((item) => item !== questionId)
        : [...current, questionId],
    );
  };

  /** Moves a question one place up or down in the quiz order. */
  const move = (index: number, delta: number) => {
    setSelectedIds((current) => {
      const target = index + delta;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = () => {
    if (!title.trim()) {
      setShowTitleError(true);
      Alert.alert('Add a title', 'Give your quiz a name before saving.');
      return;
    }
    if (selectedIds.length === 0) {
      Alert.alert(
        'No questions selected',
        'Add at least one question to the quiz.',
      );
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      subject,
      topic: topic.trim(),
      difficulty,
      questionIds: selectedIds,
    };

    if (existing) {
      updateQuiz(existing.id, payload);
    } else {
      addQuiz(payload);
    }
    router.replace('/quizzes');
  };

  if (questions.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="📚"
          title="No questions yet"
          message="A quiz is built from saved questions. Create one first."
          actionLabel="Create a question"
          onAction={() => router.replace('/question/create')}
        />
      </Screen>
    );
  }

  return (
    <Screen
      scroll
      footer={
        <Button
          label={existing ? 'Save Changes' : 'Save Quiz'}
          icon="✓"
          onPress={save}
        />
      }
    >
      <Card>
        <Input
          label="Quiz title"
          placeholder="e.g. Week 3 — Addition Practice"
          value={title}
          onChangeText={(value) => {
            setTitle(value);
            if (showTitleError) setShowTitleError(false);
          }}
          error={showTitleError ? 'Enter a title for the quiz.' : undefined}
        />
        <Input
          label="Description"
          placeholder="What is this quiz for?"
          value={description}
          onChangeText={setDescription}
          multiline
          containerStyle={styles.field}
        />
        <View style={styles.split}>
          <View style={styles.half}>
            <Select
              label="Subject"
              value={subject}
              options={subjects.map((name) => ({ value: name, label: name }))}
              onChange={setSubject}
              searchable
              allowCustom
            />
          </View>
          <View style={styles.half}>
            <Select
              label="Difficulty"
              value={difficulty}
              options={DIFFICULTIES.map((value) => ({
                value,
                label: DIFFICULTY_LABELS[value],
              }))}
              onChange={(value) => setDifficulty(value as Difficulty)}
            />
          </View>
        </View>
        <Input
          label="Topic"
          placeholder="e.g. Addition"
          value={topic}
          onChangeText={setTopic}
          containerStyle={styles.field}
        />
      </Card>

      <View style={styles.sectionHeader}>
        <Text variant="heading">
          Questions ({selected.length})
        </Text>
        <Button
          label="Add questions"
          icon="＋"
          variant="secondary"
          size="sm"
          fullWidth={false}
          onPress={() => setPickerOpen(true)}
        />
      </View>

      {selected.length === 0 ? (
        <Card>
          <Text variant="body" color={colors.textMuted}>
            No questions added yet. Tap “Add questions” to choose from your
            library.
          </Text>
        </Card>
      ) : (
        selected.map((question, index) => (
          <View key={question.id} style={styles.orderRow}>
            <View style={styles.orderControls}>
              <Pressable
                onPress={() => move(index, -1)}
                disabled={index === 0}
                accessibilityRole="button"
                accessibilityLabel={`Move question ${index + 1} up`}
                style={({ pressed }) => [
                  styles.orderButton,
                  index === 0 && styles.orderDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text variant="caption" color={colors.primary}>
                  ▲
                </Text>
              </Pressable>
              <Text variant="label" color={colors.textMuted}>
                {index + 1}
              </Text>
              <Pressable
                onPress={() => move(index, 1)}
                disabled={index === selected.length - 1}
                accessibilityRole="button"
                accessibilityLabel={`Move question ${index + 1} down`}
                style={({ pressed }) => [
                  styles.orderButton,
                  index === selected.length - 1 && styles.orderDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text variant="caption" color={colors.primary}>
                  ▼
                </Text>
              </Pressable>
            </View>

            <View style={styles.orderCard}>
              <QuestionCard
                question={question}
                onPress={() =>
                  router.push({
                    pathname: '/question/preview',
                    params: { id: question.id },
                  })
                }
                trailing={
                  <Pressable
                    onPress={() => toggle(question.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove question ${index + 1} from quiz`}
                    hitSlop={8}
                  >
                    <Text variant="bodyStrong" color={colors.textFaint}>
                      ✕
                    </Text>
                  </Pressable>
                }
              />
            </View>
          </View>
        ))
      )}

      <BottomSheet
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add questions"
      >
        <View style={styles.sheetBody}>
          <Input
            placeholder="Search your library…"
            value={search}
            onChangeText={setSearch}
            autoCorrect={false}
          />
          <View style={styles.pickList}>
            {pickable.length === 0 ? (
              <Text variant="caption" color={colors.textMuted} center>
                No questions match that search.
              </Text>
            ) : (
              pickable.slice(0, PICKER_LIMIT).map((question) => {
                const isSelected = selectedIds.includes(question.id);
                return (
                  <Pressable
                    key={question.id}
                    onPress={() => toggle(question.id)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isSelected }}
                    accessibilityLabel={truncate(question.questionText, 80)}
                    style={({ pressed }) => [
                      styles.pickRow,
                      isSelected && styles.pickRowOn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[styles.check, isSelected && styles.checkOn]}
                    >
                      {isSelected ? (
                        <Text variant="label" color={colors.onPrimary}>
                          ✓
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.pickText}>
                      <Text variant="body" numberOfLines={2}>
                        {question.questionText}
                      </Text>
                      <Text variant="caption" color={colors.textFaint}>
                        {question.subject}
                        {question.topic ? ` · ${question.topic}` : ''}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
          {pickable.length > PICKER_LIMIT ? (
            <Text variant="caption" color={colors.textFaint} center>
              Showing the first {PICKER_LIMIT} of {pickable.length} matches —
              search to narrow them down.
            </Text>
          ) : null}
          <Button
            label={`Done (${selectedIds.length} selected)`}
            onPress={() => setPickerOpen(false)}
          />
        </View>
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { marginTop: spacing.md },
  split: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  half: { flex: 1 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  orderControls: { alignItems: 'center', gap: spacing.xs },
  orderButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderDisabled: { opacity: 0.35 },
  orderCard: { flex: 1 },
  pressed: { opacity: 0.7 },
  sheetBody: { gap: spacing.md, paddingBottom: spacing.md },
  pickList: { maxHeight: 340, gap: spacing.sm },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  pickRowOn: { backgroundColor: colors.primarySoft },
  pickText: { flex: 1, gap: 2 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
});
