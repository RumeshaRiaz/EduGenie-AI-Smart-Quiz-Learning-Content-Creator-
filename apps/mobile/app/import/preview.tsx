import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  AIProcessingIndicator,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  Screen,
  Text,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme';
import { useImportStore } from '../../src/store/useImportStore';
import { AIError, toQuestionDraft } from '../../src/types/ai';
import { getAIMode, parseEducationalContent } from '../../src/services/ai';
import { formatBytes } from '../../src/utils/format';

/** How many questions one document may produce in a single pass. */
const MAX_QUESTIONS = 10;

/**
 * Shows the text extracted from the document and lets the user correct it
 * before generation. Nothing is saved to the library from this screen.
 */
export default function ImportPreviewScreen() {
  const router = useRouter();

  const document = useImportStore((state) => state.document);
  const setGenerated = useImportStore((state) => state.setGenerated);

  const [content, setContent] = useState(document?.extractedText ?? '');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!document) {
    return (
      <Screen>
        <EmptyState
          icon="📄"
          title="No file selected"
          message="Pick a document to see its contents here."
          actionLabel="Choose a file"
          onAction={() => router.replace('/import')}
        />
      </Screen>
    );
  }

  const generate = async () => {
    const cleaned = content.trim();
    if (!cleaned) {
      setError('There is no text to turn into questions.');
      return;
    }

    setGenerating(true);
    setError(null);
    try {
      const questions = await parseEducationalContent(cleaned, MAX_QUESTIONS);
      setGenerated(
        questions.map((question) => toQuestionDraft(question, 'import')),
      );
      router.push('/import/generated');
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
          label="Generate Questions with AI"
          icon="✨"
          onPress={generate}
          loading={generating}
          disabled={generating || !content.trim()}
        />
      }
    >
      <Card>
        <Text variant="heading" numberOfLines={2}>
          {document.name}
        </Text>
        <View style={styles.badges}>
          <Badge
            label={document.kind.toUpperCase()}
            fg={colors.primary}
            bg={colors.primarySoft}
          />
          {document.size ? <Badge label={formatBytes(document.size)} /> : null}
          <Badge label={`${content.trim().length} characters`} />
        </View>
      </Card>

      <View style={styles.intro}>
        <Text variant="title">Check the extracted text</Text>
        <Text variant="body" color={colors.textMuted}>
          Edit anything that came through wrong. Nothing is saved until you
          approve the generated questions.
        </Text>
      </View>

      <Card>
        <Input
          label="Extracted content"
          value={content}
          onChangeText={setContent}
          multiline
          containerStyle={styles.editor}
          hint={`Up to ${MAX_QUESTIONS} questions will be generated.`}
        />
      </Card>

      {getAIMode() === 'mock' ? (
        <Text variant="caption" color={colors.warning}>
          Offline sample mode — questions are built by a local rule-based
          formatter, not a language model.
        </Text>
      ) : null}

      {generating ? (
        <AIProcessingIndicator
          message="Reading your content…"
          detail="Finding questions and writing answers and explanations."
        />
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={generate} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  intro: { gap: spacing.xs },
  editor: { minHeight: 220 },
});
