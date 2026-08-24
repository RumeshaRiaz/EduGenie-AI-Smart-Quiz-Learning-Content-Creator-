/**
 * Draft state for the question editor.
 *
 * Holds one editable question plus validation, and keeps the option list and
 * `correctAnswer` consistent when the question type changes — for example
 * switching to True/False replaces the options with True and False, and
 * switching to a text type clears the option list.
 */

import { useCallback, useMemo, useState } from 'react';
import {
  requiresOptions,
  type Difficulty,
  type QuestionDraft,
  type QuestionOption,
  type QuestionSource,
  type QuestionType,
} from '../../types/domain';
import { createId } from '../../utils/id';

export interface QuestionErrors {
  questionText?: string;
  correctAnswer?: string;
  options?: string;
}

export function emptyDraft(
  overrides: Partial<QuestionDraft> = {},
): QuestionDraft {
  return {
    questionText: '',
    questionType: 'multiple_choice',
    options: [
      { id: createId(), text: '' },
      { id: createId(), text: '' },
      { id: createId(), text: '' },
      { id: createId(), text: '' },
    ],
    correctAnswer: '',
    explanation: '',
    subject: 'Mathematics',
    topic: '',
    difficulty: 'easy',
    source: 'manual',
    ...overrides,
  };
}

const TRUE_FALSE_OPTIONS = ['True', 'False'];

export interface QuestionDraftController {
  draft: QuestionDraft;
  errors: QuestionErrors;
  isValid: boolean;
  setField: <K extends keyof QuestionDraft>(
    key: K,
    value: QuestionDraft[K],
  ) => void;
  setQuestionType: (type: QuestionType) => void;
  setOptionText: (id: string, text: string) => void;
  addOption: () => void;
  removeOption: (id: string) => void;
  setCorrectOption: (id: string) => void;
  replaceOptions: (texts: string[], correctText: string) => void;
  replace: (next: QuestionDraft) => void;
  /** Runs validation and reveals any errors. Returns true when valid. */
  validate: () => boolean;
}

export function useQuestionDraft(
  initial: QuestionDraft,
): QuestionDraftController {
  const [draft, setDraft] = useState<QuestionDraft>(initial);
  // Errors stay hidden until the first save attempt so the form is not hostile.
  const [showErrors, setShowErrors] = useState(false);

  const errors = useMemo<QuestionErrors>(() => {
    const next: QuestionErrors = {};

    if (!draft.questionText.trim()) {
      next.questionText = 'Enter the question.';
    }

    if (requiresOptions(draft.questionType)) {
      const filled = draft.options.filter((option) => option.text.trim());
      if (filled.length < 2) {
        next.options = 'Add at least two options.';
      } else if (
        !draft.correctAnswer ||
        !filled.some((option) => option.id === draft.correctAnswer)
      ) {
        next.correctAnswer = 'Mark which option is correct.';
      }
    } else if (!draft.correctAnswer.trim()) {
      next.correctAnswer = 'Enter the correct answer.';
    }

    return next;
  }, [draft]);

  const isValid = Object.keys(errors).length === 0;

  const setField = useCallback(
    <K extends keyof QuestionDraft>(key: K, value: QuestionDraft[K]) => {
      setDraft((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const setQuestionType = useCallback((type: QuestionType) => {
    setDraft((current) => {
      if (type === current.questionType) return current;

      if (type === 'true_false') {
        const options: QuestionOption[] = TRUE_FALSE_OPTIONS.map((text) => ({
          id: createId(),
          text,
        }));
        return {
          ...current,
          questionType: type,
          options,
          correctAnswer: options[0].id,
        };
      }

      if (!requiresOptions(type)) {
        // Preserve the answer as text so switching type is not destructive.
        const answerText =
          current.options.find((option) => option.id === current.correctAnswer)
            ?.text ?? current.correctAnswer;
        return {
          ...current,
          questionType: type,
          options: [],
          correctAnswer: answerText,
        };
      }

      // Moving into multiple choice: restore a blank option set if needed.
      const options =
        current.options.length >= 2
          ? current.options
          : emptyDraft().options;
      const correctAnswer = options.some(
        (option) => option.id === current.correctAnswer,
      )
        ? current.correctAnswer
        : '';

      return { ...current, questionType: type, options, correctAnswer };
    });
  }, []);

  const setOptionText = useCallback((id: string, text: string) => {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option) =>
        option.id === id ? { ...option, text } : option,
      ),
    }));
  }, []);

  const addOption = useCallback(() => {
    setDraft((current) =>
      current.options.length >= 8
        ? current
        : {
            ...current,
            options: [...current.options, { id: createId(), text: '' }],
          },
    );
  }, []);

  const removeOption = useCallback((id: string) => {
    setDraft((current) => ({
      ...current,
      options: current.options.filter((option) => option.id !== id),
      // Clear the answer if the option that held it was removed.
      correctAnswer:
        current.correctAnswer === id ? '' : current.correctAnswer,
    }));
  }, []);

  const setCorrectOption = useCallback((id: string) => {
    setDraft((current) => ({ ...current, correctAnswer: id }));
  }, []);

  const replaceOptions = useCallback((texts: string[], correctText: string) => {
    setDraft((current) => {
      const options = texts.map((text) => ({ id: createId(), text }));
      const correct = options.find(
        (option) =>
          option.text.trim().toLowerCase() === correctText.trim().toLowerCase(),
      );
      return {
        ...current,
        options,
        correctAnswer: correct?.id ?? '',
      };
    });
  }, []);

  const replace = useCallback((next: QuestionDraft) => setDraft(next), []);

  const validate = useCallback(() => {
    setShowErrors(true);
    return Object.keys(errors).length === 0;
  }, [errors]);

  return {
    draft,
    errors: showErrors ? errors : {},
    isValid,
    setField,
    setQuestionType,
    setOptionText,
    addOption,
    removeOption,
    setCorrectOption,
    replaceOptions,
    replace,
    validate,
  };
}

export type { Difficulty, QuestionSource };
