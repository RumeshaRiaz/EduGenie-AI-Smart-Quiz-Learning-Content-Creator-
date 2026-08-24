/**
 * Shared schemas for the EduGenie API.
 *
 * These mirror the schemas in the mobile app (`src/types/ai.ts`). The server
 * validates the model's output against them before responding, so the app never
 * receives a malformed question even if the model drifts from the format.
 */

import { z } from 'zod';

export const QUESTION_TYPES = [
  'multiple_choice',
  'true_false',
  'short_answer',
  'fill_in_blank',
  'math',
] as const;

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;

export const aiQuestionSchema = z.object({
  questionText: z.string().trim().min(1),
  questionType: z.enum(QUESTION_TYPES),
  options: z.array(z.string().trim().min(1)).max(8).default([]),
  correctAnswer: z.string().trim().min(1),
  explanation: z.string().trim().default(''),
  subject: z.string().trim().default('Other'),
  topic: z.string().trim().default(''),
  difficulty: z.enum(DIFFICULTIES).default('easy'),
});

export type AIQuestion = z.infer<typeof aiQuestionSchema>;

/**
 * JSON Schema handed to the model via `output_config.format`, which constrains
 * generation so the response is valid JSON of exactly this shape.
 */
export const questionJsonSchema = {
  type: 'object',
  properties: {
    questionText: { type: 'string', description: 'The question, clearly worded.' },
    questionType: { type: 'string', enum: [...QUESTION_TYPES] },
    options: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Answer choices. Required for multiple_choice and true_false, empty otherwise.',
    },
    correctAnswer: {
      type: 'string',
      description:
        'The correct answer. For option-based types this must exactly match one of the options.',
    },
    explanation: {
      type: 'string',
      description: 'A short, child-friendly explanation of why the answer is correct.',
    },
    subject: { type: 'string' },
    topic: { type: 'string' },
    difficulty: { type: 'string', enum: [...DIFFICULTIES] },
  },
  required: [
    'questionText',
    'questionType',
    'options',
    'correctAnswer',
    'explanation',
    'subject',
    'topic',
    'difficulty',
  ],
  additionalProperties: false,
} as const;

export const questionListJsonSchema = {
  type: 'object',
  properties: {
    questions: { type: 'array', items: questionJsonSchema },
  },
  required: ['questions'],
  additionalProperties: false,
} as const;

export const optionsJsonSchema = {
  type: 'object',
  properties: {
    options: { type: 'array', items: { type: 'string' } },
    correctAnswer: { type: 'string' },
  },
  required: ['options', 'correctAnswer'],
  additionalProperties: false,
} as const;

export const explanationJsonSchema = {
  type: 'object',
  properties: { explanation: { type: 'string' } },
  required: ['explanation'],
  additionalProperties: false,
} as const;

/* -------------------------------------------------------------------------- */
/* Request bodies                                                             */
/* -------------------------------------------------------------------------- */

const generateOptionsShape = {
  questionType: z.enum(QUESTION_TYPES).optional(),
  subject: z.string().trim().max(80).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
};

export const generateQuestionBody = z.object({
  prompt: z.string().trim().min(1).max(4000),
  ...generateOptionsShape,
});

export const processVoiceBody = z.object({
  transcript: z.string().trim().min(1).max(4000),
  ...generateOptionsShape,
});

export const parseContentBody = z.object({
  content: z.string().trim().min(1).max(60_000),
  limit: z.number().int().min(1).max(20).default(10),
});

export const improveQuestionBody = z.object({
  question: aiQuestionSchema,
});

export const generateOptionsBody = z.object({
  questionText: z.string().trim().min(1).max(2000),
  correctAnswer: z.string().trim().min(1).max(500),
});

export const generateExplanationBody = z.object({
  questionText: z.string().trim().min(1).max(2000),
  correctAnswer: z.string().trim().min(1).max(500),
});
