import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  AIProcessingIndicator,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  Screen,
  Text,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme';
import { useVoiceHandoff } from '../../src/store/useVoiceHandoff';
import { useDraftHandoff } from '../../src/store/useDraftHandoff';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import { AIError, toQuestionDraft } from '../../src/types/ai';
import { getAIMode, processVoiceQuestion } from '../../src/services/ai';
import { formatDuration } from '../../src/utils/format';

/**
 * Lets the user read and correct what was heard before any AI call, then hands
 * the generated draft to the editor for final approval.
 */
export default function VoiceTranscriptScreen() {
  const router = useRouter();

  const transcript = useVoiceHandoff((state) => state.transcript);
  const clearTranscript = useVoiceHandoff((state) => state.clear);
  const putDraft = useDraftHandoff((state) => state.put);
  const preferences = useLibraryStore((state) => state.preferences);

  const [text, setText] = useState(transcript?.text ?? '');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!transcript) {
    return (
      <Screen>
        <EmptyState
          icon="🎤"
          title="Nothing recorded"
          message="Record your question first and it will appear here for review."
          actionLabel="Record now"
          onAction={() => router.replace('/voice/record')}
        />
      </Screen>
    );
  }

  const createQuestion = async () => {
    const cleaned = text.trim();
    if (!cleaned) {
      setError('Enter what you would like the question to be about.');
      return;
    }

    setProcessing(true);
    setError(null);
    try {
      const generated = await processVoiceQuestion(cleaned, {
        subject: preferences.defaultSubject,
      });
      // `source: voice` records how this question came to exist.
      putDraft(toQuestionDraft(generated, 'voice'));
      clearTranscript();
      router.replace({
        pathname: '/question/create',
        params: { fromHandoff: '1' },
      });
    } catch (caught) {
      setError(
        caught instanceof AIError
          ? caught.friendlyMessage
          : 'Something went wrong. Please try again.',
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Screen
      scroll
      footer={
        <View style={styles.footer}>
          <Button
            label="Create Question"
            icon="✨"
            onPress={createQuestion}
            loading={processing}
            disabled={processing || !text.trim()}
          />
          <Button
            label="Record again"
            variant="ghost"
            onPress={() => {
              clearTranscript();
              router.replace('/voice/record');
            }}
            disabled={processing}
          />
        </View>
      }
    >
      <View style={styles.intro}>
        <Text variant="title">Review what we heard</Text>
        <Text variant="body" color={colors.textMuted}>
          Edit the text if anything was misheard, then let AI turn it into a
          structured question.
        </Text>
      </View>

      <Card>
        <Input
          label="Recognised text"
          value={text}
          onChangeText={setText}
          multiline
          hint={`Recorded ${formatDuration(transcript.durationMs)} · ${transcript.locale}`}
        />
      </Card>

      {getAIMode() === 'mock' ? (
        <Text variant="caption" color={colors.warning}>
          Offline sample mode — the question is built by a local rule-based
          formatter, not a language model. Connect a backend in Settings for
          real AI.
        </Text>
      ) : null}

      {processing ? (
        <AIProcessingIndicator
          message="Turning your words into a question…"
          detail="Working out the question, answer and explanation."
        />
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={createQuestion} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs },
  footer: { gap: spacing.sm },
});
