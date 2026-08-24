/**
 * The offline formatter used when no backend is configured.
 *
 * It is rule-based, not a language model, but its output still has to satisfy
 * the same schema as real AI output — and it must never state a wrong answer.
 */

import { aiQuestionSchema } from '../src/types/ai';
import {
  buildOptions,
  mockQuestionFromText,
  mockQuestionsFromDocument,
  splitIntoChunks,
} from '../src/services/ai/mockProvider';

describe('arithmetic', () => {
  it.each([
    ['What is 12 + 8?', '20', 'Addition'],
    ['What is 10 × 4?', '40', 'Multiplication'],
    ['what is 8 times 7', '56', 'Multiplication'],
    ['What is 100 divided by 4?', '25', 'Division'],
    [
      'Ali has 5 apples and gives 2 apples to Sara. How many apples does Ali have left?',
      '3',
      'Subtraction',
    ],
  ])('solves %s', (input, answer, topic) => {
    const question = mockQuestionFromText(input);
    expect(question.correctAnswer).toBe(answer);
    expect(question.topic).toBe(topic);
    expect(question.subject).toBe('Mathematics');
  });

  it('ignores an age when finding the operands', () => {
    // "7 year old" must not be read as part of the sum.
    const question = mockQuestionFromText(
      'Create a math question for a 7 year old. If Ahmed has 8 candies and gives 3 to his brother, how many candies are left?',
    );
    expect(question.correctAnswer).toBe('5');
    expect(question.questionText).not.toMatch(/^Create a math question/);
  });

  it('ignores a grade reference when finding the operands', () => {
    const question = mockQuestionFromText(
      'Make a question about 250 x 4 for grade 6',
    );
    expect(question.correctAnswer).toBe('1000');
  });

  it.each([
    ['5 + ____ = 9', '4'],
    ['____ + 3 = 10', '7'],
    ['12 - ____ = 7', '5'],
    ['____ - 2 = 6', '8'],
    ['3 x ____ = 12', '4'],
    ['____ x 4 = 20', '5'],
    ['20 ÷ ____ = 5', '4'],
  ])('solves the blank in %s', (input, answer) => {
    const question = mockQuestionFromText(input);
    expect(question.correctAnswer).toBe(answer);
  });

  it('states the full equation in the explanation', () => {
    expect(mockQuestionFromText('5 + ____ = 9').explanation).toBe('5 + 4 = 9.');
    expect(mockQuestionFromText('What is 12 + 8?').explanation).toBe(
      '12 + 8 = 20.',
    );
  });

  it('refuses to answer a division by zero', () => {
    // Better to leave it open than to state a wrong answer.
    const question = mockQuestionFromText('What is 7 ÷ 0?');
    expect(question.questionType).toBe('short_answer');
    expect(question.correctAnswer).not.toBe('0');
  });
});

describe('classification', () => {
  it('detects an explicit true/false request', () => {
    const question = mockQuestionFromText('true or false: the sun is a star');
    expect(question.questionType).toBe('true_false');
    expect(question.options).toEqual(['True', 'False']);
  });

  it('raises difficulty for large operands', () => {
    expect(mockQuestionFromText('What is 3 + 4?').difficulty).toBe('easy');
    expect(mockQuestionFromText('What is 45 + 30?').difficulty).toBe('medium');
    expect(mockQuestionFromText('What is 4500 + 3000?').difficulty).toBe('hard');
  });

  it('classifies non-mathematical content by subject', () => {
    expect(mockQuestionFromText('Name a plant that grows in water').subject).toBe(
      'Science',
    );
  });
});

describe('schema conformance', () => {
  it.each([
    'What is 12 + 8?',
    'true or false: the sun is a star',
    'The water cycle has evaporation and condensation',
    'What is 7 ÷ 0?',
    'hello',
    '5',
    'اردو کا سوال',
    '5 + ____ = 9',
  ])('produces valid output for %s', (input) => {
    const result = aiQuestionSchema.safeParse(mockQuestionFromText(input));
    expect(result.success).toBe(true);
  });

  it('never emits a choice question without options', () => {
    const question = mockQuestionFromText('Some prose with no answer in it');
    if (
      question.questionType === 'multiple_choice' ||
      question.questionType === 'true_false'
    ) {
      expect(question.options.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('options', () => {
  it.each(['0', '1', '20', '-5', '2.5', 'Paris'])(
    'builds unique options containing the answer %s',
    (answer) => {
      const options = buildOptions(answer);
      expect(options).toContain(answer);
      expect(new Set(options).size).toBe(options.length);
      expect(options.length).toBeGreaterThanOrEqual(2);
    },
  );
});

describe('document splitting', () => {
  it('splits on numbered question markers', () => {
    const chunks = splitIntoChunks(
      'Question 1:\nWhat is 5 + 7?\n\nQuestion 2:\nWhat is 10 x 4?',
    );
    expect(chunks).toHaveLength(2);
  });

  it('produces one valid question per chunk', () => {
    const questions = mockQuestionsFromDocument(
      'Question 1:\nWhat is 5 + 7?\n\nQuestion 2:\nWhat is 10 x 4?',
    );
    expect(questions).toHaveLength(2);
    expect(questions[0].correctAnswer).toBe('12');
    expect(questions[1].correctAnswer).toBe('40');
    for (const question of questions) {
      expect(aiQuestionSchema.safeParse(question).success).toBe(true);
    }
  });

  it('honours the limit', () => {
    const many = Array.from({ length: 30 }, (_, i) => `What is ${i} + 1?`).join(
      '\n',
    );
    expect(mockQuestionsFromDocument(many, 5)).toHaveLength(5);
  });

  it('returns nothing for empty content', () => {
    expect(splitIntoChunks('   ')).toEqual([]);
  });
});
