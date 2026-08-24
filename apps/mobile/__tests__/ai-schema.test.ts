/**
 * The strict contract for AI output: invalid data must be rejected before it
 * can reach the library, and valid data must map cleanly onto the domain model.
 */

import {
  aiQuestionSchema,
  correctAnswerText,
  toAIQuestion,
  toQuestionDraft,
} from '../src/types/ai';

const validMultipleChoice = {
  questionText: 'What is 12 + 8?',
  questionType: 'multiple_choice',
  options: ['18', '20', '22', '24'],
  correctAnswer: '20',
  explanation: '12 + 8 = 20.',
  subject: 'Mathematics',
  topic: 'Addition',
  difficulty: 'easy',
};

describe('aiQuestionSchema', () => {
  it('accepts a well-formed question', () => {
    expect(aiQuestionSchema.safeParse(validMultipleChoice).success).toBe(true);
  });

  it('rejects an answer that is not one of the options', () => {
    const result = aiQuestionSchema.safeParse({
      ...validMultipleChoice,
      correctAnswer: '99',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a choice question with fewer than two options', () => {
    const result = aiQuestionSchema.safeParse({
      ...validMultipleChoice,
      options: ['20'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an unknown question type', () => {
    const result = aiQuestionSchema.safeParse({
      ...validMultipleChoice,
      questionType: 'essay',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty question text', () => {
    const result = aiQuestionSchema.safeParse({
      ...validMultipleChoice,
      questionText: '   ',
    });
    expect(result.success).toBe(false);
  });

  it('fills in defaults for omitted optional fields', () => {
    const result = aiQuestionSchema.safeParse({
      questionText: 'Name the capital of France.',
      questionType: 'short_answer',
      correctAnswer: 'Paris',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.difficulty).toBe('easy');
      expect(result.data.subject).toBe('Other');
      expect(result.data.options).toEqual([]);
    }
  });

  it('allows an open question whose answer is not an option', () => {
    const result = aiQuestionSchema.safeParse({
      ...validMultipleChoice,
      questionType: 'short_answer',
      options: [],
      correctAnswer: 'Anything',
    });
    expect(result.success).toBe(true);
  });
});

describe('domain mapping', () => {
  it('resolves the correct answer to an option id and back', () => {
    const parsed = aiQuestionSchema.parse(validMultipleChoice);
    const draft = toQuestionDraft(parsed, 'ai');

    expect(draft.options).toHaveLength(4);
    expect(draft.options.some((o) => o.id === draft.correctAnswer)).toBe(true);
    expect(correctAnswerText(draft)).toBe('20');
    expect(toAIQuestion(draft).correctAnswer).toBe('20');
    expect(toAIQuestion(draft).options).toEqual(validMultipleChoice.options);
  });

  it('matches the answer to an option regardless of case', () => {
    const parsed = aiQuestionSchema.parse({
      ...validMultipleChoice,
      questionType: 'true_false',
      options: ['True', 'False'],
      correctAnswer: 'true',
    });
    expect(correctAnswerText(toQuestionDraft(parsed, 'ai'))).toBe('True');
  });

  it('keeps the literal answer for open question types', () => {
    const parsed = aiQuestionSchema.parse({
      questionText: 'Name the capital of France.',
      questionType: 'short_answer',
      correctAnswer: 'Paris',
    });
    const draft = toQuestionDraft(parsed, 'voice');

    expect(draft.correctAnswer).toBe('Paris');
    expect(draft.source).toBe('voice');
  });
});
