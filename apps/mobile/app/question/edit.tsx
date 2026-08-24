import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert } from 'react-native';
import { Button, EmptyState, Screen } from '../../src/ui';
import { QuestionEditor } from '../../src/features/question/QuestionEditor';
import {
  emptyDraft,
  useQuestionDraft,
} from '../../src/features/question/useQuestionDraft';
import { useLibraryStore } from '../../src/store/useLibraryStore';
import type { QuestionDraft } from '../../src/types/domain';

export default function EditQuestionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const question = useLibraryStore((state) =>
    id ? state.questions.find((item) => item.id === id) : undefined,
  );
  const subjects = useLibraryStore((state) => state.subjects);
  const addSubject = useLibraryStore((state) => state.addSubject);
  const updateQuestion = useLibraryStore((state) => state.updateQuestion);

  // Hooks must run unconditionally, so seed with a blank draft when the id is
  // missing and render the empty state below instead of bailing out early.
  const initial: QuestionDraft = question
    ? {
        questionText: question.questionText,
        questionType: question.questionType,
        options: question.options,
        correctAnswer: question.correctAnswer,
        explanation: question.explanation,
        subject: question.subject,
        topic: question.topic,
        difficulty: question.difficulty,
        source: question.source,
      }
    : emptyDraft();

  const controller = useQuestionDraft(initial);

  if (!question || !id) {
    return (
      <Screen>
        <EmptyState
          icon="🔎"
          title="Question not found"
          message="It may have been deleted."
          actionLabel="Back to library"
          onAction={() => router.replace('/questions')}
        />
      </Screen>
    );
  }

  const save = () => {
    if (!controller.validate()) {
      Alert.alert(
        'Almost there',
        'Please fill in the highlighted fields before saving.',
      );
      return;
    }
    addSubject(controller.draft.subject);
    updateQuestion(id, controller.draft);
    router.back();
  };

  return (
    <Screen
      scroll
      footer={<Button label="Save Changes" icon="✓" onPress={save} />}
    >
      <QuestionEditor
        controller={controller}
        subjects={subjects}
        onAddSubject={addSubject}
      />
    </Screen>
  );
}
