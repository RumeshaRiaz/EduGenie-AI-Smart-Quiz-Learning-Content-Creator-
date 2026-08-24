/**
 * Render tests for the shared UI and question components.
 *
 * These catch runtime failures that type-checking cannot: invalid styles,
 * hook misuse, and crashes on edge-case data.
 *
 * Note: React Native Testing Library v14 renders asynchronously, so every
 * `render` call must be awaited.
 */

import { render, screen, fireEvent } from '@testing-library/react-native';
import { QuestionCard } from '../src/ui/QuestionCard';
import { QuizCard } from '../src/ui/QuizCard';
import { Button } from '../src/ui/Button';
import { Input } from '../src/ui/Input';
import {
  EmptyState,
  ErrorBanner,
  ErrorState,
  LoadingState,
} from '../src/ui/States';
import { QuestionPreview } from '../src/features/question/QuestionPreview';
import type { Question, Quiz } from '../src/types/domain';

const question: Question = {
  id: 'q1',
  schemaVersion: 1,
  questionText: 'What is 12 + 8?',
  questionType: 'multiple_choice',
  options: [
    { id: 'o1', text: '18' },
    { id: 'o2', text: '20' },
    { id: 'o3', text: '22' },
    { id: 'o4', text: '24' },
  ],
  correctAnswer: 'o2',
  explanation: '12 + 8 = 20.',
  subject: 'Mathematics',
  topic: 'Addition',
  difficulty: 'easy',
  source: 'ai',
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

const openQuestion: Question = {
  ...question,
  id: 'q2',
  questionType: 'short_answer',
  options: [],
  correctAnswer: 'Paris',
  questionText: 'Name the capital of France.',
  difficulty: 'hard',
  source: 'manual',
};

const quiz: Quiz = {
  id: 'z1',
  schemaVersion: 1,
  title: 'Week 3 — Addition',
  description: 'Practice set',
  subject: 'Mathematics',
  topic: 'Addition',
  difficulty: 'medium',
  questionIds: ['q1'],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

describe('QuestionCard', () => {
  it('shows the question and its metadata', async () => {
    await render(<QuestionCard question={question} />);
    expect(screen.getByText(/What is 12 \+ 8\?/)).toBeTruthy();
    expect(screen.getByText('Mathematics')).toBeTruthy();
    expect(screen.getByText('Addition')).toBeTruthy();
    expect(screen.getByText('Multiple Choice')).toBeTruthy();
    expect(screen.getByText('Easy')).toBeTruthy();
  });

  it('fires onPress when tapped', async () => {
    const onPress = jest.fn();
    await render(<QuestionCard question={question} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText('What is 12 + 8?'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('exposes checkbox state when selectable', async () => {
    await render(<QuestionCard question={question} selectable selected />);
    expect(screen.getByRole('checkbox', { checked: true })).toBeTruthy();
  });

  it('renders a question with no options', async () => {
    await render(<QuestionCard question={openQuestion} />);
    expect(screen.getByText(/capital of France/)).toBeTruthy();
    expect(screen.getByText('Hard')).toBeTruthy();
  });
});

describe('QuestionPreview', () => {
  it('marks the correct option', async () => {
    await render(<QuestionPreview question={question} index={1} />);
    expect(screen.getByText('1. What is 12 + 8?')).toBeTruthy();
    expect(screen.getByText('20')).toBeTruthy();
    expect(screen.getByText('12 + 8 = 20.')).toBeTruthy();
  });

  it('shows a literal answer for open question types', async () => {
    await render(<QuestionPreview question={openQuestion} />);
    expect(screen.getByText('CORRECT ANSWER')).toBeTruthy();
    expect(screen.getByText('Paris')).toBeTruthy();
  });
});

describe('QuizCard', () => {
  it('pluralises the question count', async () => {
    await render(<QuizCard quiz={quiz} />);
    expect(screen.getByText('Week 3 — Addition')).toBeTruthy();
    expect(screen.getByText('1 question')).toBeTruthy();

    await render(<QuizCard quiz={{ ...quiz, questionIds: ['q1', 'q2'] }} />);
    expect(screen.getByText('2 questions')).toBeTruthy();
  });
});

describe('Button', () => {
  it('calls onPress when enabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while loading', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} loading />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not fire when disabled', async () => {
    const onPress = jest.fn();
    await render(<Button label="Save" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('Input', () => {
  it('reports typing and shows errors', async () => {
    const onChangeText = jest.fn();
    await render(
      <Input
        label="Question"
        value=""
        onChangeText={onChangeText}
        error="Enter the question."
      />,
    );
    fireEvent.changeText(screen.getByLabelText('Question'), 'Hello');
    expect(onChangeText).toHaveBeenCalledWith('Hello');
    expect(screen.getByText('Enter the question.')).toBeTruthy();
  });
});

describe('state components', () => {
  it('renders the empty state and triggers its action', async () => {
    const onAction = jest.fn();
    await render(
      <EmptyState title="No questions" actionLabel="Add" onAction={onAction} />,
    );
    fireEvent.press(screen.getByRole('button', { name: 'Add' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('renders loading and error states', async () => {
    await render(<LoadingState message="Working…" />);
    expect(screen.getByText('Working…')).toBeTruthy();

    const onRetry = jest.fn();
    await render(<ErrorState message="It broke" onRetry={onRetry} />);
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();

    await render(<ErrorBanner message="Network down" />);
    expect(screen.getByText('Network down')).toBeTruthy();
  });
});
