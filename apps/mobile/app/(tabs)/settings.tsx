import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Badge,
  Button,
  Card,
  Input,
  Screen,
  Select,
  Text,
} from '../../src/ui';
import { colors, spacing } from '../../src/theme';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import {
  DIFFICULTIES,
  DIFFICULTY_LABELS,
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type Difficulty,
  type QuestionType,
} from '../../src/types/domain';
import { getAIMode, getBackendUrl, setBackendUrlOverride } from '../../src/services/ai';

/** Locales offered for speech recognition. */
const LOCALES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'ur-PK', label: 'Urdu (Pakistan)' },
  { value: 'hi-IN', label: 'Hindi (India)' },
  { value: 'ar-SA', label: 'Arabic (Saudi Arabia)' },
];

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const preferences = useLibraryStore((state) => state.preferences);
  const setPreferences = useLibraryStore((state) => state.setPreferences);
  const subjects = useLibraryStore((state) => state.subjects);
  const questions = useLibraryStore((state) => state.questions);
  const quizzes = useLibraryStore((state) => state.quizzes);

  const [backendUrl, setBackendUrl] = useState(getBackendUrl());
  // Bumped after saving so the mode badge re-reads the module-level config.
  const [modeToken, setModeToken] = useState(0);
  const mode = getAIMode();

  const saveBackendUrl = () => {
    const trimmed = backendUrl.trim();
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      Alert.alert(
        'Invalid URL',
        'The backend URL must start with http:// or https://',
      );
      return;
    }
    setBackendUrlOverride(trimmed || null);
    setModeToken((token) => token + 1);
    Alert.alert(
      'Saved',
      trimmed
        ? 'EduGenie AI will now use your backend for AI features.'
        : 'Backend cleared. AI features fall back to offline sample mode.',
    );
  };

  return (
    <Screen scroll contentStyle={{ paddingTop: insets.top + spacing.lg }}>
      <Text variant="title">Settings</Text>

      <Card>
        <View style={styles.cardHeader}>
          <Text variant="heading">AI service</Text>
          <Badge
            key={modeToken}
            label={mode === 'backend' ? 'Connected' : 'Offline sample mode'}
            fg={mode === 'backend' ? colors.success : colors.warning}
            bg={mode === 'backend' ? colors.successSoft : colors.warningSoft}
          />
        </View>

        <Text variant="caption" color={colors.textMuted} style={styles.para}>
          {mode === 'backend'
            ? 'AI requests go to your EduGenie backend, which holds the provider API key. No key is stored in this app.'
            : 'No backend is configured, so AI actions use a built-in rule-based formatter. It is not a language model — it handles arithmetic and formatting only. Add your backend URL below to enable real AI.'}
        </Text>

        <Input
          label="Backend URL"
          placeholder="https://your-backend.example.com"
          value={backendUrl}
          onChangeText={setBackendUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          hint="Set EXPO_PUBLIC_API_URL to make this the default on every launch."
        />
        <Button
          label="Save backend URL"
          variant="secondary"
          onPress={saveBackendUrl}
          style={styles.action}
        />
      </Card>

      <Card>
        <Text variant="heading" style={styles.para}>
          Defaults for new questions
        </Text>
        <View style={styles.stack}>
          <Select
            label="Subject"
            value={preferences.defaultSubject}
            options={subjects.map((name) => ({ value: name, label: name }))}
            onChange={(value) => setPreferences({ defaultSubject: value })}
            searchable
          />
          <Select
            label="Question type"
            value={preferences.defaultQuestionType}
            options={QUESTION_TYPES.map((value) => ({
              value,
              label: QUESTION_TYPE_LABELS[value],
            }))}
            onChange={(value) =>
              setPreferences({ defaultQuestionType: value as QuestionType })
            }
          />
          <Select
            label="Difficulty"
            value={preferences.defaultDifficulty}
            options={DIFFICULTIES.map((value) => ({
              value,
              label: DIFFICULTY_LABELS[value],
            }))}
            onChange={(value) =>
              setPreferences({ defaultDifficulty: value as Difficulty })
            }
          />
        </View>
      </Card>

      <Card>
        <Text variant="heading" style={styles.para}>
          Voice
        </Text>
        <Select
          label="Recognition language"
          value={preferences.voiceLocale}
          options={LOCALES}
          onChange={(value) => setPreferences({ voiceLocale: value })}
        />
        <Text variant="caption" color={colors.textMuted} style={styles.note}>
          Speech is recognised on your device. Available languages depend on
          your device and its installed language packs.
        </Text>
      </Card>

      <Card>
        <Text variant="heading" style={styles.para}>
          Your library
        </Text>
        <Text variant="body" color={colors.textMuted}>
          {questions.length} question{questions.length === 1 ? '' : 's'} ·{' '}
          {quizzes.length} quiz{quizzes.length === 1 ? '' : 'zes'} ·{' '}
          {subjects.length} subjects
        </Text>
        <Text variant="caption" color={colors.textFaint} style={styles.note}>
          Everything is stored on this device.
        </Text>
      </Card>

      <Text variant="caption" color={colors.textFaint} center>
        EduGenie AI · version 1.0.0
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  para: { marginBottom: spacing.md },
  stack: { gap: spacing.md },
  action: { marginTop: spacing.md },
  note: { marginTop: spacing.sm },
});
