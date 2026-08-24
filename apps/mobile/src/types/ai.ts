/**
 * Strict schemas for everything the AI layer returns.
 *
 * AI output is never trusted: every response is parsed through these schemas
 * before it reaches the store or the UI. A malformed response becomes a typed
 * `AIError` the caller can retry, never a crash or a half-populated question.
 */

import { z } from 'zod';
import {
  DIFFICULTIES,
  QUESTION_TYPES,
  type Difficulty,
  type Question,
  type QuestionDraft,
  type QuestionType,
} from './domain';
import { createId } from '../utils/id';

/* -------------------------------------------------------------------------- */
/* Generated question schema                                                  */
/* -------------------------------------------------------------------------- */

/**
 * The wire shape the AI must produce. Deliberately flat and primitive-only:
 * options are plain strings and `correctAnswer` is the literal answer text,
 * which is far more reliable for a model to emit than internal option ids.
 * `toQuestionDraft` maps this onto the richer domain model.
 */
export const aiQuestionSchema = z
  .object({
    questionText: z.string().trim().min(1, 'Question text is empty'),
    questionType: z.enum(QUESTION_TYPES),
    options: z.array(z.string().trim().min(1)).max(8).default([]),
    correctAnswer: z.string().trim().min(1, 'Correct answer is empty'),
    explanation: z.string().trim().default(''),
    subject: z.string().trim().default('Other'),
    topic: z.string().trim().default(''),
    difficulty: z.enum(DIFFICULTIES).default('easy'),
  })
  .superRefine((value, ctx) => {
    const needsOptions =
      value.questionType === 'multiple_choice' ||
      value.questionType === 'true_false';
    if (!needsOptions) return;

    if (value.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: `${value.questionType} requires at least two options`,
      });
      return;
    }

    // The correct answer must actually be one of the offered options,
    // otherwise the question is unanswerable as generated.
    const match = value.options.some(
      (option) => normalise(option) === normalise(value.correctAnswer),
    );
    if (!match) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['correctAnswer'],
        message: 'Correct answer does not match any option',
      });
    }
  });

export type AIQuestion = z.infer<typeof aiQuestionSchema>;

/** A batch of questions, as returned by file import and bulk generation. */
export const aiQuestionListSchema = z
  .array(aiQuestionSchema)
  .min(1, 'No questions were generated');

export const aiOptionsSchema = z.object({
  options: z.array(z.string().trim().min(1)).min(2).max(8),
  correctAnswer: z.string().trim().min(1),
});
export type AIOptions = z.infer<typeof aiOptionsSchema>;

export const aiExplanationSchema = z.object({
  explanation: z.string().trim().min(1),
});

export const aiTranscriptSchema = z.object({
  text: z.string().trim().min(1),
});

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

export type AIErrorCode =
  | 'network'
  | 'timeout'
  | 'invalid_response'
  | 'rate_limited'
  | 'not_configured'
  | 'unknown';

/**
 * A single error type for the whole AI layer so screens can render a friendly
 * message without knowing which transport or provider failed.
 */
export class AIError extends Error {
  readonly code: AIErrorCode;
  /** Whether offering a "Try again" button makes sense for this failure. */
  readonly retryable: boolean;

  constructor(code: AIErrorCode, message: string, retryable = true) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.retryable = retryable;
  }

  /** Copy suitable for showing directly to a non-technical user. */
  get friendlyMessage(): string {
    switch (this.code) {
      case 'network':
        return 'No internet connection. Check your network and try again.';
      case 'timeout':
        return 'The request took too long. Please try again.';
      case 'invalid_response':
        return 'The AI returned something we could not read. Please try again.';
      case 'rate_limited':
        return 'Too many requests right now. Please wait a moment and retry.';
      case 'not_configured':
        return 'AI is not configured yet. Add a backend URL in Settings.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Mapping to the domain model                                                */
/* -------------------------------------------------------------------------- */

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Converts a validated AI question into an editable draft, assigning option ids
 * and resolving `correctAnswer` from answer text to the matching option id.
 */
export function toQuestionDraft(
  ai: AIQuestion,
  source: QuestionDraft['source'],
): QuestionDraft {
  const options = ai.options.map((text) => ({ id: createId(), text }));
  const correct = options.find(
    (option) => normalise(option.text) === normalise(ai.correctAnswer),
  );

  return {
    questionText: ai.questionText,
    questionType: ai.questionType,
    options,
    // Option-based types store the option id; open types store the raw answer.
    correctAnswer: correct ? correct.id : ai.correctAnswer,
    explanation: ai.explanation,
    subject: ai.subject || 'Other',
    topic: ai.topic,
    difficulty: ai.difficulty,
    source,
  };
}

/** Inverse of `toQuestionDraft`, used when sending a question back for editing. */
export function toAIQuestion(question: Question | QuestionDraft): AIQuestion {
  const answerText =
    question.options.find((option) => option.id === question.correctAnswer)
      ?.text ?? question.correctAnswer;

  return {
    questionText: question.questionText,
    questionType: question.questionType,
    options: question.options.map((option) => option.text),
    correctAnswer: answerText,
    explanation: question.explanation,
    subject: question.subject,
    topic: question.topic,
    difficulty: question.difficulty,
  };
}

/** Resolves the human-readable correct answer for display. */
export function correctAnswerText(
  question: Question | QuestionDraft,
): string {
  return (
    question.options.find((option) => option.id === question.correctAnswer)
      ?.text ?? question.correctAnswer
  );
}

export type { Difficulty, QuestionType };
