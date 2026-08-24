/**
 * AI service layer.
 *
 * Screens call these functions and never talk to a provider directly. Each one
 * routes to the backend when configured and to the offline mock otherwise, and
 * validates the result against a Zod schema before returning it.
 */

import {
  AIError,
  aiExplanationSchema,
  aiOptionsSchema,
  aiQuestionListSchema,
  aiQuestionSchema,
  type AIOptions,
  type AIQuestion,
} from '../../types/ai';
import type { Difficulty, QuestionType } from '../../types/domain';
import { postJSON } from './client';
import { getAIMode } from './config';
import {
  buildOptions,
  mockDelay,
  mockQuestionFromText,
  mockQuestionsFromDocument,
} from './mockProvider';

export { getAIMode, getBackendUrl, setBackendUrlOverride } from './config';
export type { AIMode } from './config';

export interface GenerateOptions {
  /** Desired question type; the AI may keep it or pick a better fit. */
  questionType?: QuestionType;
  subject?: string;
  difficulty?: Difficulty;
}

/**
 * Validates locally-produced mock data through the same schema the backend
 * responses use, so a bug in the mock surfaces as a normal AI error instead of
 * corrupting the library.
 */
function validateMock<T>(
  value: unknown,
  schema: { safeParse: (input: unknown) => { success: boolean; data?: T } },
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success || parsed.data === undefined) {
    throw new AIError('invalid_response', 'Could not build a valid question');
  }
  return parsed.data;
}

/* -------------------------------------------------------------------------- */
/* ai/generateQuestion                                                        */
/* -------------------------------------------------------------------------- */

/** Turns a free-form instruction or passage into one structured question. */
export async function generateQuestion(
  prompt: string,
  options: GenerateOptions = {},
): Promise<AIQuestion> {
  if (!prompt.trim()) {
    throw new AIError('invalid_response', 'Nothing to generate from', false);
  }

  if (getAIMode() === 'mock') {
    await mockDelay();
    const question = mockQuestionFromText(prompt);
    return validateMock(
      { ...question, ...applyPreferences(question, options) },
      aiQuestionSchema,
    );
  }

  return postJSON(
    '/api/ai/generate-question',
    { prompt, ...options },
    aiQuestionSchema,
  );
}

/** Applies the caller's requested subject/difficulty over the AI's guess. */
function applyPreferences(
  question: AIQuestion,
  options: GenerateOptions,
): Partial<AIQuestion> {
  return {
    subject: options.subject ?? question.subject,
    difficulty: options.difficulty ?? question.difficulty,
  };
}

/* -------------------------------------------------------------------------- */
/* ai/parseEducationalContent                                                 */
/* -------------------------------------------------------------------------- */

/** Converts a document's raw text into a batch of structured questions. */
export async function parseEducationalContent(
  content: string,
  limit = 10,
): Promise<AIQuestion[]> {
  if (!content.trim()) {
    throw new AIError('invalid_response', 'The document was empty', false);
  }

  if (getAIMode() === 'mock') {
    await mockDelay();
    const questions = mockQuestionsFromDocument(content, limit);
    if (questions.length === 0) {
      throw new AIError(
        'invalid_response',
        'No questions could be found in this content',
      );
    }
    return validateMock(questions, aiQuestionListSchema);
  }

  return postJSON(
    '/api/ai/parse-content',
    { content, limit },
    aiQuestionListSchema,
  );
}

/* -------------------------------------------------------------------------- */
/* ai/improveQuestion                                                         */
/* -------------------------------------------------------------------------- */

/** Rewrites a rough question into clean, well-formed wording. */
export async function improveQuestion(
  question: AIQuestion,
): Promise<AIQuestion> {
  if (getAIMode() === 'mock') {
    await mockDelay();
    // The mock re-derives structure from the question text, which is exactly
    // the "clean this up" behaviour the real prompt asks for.
    const improved = mockQuestionFromText(question.questionText);
    return validateMock(
      {
        ...improved,
        subject: question.subject || improved.subject,
        // Keep any answer the user already entered rather than overwriting it.
        correctAnswer:
          question.correctAnswer && question.correctAnswer !== 'Answer'
            ? question.correctAnswer
            : improved.correctAnswer,
        options:
          question.options.length >= 2 ? question.options : improved.options,
      },
      aiQuestionSchema,
    );
  }

  return postJSON('/api/ai/improve-question', { question }, aiQuestionSchema);
}

/* -------------------------------------------------------------------------- */
/* ai/generateOptions                                                         */
/* -------------------------------------------------------------------------- */

/** Produces multiple-choice options and identifies the correct one. */
export async function generateOptions(
  questionText: string,
  knownAnswer: string,
): Promise<AIOptions> {
  if (!knownAnswer.trim()) {
    throw new AIError(
      'invalid_response',
      'Enter the correct answer first so options can be built around it',
      false,
    );
  }

  if (getAIMode() === 'mock') {
    await mockDelay();
    return validateMock(
      { options: buildOptions(knownAnswer.trim()), correctAnswer: knownAnswer.trim() },
      aiOptionsSchema,
    );
  }

  return postJSON(
    '/api/ai/generate-options',
    { questionText, correctAnswer: knownAnswer },
    aiOptionsSchema,
  );
}

/* -------------------------------------------------------------------------- */
/* ai/generateExplanation                                                     */
/* -------------------------------------------------------------------------- */

/** Writes a child-friendly explanation of why the answer is correct. */
export async function generateExplanation(
  questionText: string,
  correctAnswer: string,
): Promise<string> {
  if (!questionText.trim() || !correctAnswer.trim()) {
    throw new AIError(
      'invalid_response',
      'A question and its answer are needed to write an explanation',
      false,
    );
  }

  if (getAIMode() === 'mock') {
    await mockDelay();
    const derived = mockQuestionFromText(questionText);
    const explanation =
      derived.explanation || `The correct answer is ${correctAnswer}.`;
    return validateMock({ explanation }, aiExplanationSchema).explanation;
  }

  const result = await postJSON(
    '/api/ai/generate-explanation',
    { questionText, correctAnswer },
    aiExplanationSchema,
  );
  return result.explanation;
}

/* -------------------------------------------------------------------------- */
/* ai/processVoiceQuestion                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Interprets a spoken instruction and returns the question the user described.
 * Distinct from `generateQuestion` because the backend prompt for this endpoint
 * focuses on intent extraction ("make a question for a 7 year old about…").
 */
export async function processVoiceQuestion(
  transcript: string,
  options: GenerateOptions = {},
): Promise<AIQuestion> {
  if (!transcript.trim()) {
    throw new AIError('invalid_response', 'Nothing was recognised', false);
  }

  if (getAIMode() === 'mock') {
    await mockDelay();
    const question = mockQuestionFromText(transcript);
    return validateMock(
      { ...question, ...applyPreferences(question, options) },
      aiQuestionSchema,
    );
  }

  return postJSON(
    '/api/ai/process-voice',
    { transcript, ...options },
    aiQuestionSchema,
  );
}
