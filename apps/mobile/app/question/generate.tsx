import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  AIProcessingIndicator,
  Button,
  Card,
  ErrorBanner,
  Input,
  Screen,
  Select,
  Text,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import { useDraftHandoff } from '../../src/store/useDraftHandoff';
import { AIError, toQuestionDraft } from '../../src/types/ai';
import { generateQuestion, getAIMode } from '../../src/services/ai';
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type Difficulty,
  type QuestionType,
} from '../../src/types/domain';

/** Example prompts that show the kind of instruction the AI understands. */
const EXAMPLES = [
  'Make an addition question for a 7 year old about apples',
  'What is 8 times 7 and the answer is 56',
  'A true or false question about the water cycle',
];

/**
 * Free-text AI generation: the user describes what they want and reviews the
 * generated draft in the editor before it is saved.
 */
export default function GenerateQuestionScreen() {
  const router = useRouter();

  const preferences = useLibraryStore((state) => state.preferences);
  const putDraft = useDraftHandoff((state) => state.put);

  const [prompt, setPrompt] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>(
    preferences.defaultQuestionType,
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    preferences.defaultDifficulty,
  );
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    const cleaned = prompt.trim();
    if (!cleaned) {
      setError('Describe the question you would like to create.');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const question = await generateQuestion(cleaned, {
        questionType,
        difficulty,
        subject: preferences.defaultSubject,
      });
      putDraft(toQuestionDraft(question, 'ai'));
      router.replace({
        pathname: '/question/create',
        params: { fromHandoff: '1' },
      });
    } catch (caught) {
      setError(
        caught instanceof AIError
          ? caught.friendlyMessage
          : 'AI generation failed. Please try again.',
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Screen
      scroll
      footer={
        <Button
          label="Generate Question"
          icon="✨"
          onPress={generate}
          loading={generating}
          disabled={generating || !prompt.trim()}
        />
      }
    >
      <View style={styles.intro}>
        <Text variant="title">Generate with AI</Text>
        <Text variant="body" color={colors.textMuted}>
          Describe what you want and AI will draft the question, answer and
          explanation. You review it before saving.
        </Text>
      </View>

      <Card>
        <Input
          label="What should the question be about?"
          placeholder="e.g. Make some questions for kids about addition and subtraction"
          value={prompt}
          onChangeText={setPrompt}
          multiline
        />

        <View style={styles.examples}>
          <Text variant="label" color={colors.textMuted}>
            EXAMPLES
          </Text>
          {EXAMPLES.map((example) => (
            <Button
              key={example}
              label={example}
              variant="ghost"
              size="sm"
              onPress={() => setPrompt(example)}
              style={styles.example}
            />
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.split}>
          <View style={styles.half}>
            <Select
              label="Question type"
              value={questionType}
              options={QUESTION_TYPES.map((value) => ({
                value,
                label: QUESTION_TYPE_LABELS[value],
              }))}
              onChange={(value) => setQuestionType(value as QuestionType)}
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
      </Card>

      {getAIMode() === 'mock' ? (
        <Text variant="caption" color={colors.warning}>
          Offline sample mode — questions are built by a local rule-based
          formatter, not a language model. It handles arithmetic and formatting
          only. Connect a backend in Settings for real AI.
        </Text>
      ) : null}

      {generating ? (
        <AIProcessingIndicator message="Writing your question…" />
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={generate} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs },
  examples: { gap: spacing.xs, marginTop: spacing.lg },
  example: { alignItems: 'flex-start' },
  split: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
});
