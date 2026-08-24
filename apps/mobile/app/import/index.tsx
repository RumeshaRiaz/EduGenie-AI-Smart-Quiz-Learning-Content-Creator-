import { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  ErrorBanner,
  LoadingState,
  Screen,
  Text,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme';
import { ImportError, pickAndExtract } from '../../src/services/files/extract';
import { useImportStore } from '../../src/store/useImportStore';
import { getAIMode } from '../../src/services/ai';

const FORMATS = [
  { glyph: '📃', label: 'TXT', note: 'Read on your device' },
  { glyph: '📊', label: 'CSV', note: 'One question per row' },
  { glyph: '📕', label: 'PDF', note: 'Needs backend' },
  { glyph: '📘', label: 'DOCX', note: 'Needs backend' },
];

export default function ImportScreen() {
  const router = useRouter();
  const setDocument = useImportStore((state) => state.setDocument);
  const reset = useImportStore((state) => state.reset);

  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseFile = async () => {
    setExtracting(true);
    setError(null);
    reset();

    try {
      const document = await pickAndExtract();
      // A null result means the user backed out of the picker.
      if (!document) return;
      setDocument(document);
      router.push('/import/preview');
    } catch (caught) {
      setError(
        caught instanceof ImportError
          ? caught.message
          : 'Could not process this file. Please try another one.',
      );
    } finally {
      setExtracting(false);
    }
  };

  if (extracting) {
    return (
      <Screen>
        <LoadingState message="Reading your file…" />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.intro}>
        <Text variant="title">Import questions from a file</Text>
        <Text variant="body" color={colors.textMuted}>
          Choose a document and EduGenie will pull out the text. You review it
          before anything is turned into questions.
        </Text>
      </View>

      <Card>
        <Text variant="label" color={colors.textMuted}>
          SUPPORTED FORMATS
        </Text>
        <View style={styles.formats}>
          {FORMATS.map((format) => (
            <View key={format.label} style={styles.format}>
              <Text style={styles.formatGlyph}>{format.glyph}</Text>
              <Text variant="bodyStrong">{format.label}</Text>
              <Text variant="caption" color={colors.textFaint} center>
                {format.note}
              </Text>
            </View>
          ))}
        </View>
      </Card>

      {getAIMode() === 'mock' ? (
        <Card>
          <Text variant="bodyStrong" color={colors.warning}>
            Backend not connected
          </Text>
          <Text
            variant="caption"
            color={colors.textMuted}
            style={styles.note}
          >
            PDF, DOCX and XLSX are unpacked by the EduGenie backend, so those
            formats need a backend URL (add one in Settings). TXT and CSV files
            work offline right now.
          </Text>
        </Card>
      ) : null}

      {error ? <ErrorBanner message={error} onRetry={chooseFile} /> : null}

      <Button label="Choose a file" icon="📄" onPress={chooseFile} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.xs },
  formats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  format: {
    flexGrow: 1,
    flexBasis: '40%',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
  },
  formatGlyph: { fontSize: 24 },
  note: { marginTop: spacing.sm },
});
