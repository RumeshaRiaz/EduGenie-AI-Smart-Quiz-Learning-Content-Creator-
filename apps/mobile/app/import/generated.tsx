import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import {
  BottomSheet,
  Button,
  Card,
  EmptyState,
  Input,
  Screen,
  Select,
  Text,
} from '../../src/ui';
import { QuestionPreview } from '../../src/features/question/QuestionPreview';
import { colors, spacing } from '../../src/theme';
import { useImportStore } from '../../src/store/useImportStore';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  requiresOptions,
  type Difficulty,
  type QuestionDraft,
} from '../../src/types/domain';

/**
 * Review step for AI-generated questions.
 *
 * Every question must be seen before it reaches the library. Each can be edited
 * inline or discarded; only what remains is saved.
 */
export default function GeneratedQuestionsScreen() {
  const router = useRouter();

  const generated = useImportStore((state) => state.generated);
  const updateGenerated = useImportStore((state) => state.updateGenerated);
  const removeGenerated = useImportStore((state) => state.removeGenerated);
  const reset = useImportStore((state) => state.reset);

  const addQuestions = useLibraryStore((state) => state.addQuestions);
  const addSubject = useLibraryStore((state) => state.addSubject);
  const subjects = useLibraryStore((state) => state.subjects);

  const [editing, setEditing] = useState<number | null>(null);

  if (generated.length === 0) {
    return (
      <Screen>
        <EmptyState
          icon="✨"
          title="No questions to review"
          message="Import a file and generate questions to see them here."
          actionLabel="Start an import"
          onAction={() => {
            reset();
            router.replace('/import');
          }}
        />
      </Screen>
    );
  }

  const saveAll = () => {
    generated.forEach((draft) => addSubject(draft.subject));
    addQuestions(generated);
    const count = generated.length;
    reset();
    Alert.alert(
      'Saved',
      `${count} question${count === 1 ? '' : 's'} added to your library.`,
    );
    router.replace('/questions');
  };

  const discard = (index: number) => {
    Alert.alert('Discard this question?', 'It will not be saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => removeGenerated(index),
      },
    ]);
  };

  const draft = editing !== null ? generated[editing] : null;

  /** Applies a field change to the question currently open in the sheet. */
  const patchEditing = (patch: Partial<QuestionDraft>) => {
    if (editing === null || !draft) return;
    updateGenerated(editing, { ...draft, ...patch });
  };

  return (
    <Screen
      scroll
      footer={
        <Button
          label={`Save ${generated.length} question${generated.length === 1 ? '' : 's'}`}
          icon="✓"
          onPress={saveAll}
        />
      }
    >
      <View style={styles.intro}>
        <Text variant="title">Review before saving</Text>
        <Text variant="body" color={colors.textMuted}>
          AI generated these from your file. Edit or remove any that are not
          right — nothing is saved until you tap save.
        </Text>
      </View>

      {generated.map((question, index) => (
        <View key={`${question.questionText}-${index}`} style={styles.item}>
          <QuestionPreview question={question} index={index + 1} />
          <View style={styles.itemActions}>
            <Pressable
              onPress={() => setEditing(index)}
              accessibilityRole="button"
              accessibilityLabel={`Edit question ${index + 1}`}
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            >
              <Text variant="label" color={colors.primary}>
                ✏️ Edit
              </Text>
            </Pressable>
            <Pressable
              onPress={() => discard(index)}
              accessibilityRole="button"
              accessibilityLabel={`Discard question ${index + 1}`}
              style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            >
              <Text variant="label" color={colors.danger}>
                🗑 Discard
              </Text>
            </Pressable>
          </View>
        </View>
      ))}

      <BottomSheet
        visible={editing !== null}
        onClose={() => setEditing(null)}
        title="Edit question"
      >
        {draft ? (
          <View style={styles.sheetBody}>
            <Input
              label="Question"
              value={draft.questionText}
              onChangeText={(value) => patchEditing({ questionText: value })}
              multiline
            />

            {requiresOptions(draft.questionType) ? (
              <Card>
                <Text variant="label" color={colors.textMuted}>
                  OPTIONS
                </Text>
                <Text
                  variant="caption"
                  color={colors.textFaint}
                  style={styles.hint}
                >
                  Tap a letter to mark the correct answer.
                </Text>
                {draft.options.map((option, position) => {
                  const selected = option.id === draft.correctAnswer;
                  return (
                    <View key={option.id} style={styles.optionRow}>
                      <Pressable
                        onPress={() => patchEditing({ correctAnswer: option.id })}
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Mark option ${String.fromCharCode(65 + position)} correct`}
                        style={[styles.radio, selected && styles.radioOn]}
                      >
                        <Text
                          variant="label"
                          color={selected ? colors.onPrimary : colors.textMuted}
                        >
                          {String.fromCharCode(65 + position)}
                        </Text>
                      </Pressable>
                      <Input
                        value={option.text}
                        onChangeText={(value) =>
                          patchEditing({
                            options: draft.options.map((item) =>
                              item.id === option.id
                                ? { ...item, text: value }
                                : item,
                            ),
                          })
                        }
                        containerStyle={styles.optionInput}
                      />
                    </View>
                  );
                })}
              </Card>
            ) : (
              <Input
                label="Correct answer"
                value={draft.correctAnswer}
                onChangeText={(value) => patchEditing({ correctAnswer: value })}
              />
            )}

            <Input
              label="Explanation"
              value={draft.explanation}
              onChangeText={(value) => patchEditing({ explanation: value })}
              multiline
            />

            <View style={styles.split}>
              <View style={styles.half}>
                <Select
                  label="Subject"
                  value={draft.subject}
                  options={subjects.map((name) => ({
                    value: name,
                    label: name,
                  }))}
                  onChange={(value) => patchEditing({ subject: value })}
                  searchable
                  allowCustom
                />
              </View>
              <View style={styles.half}>
                <Select
                  label="Difficulty"
                  value={draft.difficulty}
                  options={DIFFICULTIES.map((value) => ({
                    value,
                    label: DIFFICULTY_LABELS[value],
                  }))}
                  onChange={(value) =>
                    patchEditing({ difficulty: value as Difficulty })
                  }
                />
              </View>
            </View>

            <Button label="Done" onPress={() => setEditing(null)} />
          </View>
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs },
  item: { gap: spacing.sm },
  itemActions: {
    flexDirection: 'row',
    gap: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  link: { paddingVertical: spacing.xs },
  pressed: { opacity: 0.7 },
  sheetBody: { gap: spacing.md, paddingBottom: spacing.md },
  hint: { marginTop: spacing.xs, marginBottom: spacing.sm },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  radio: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionInput: { flex: 1 },
  split: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
});
