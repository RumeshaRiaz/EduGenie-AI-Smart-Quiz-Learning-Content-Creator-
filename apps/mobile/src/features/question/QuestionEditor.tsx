/**
 * The question editing form, shared by the create, edit and preview screens.
 *
 * Owns the three inline AI actions (improve, generate options, generate
 * explanation). Each runs independently, shows its own busy state and reports
 * failure through a banner without discarding what the user has typed.
 */

import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  Badge,
  Button,
  Card,
  ErrorBanner,
  Input,
  Select,
  Text,
} from '../../ui';
import { colors, radii, spacing } from '../../theme';
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  requiresOptions,
  type Difficulty,
  type QuestionType,
} from '../../types/domain';
import { AIError, toAIQuestion, toQuestionDraft } from '../../types/ai';
import {
  generateExplanation,
  generateOptions,
  getAIMode,
  improveQuestion,
} from '../../services/ai';
import type { QuestionDraftController } from './useQuestionDraft';

type BusyAction = 'improve' | 'options' | 'explanation' | null;

export interface QuestionEditorProps {
  controller: QuestionDraftController;
  subjects: string[];
  onAddSubject: (name: string) => void;
  /** Opens the voice recorder to dictate the question text. */
  onVoiceInput?: () => void;
}

export function QuestionEditor({
  controller,
  subjects,
  onAddSubject,
  onVoiceInput,
}: QuestionEditorProps) {
  const { draft, errors } = controller;
  const [busy, setBusy] = useState<BusyAction>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const isMock = getAIMode() === 'mock';

  const showOptions = requiresOptions(draft.questionType);

  /** Runs an AI action, mapping any failure onto a friendly banner message. */
  const runAI = async (action: BusyAction, task: () => Promise<void>) => {
    setBusy(action);
    setAiError(null);
    try {
      await task();
    } catch (error) {
      setAiError(
        error instanceof AIError
          ? error.friendlyMessage
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setBusy(null);
    }
  };

  const handleImprove = () =>
    runAI('improve', async () => {
      const improved = await improveQuestion(toAIQuestion(draft));
      const next = toQuestionDraft(improved, draft.source);
      // Keep the user's own subject/topic choices; the AI only rewrites content.
      controller.replace({
        ...next,
        subject: draft.subject || next.subject,
        topic: draft.topic || next.topic,
      });
    });

  const handleGenerateOptions = () =>
    runAI('options', async () => {
      const answerText =
        draft.options.find((option) => option.id === draft.correctAnswer)
          ?.text ?? draft.correctAnswer;
      const result = await generateOptions(draft.questionText, answerText);
      controller.replaceOptions(result.options, result.correctAnswer);
    });

  const handleGenerateExplanation = () =>
    runAI('explanation', async () => {
      const answerText =
        draft.options.find((option) => option.id === draft.correctAnswer)
          ?.text ?? draft.correctAnswer;
      const explanation = await generateExplanation(
        draft.questionText,
        answerText,
      );
      controller.setField('explanation', explanation);
    });

  return (
    <View style={styles.root}>
      {isMock ? (
        <View style={styles.notice}>
          <Text variant="caption" color={colors.warning}>
            Offline sample mode — AI actions use a built-in rule-based
            formatter, not a language model. Connect a backend in Settings for
            real AI.
          </Text>
        </View>
      ) : null}

      <Card>
        <View style={styles.row}>
          <Select
            label="Question type"
            value={draft.questionType}
            options={QUESTION_TYPES.map((type) => ({
              value: type,
              label: QUESTION_TYPE_LABELS[type],
            }))}
            onChange={(value) =>
              controller.setQuestionType(value as QuestionType)
            }
          />
        </View>

        <View style={styles.split}>
          <View style={styles.half}>
            <Select
              label="Subject"
              value={draft.subject}
              options={subjects.map((subject) => ({
                value: subject,
                label: subject,
              }))}
              onChange={(value) => {
                onAddSubject(value);
                controller.setField('subject', value);
              }}
              searchable
              allowCustom
              customLabel="New subject"
            />
          </View>
          <View style={styles.half}>
            <Select
              label="Difficulty"
              value={draft.difficulty}
              options={DIFFICULTIES.map((level) => ({
                value: level,
                label: DIFFICULTY_LABELS[level],
              }))}
              onChange={(value) =>
                controller.setField('difficulty', value as Difficulty)
              }
            />
          </View>
        </View>

        <Input
          label="Topic"
          placeholder="e.g. Addition"
          value={draft.topic}
          onChangeText={(value) => controller.setField('topic', value)}
          containerStyle={styles.field}
        />
      </Card>

      <Card>
        <View style={styles.labelRow}>
          <Text variant="label" color={colors.textMuted}>
            QUESTION
          </Text>
          {onVoiceInput ? (
            <Pressable
              onPress={onVoiceInput}
              accessibilityRole="button"
              accessibilityLabel="Dictate the question with your voice"
              style={({ pressed }) => [styles.voiceChip, pressed && styles.pressed]}
            >
              <Text variant="label" color={colors.accent}>
                🎤 Voice input
              </Text>
            </Pressable>
          ) : null}
        </View>

        <Input
          placeholder="e.g. Ali has 5 apples and gives 2 to Sara. How many are left?"
          value={draft.questionText}
          onChangeText={(value) => controller.setField('questionText', value)}
          error={errors.questionText}
          multiline
        />

        <Button
          label="Improve & Format with AI"
          icon="✨"
          variant="secondary"
          onPress={handleImprove}
          loading={busy === 'improve'}
          disabled={busy !== null || !draft.questionText.trim()}
          style={styles.field}
          accessibilityHint="Rewrites your question with cleaner wording"
        />
      </Card>

      {showOptions ? (
        <Card>
          <Text variant="label" color={colors.textMuted}>
            OPTIONS
          </Text>
          <Text variant="caption" color={colors.textFaint} style={styles.hint}>
            Tap a circle to mark the correct answer.
          </Text>

          {draft.options.map((option, index) => {
            const selected = option.id === draft.correctAnswer;
            return (
              <View key={option.id} style={styles.optionRow}>
                <Pressable
                  onPress={() => controller.setCorrectOption(option.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Mark option ${String.fromCharCode(65 + index)} as correct`}
                  style={[styles.radio, selected && styles.radioOn]}
                >
                  <Text
                    variant="label"
                    color={selected ? colors.onPrimary : colors.textMuted}
                  >
                    {String.fromCharCode(65 + index)}
                  </Text>
                </Pressable>

                <Input
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  value={option.text}
                  onChangeText={(value) =>
                    controller.setOptionText(option.id, value)
                  }
                  containerStyle={styles.optionInput}
                  // True/False options are fixed; only the choice is editable.
                  editable={draft.questionType !== 'true_false'}
                />

                {draft.questionType !== 'true_false' &&
                draft.options.length > 2 ? (
                  <Pressable
                    onPress={() => controller.removeOption(option.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove option ${String.fromCharCode(65 + index)}`}
                    style={({ pressed }) => [
                      styles.remove,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text variant="body" color={colors.textFaint}>
                      ✕
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            );
          })}

          {errors.options ? (
            <Text variant="caption" color={colors.danger}>
              {errors.options}
            </Text>
          ) : null}
          {errors.correctAnswer ? (
            <Text variant="caption" color={colors.danger}>
              {errors.correctAnswer}
            </Text>
          ) : null}

          {draft.questionType !== 'true_false' ? (
            <View style={styles.optionActions}>
              {draft.options.length < 8 ? (
                <Button
                  label="Add option"
                  variant="ghost"
                  size="sm"
                  fullWidth={false}
                  onPress={controller.addOption}
                />
              ) : null}
              <Button
                label="Generate Options with AI"
                icon="✨"
                variant="secondary"
                size="sm"
                fullWidth={false}
                onPress={handleGenerateOptions}
                loading={busy === 'options'}
                disabled={busy !== null}
                accessibilityHint="Builds plausible answer choices around the correct answer"
              />
            </View>
          ) : null}
        </Card>
      ) : (
        <Card>
          <Input
            label="Correct answer"
            placeholder="e.g. 3"
            value={draft.correctAnswer}
            onChangeText={(value) => controller.setField('correctAnswer', value)}
            error={errors.correctAnswer}
          />
        </Card>
      )}

      <Card>
        <Input
          label="Explanation"
          placeholder="Explain why the answer is correct."
          value={draft.explanation}
          onChangeText={(value) => controller.setField('explanation', value)}
          multiline
        />
        <Button
          label="Generate Explanation with AI"
          icon="✨"
          variant="secondary"
          onPress={handleGenerateExplanation}
          loading={busy === 'explanation'}
          disabled={busy !== null || !draft.questionText.trim()}
          style={styles.field}
        />
      </Card>

      {aiError ? <ErrorBanner message={aiError} /> : null}

      {draft.source !== 'manual' ? (
        <View style={styles.sourceRow}>
          <Badge
            label={`Created via ${draft.source}`}
            fg={colors.accent}
            bg={colors.accentSoft}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  row: { gap: spacing.md },
  split: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  half: { flex: 1 },
  field: { marginTop: spacing.md },
  hint: { marginTop: spacing.xs, marginBottom: spacing.sm },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  voiceChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.accentSoft,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  radio: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionInput: { flex: 1 },
  remove: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  notice: {
    backgroundColor: colors.warningSoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  sourceRow: { flexDirection: 'row' },
});
