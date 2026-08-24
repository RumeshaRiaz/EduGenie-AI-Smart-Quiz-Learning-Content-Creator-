/**
 * Library store: questions, quizzes, subjects and preferences.
 *
 * State is persisted to AsyncStorage. All mutations go through the actions
 * below rather than touching arrays directly, so swapping the persistence layer
 * for a remote database later means replacing the `persist` storage adapter and
 * making these actions async — no screen needs to change.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  DEFAULT_PREFERENCES,
  DEFAULT_SUBJECTS,
  SCHEMA_VERSION,
  type Preferences,
  type Question,
  type QuestionDraft,
  type Quiz,
  type QuizDraft,
} from '../types/domain';
import { createId } from '../utils/id';

export interface LibraryState {
  questions: Question[];
  quizzes: Quiz[];
  /** Subject names, seeded with the defaults and extendable by the user. */
  subjects: string[];
  preferences: Preferences;
  /** False until the persisted state has been read back from disk. */
  hydrated: boolean;

  addQuestion: (draft: QuestionDraft) => Question;
  addQuestions: (drafts: QuestionDraft[]) => Question[];
  updateQuestion: (id: string, patch: Partial<QuestionDraft>) => void;
  deleteQuestion: (id: string) => void;
  duplicateQuestion: (id: string) => Question | undefined;
  getQuestion: (id: string) => Question | undefined;

  addQuiz: (draft: QuizDraft) => Quiz;
  updateQuiz: (id: string, patch: Partial<QuizDraft>) => void;
  deleteQuiz: (id: string) => void;
  getQuiz: (id: string) => Quiz | undefined;

  addSubject: (name: string) => void;
  setPreferences: (patch: Partial<Preferences>) => void;
}

function stamp(): string {
  return new Date().toISOString();
}

function materialise(draft: QuestionDraft): Question {
  const now = stamp();
  return {
    ...draft,
    id: createId('q_'),
    schemaVersion: SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
  };
}

export const useLibraryStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      questions: [],
      quizzes: [],
      subjects: [...DEFAULT_SUBJECTS],
      preferences: DEFAULT_PREFERENCES,
      hydrated: false,

      addQuestion: (draft) => {
        const question = materialise(draft);
        // Newest first: the library and the home screen both read this order.
        set((state) => ({ questions: [question, ...state.questions] }));
        return question;
      },

      addQuestions: (drafts) => {
        const created = drafts.map(materialise);
        set((state) => ({ questions: [...created, ...state.questions] }));
        return created;
      },

      updateQuestion: (id, patch) =>
        set((state) => ({
          questions: state.questions.map((question) =>
            question.id === id
              ? { ...question, ...patch, updatedAt: stamp() }
              : question,
          ),
        })),

      deleteQuestion: (id) =>
        set((state) => ({
          questions: state.questions.filter((question) => question.id !== id),
          // Drop the question from any quiz that referenced it, so quizzes
          // never point at a missing question.
          quizzes: state.quizzes.map((quiz) =>
            quiz.questionIds.includes(id)
              ? {
                  ...quiz,
                  questionIds: quiz.questionIds.filter((qid) => qid !== id),
                  updatedAt: stamp(),
                }
              : quiz,
          ),
        })),

      duplicateQuestion: (id) => {
        const original = get().questions.find((question) => question.id === id);
        if (!original) return undefined;

        const copy = materialise({
          ...original,
          questionText: `${original.questionText} (copy)`,
        });
        set((state) => ({ questions: [copy, ...state.questions] }));
        return copy;
      },

      getQuestion: (id) =>
        get().questions.find((question) => question.id === id),

      addQuiz: (draft) => {
        const now = stamp();
        const quiz: Quiz = {
          ...draft,
          id: createId('z_'),
          schemaVersion: SCHEMA_VERSION,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ quizzes: [quiz, ...state.quizzes] }));
        return quiz;
      },

      updateQuiz: (id, patch) =>
        set((state) => ({
          quizzes: state.quizzes.map((quiz) =>
            quiz.id === id ? { ...quiz, ...patch, updatedAt: stamp() } : quiz,
          ),
        })),

      deleteQuiz: (id) =>
        set((state) => ({
          quizzes: state.quizzes.filter((quiz) => quiz.id !== id),
        })),

      getQuiz: (id) => get().quizzes.find((quiz) => quiz.id === id),

      addSubject: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        set((state) =>
          state.subjects.some(
            (subject) => subject.toLowerCase() === trimmed.toLowerCase(),
          )
            ? state
            : { subjects: [...state.subjects, trimmed] },
        );
      },

      setPreferences: (patch) =>
        set((state) => ({ preferences: { ...state.preferences, ...patch } })),
    }),
    {
      name: 'edugenie-library-v1',
      storage: createJSONStorage(() => AsyncStorage),
      // `hydrated` is derived at runtime, never written to disk.
      partialize: ({ questions, quizzes, subjects, preferences }) => ({
        questions,
        quizzes,
        subjects,
        preferences,
      }),
      onRehydrateStorage: () => (state) => {
        useLibraryStore.setState({ hydrated: true });
        void state;
      },
    },
  ),
);
