/**
 * Store behaviour: CRUD, ordering, and the referential integrity between
 * questions and the quizzes that use them.
 */

import { useLibraryStore } from '../src/store/useLibraryStore';
import { emptyDraft } from '../src/features/question/useQuestionDraft';
import { DEFAULT_PREFERENCES, DEFAULT_SUBJECTS } from '../src/types/domain';

const store = () => useLibraryStore.getState();

beforeEach(() => {
  useLibraryStore.setState({
    questions: [],
    quizzes: [],
    subjects: [...DEFAULT_SUBJECTS],
    preferences: DEFAULT_PREFERENCES,
  });
});

describe('questions', () => {
  it('adds questions newest first with unique ids', () => {
    const first = store().addQuestion(emptyDraft({ questionText: 'One' }));
    const second = store().addQuestion(emptyDraft({ questionText: 'Two' }));

    expect(store().questions).toHaveLength(2);
    expect(store().questions[0].id).toBe(second.id);
    expect(first.id).not.toBe(second.id);
    expect(first.createdAt).toBe(first.updatedAt);
  });

  it('adds a batch of imported questions', () => {
    const created = store().addQuestions([
      emptyDraft({ questionText: 'A' }),
      emptyDraft({ questionText: 'B' }),
    ]);
    expect(created).toHaveLength(2);
    expect(store().questions).toHaveLength(2);
  });

  it('updates a question and stamps updatedAt', () => {
    const question = store().addQuestion(emptyDraft({ questionText: 'Before' }));
    store().updateQuestion(question.id, { questionText: 'After' });

    const updated = store().getQuestion(question.id);
    expect(updated?.questionText).toBe('After');
    expect(updated!.updatedAt >= updated!.createdAt).toBe(true);
  });

  it('duplicates a question under a new id', () => {
    const question = store().addQuestion(emptyDraft({ questionText: 'Original' }));
    const copy = store().duplicateQuestion(question.id);

    expect(copy).toBeDefined();
    expect(copy!.id).not.toBe(question.id);
    expect(copy!.questionText).toContain('(copy)');
    expect(store().questions).toHaveLength(2);
  });

  it('returns undefined when duplicating a missing question', () => {
    expect(store().duplicateQuestion('nope')).toBeUndefined();
  });
});

describe('quizzes', () => {
  it('removes a deleted question from every quiz that used it', () => {
    const q1 = store().addQuestion(emptyDraft({ questionText: 'One' }));
    const q2 = store().addQuestion(emptyDraft({ questionText: 'Two' }));
    const quiz = store().addQuiz({
      title: 'Quiz',
      description: '',
      subject: 'Mathematics',
      topic: '',
      difficulty: 'easy',
      questionIds: [q1.id, q2.id],
    });

    store().deleteQuestion(q1.id);

    expect(store().getQuestion(q1.id)).toBeUndefined();
    expect(store().getQuiz(quiz.id)!.questionIds).toEqual([q2.id]);
  });

  it('keeps questions when a quiz is deleted', () => {
    const question = store().addQuestion(emptyDraft({ questionText: 'One' }));
    const quiz = store().addQuiz({
      title: 'Quiz',
      description: '',
      subject: 'Mathematics',
      topic: '',
      difficulty: 'easy',
      questionIds: [question.id],
    });

    store().deleteQuiz(quiz.id);

    expect(store().quizzes).toHaveLength(0);
    expect(store().getQuestion(question.id)).toBeDefined();
  });
});

describe('subjects and preferences', () => {
  it('ignores duplicate and blank subjects', () => {
    store().addSubject('Robotics');
    store().addSubject('robotics');
    store().addSubject('   ');

    const matches = store().subjects.filter(
      (subject) => subject.toLowerCase() === 'robotics',
    );
    expect(matches).toHaveLength(1);
    expect(store().subjects).not.toContain('   ');
  });

  it('merges preference updates', () => {
    store().setPreferences({ defaultDifficulty: 'hard' });

    expect(store().preferences.defaultDifficulty).toBe('hard');
    expect(store().preferences.voiceLocale).toBe(
      DEFAULT_PREFERENCES.voiceLocale,
    );
  });
});
