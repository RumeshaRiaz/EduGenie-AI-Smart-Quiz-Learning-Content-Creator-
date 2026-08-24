import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { Button, Screen } from '../../src/ui';
import { QuestionEditor } from '../../src/features/question/QuestionEditor';
import {
  emptyDraft,
  useQuestionDraft,
} from '../../src/features/question/useQuestionDraft';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import { useDraftHandoff } from '../../src/store/useDraftHandoff';

/**
 * Manual question creation.
 *
 * Also acts as the landing point for AI-generated drafts: the voice and single
 * generation flows stash a draft in the handoff store and navigate here with
 * `?fromHandoff=1`, so the user always reviews and approves before saving.
 */
export default function CreateQuestionScreen() {
  const router = useRouter();
  const { fromHandoff } = useLocalSearchParams<{ fromHandoff?: string }>();

  const preferences = useLibraryStore((state) => state.preferences);
  const subjects = useLibraryStore((state) => state.subjects);
  const addSubject = useLibraryStore((state) => state.addSubject);
  const addQuestion = useLibraryStore((state) => state.addQuestion);

  const takeDraft = useDraftHandoff((state) => state.take);

  const controller = useQuestionDraft(
    emptyDraft({
      subject: preferences.defaultSubject,
      difficulty: preferences.defaultDifficulty,
      questionType: preferences.defaultQuestionType,
    }),
  );

  // Pull in a draft produced by the voice or AI flow, exactly once.
  useEffect(() => {
    if (fromHandoff !== '1') return;
    const handoff = takeDraft();
    if (handoff) controller.replace(handoff);
    // `controller.replace` and `takeDraft` are stable; this must not re-run
    // when the draft changes or it would discard the user's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromHandoff]);

  const save = () => {
    if (!controller.validate()) {
      Alert.alert(
        'Almost there',
        'Please fill in the highlighted fields before saving.',
      );
      return;
    }
    addSubject(controller.draft.subject);
    addQuestion(controller.draft);
    // Replace so Back from the library does not return to a stale editor.
    router.replace('/questions');
  };

  return (
    <Screen
      scroll
      footer={<Button label="Save Question" icon="✓" onPress={save} />}
    >
      <QuestionEditor
        controller={controller}
        subjects={subjects}
        onAddSubject={addSubject}
        onVoiceInput={() => router.push('/voice/record')}
      />
    </Screen>
  );
}
