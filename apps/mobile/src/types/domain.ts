/**
 * Core domain model for EduGenie AI.
 *
 * These types are the contract shared by the UI, the storage layer and the AI
 * service layer. Persisted shapes are versioned via `SCHEMA_VERSION` so that a
 * future migration can upgrade documents written by an older build.
 */

export const SCHEMA_VERSION = 1;

/* -------------------------------------------------------------------------- */
/* Question types                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Supported question types. Adding a new type here surfaces it across the whole
 * app: the editor, the library filters and the AI schema all derive from this
 * single list, so no other file needs a matching switch statement.
 */
export const QUESTION_TYPES = [
  'multiple_choice',
  'true_false',
  'short_answer',
  'fill_in_blank',
  'math',
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  true_false: 'True / False',
  short_answer: 'Short Answer',
  fill_in_blank: 'Fill in the Blank',
  math: 'Math Question',
};

/** Question types that require a list of selectable options. */
export const OPTION_BASED_TYPES: readonly QuestionType[] = [
  'multiple_choice',
  'true_false',
];

export function requiresOptions(type: QuestionType): boolean {
  return OPTION_BASED_TYPES.includes(type);
}

/* -------------------------------------------------------------------------- */
/* Difficulty                                                                 */
/* -------------------------------------------------------------------------- */

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

/* -------------------------------------------------------------------------- */
/* Subjects and topics                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Subjects are stored as free-form strings rather than an enum so that users can
 * add their own. `DEFAULT_SUBJECTS` seeds the picker on first launch.
 */
export const DEFAULT_SUBJECTS = [
  'Mathematics',
  'Science',
  'English',
  'General Knowledge',
  'Urdu',
  'Other',
] as const;

export interface Subject {
  id: string;
  name: string;
  /** Seeded subjects cannot be deleted, only hidden. */
  isCustom: boolean;
}

export interface Topic {
  id: string;
  subjectId: string;
  name: string;
}

/* -------------------------------------------------------------------------- */
/* Question                                                                   */
/* -------------------------------------------------------------------------- */

/** How a question entered the library. Used for provenance in the UI. */
export type QuestionSource = 'manual' | 'ai' | 'import' | 'voice';

export interface QuestionOption {
  /** Stable id so options can be reordered without losing the correct answer. */
  id: string;
  text: string;
}

export interface Question {
  id: string;
  schemaVersion: number;

  questionText: string;
  questionType: QuestionType;

  /** Empty for types that do not use options. */
  options: QuestionOption[];
  /**
   * For option-based types this holds the id of the correct `QuestionOption`.
   * For open types it holds the literal expected answer text.
   */
  correctAnswer: string;

  explanation: string;
  subject: string;
  topic: string;
  difficulty: Difficulty;

  source: QuestionSource;
  createdAt: string;
  updatedAt: string;
}

/** Fields the editor manages; ids and timestamps are assigned by the store. */
export type QuestionDraft = Omit<
  Question,
  'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'
>;

/* -------------------------------------------------------------------------- */
/* Quiz                                                                       */
/* -------------------------------------------------------------------------- */

export interface Quiz {
  id: string;
  schemaVersion: number;
  title: string;
  description: string;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  /** Ordered references into the question library. */
  questionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export type QuizDraft = Omit<
  Quiz,
  'id' | 'schemaVersion' | 'createdAt' | 'updatedAt'
>;

/* -------------------------------------------------------------------------- */
/* Import + voice                                                             */
/* -------------------------------------------------------------------------- */

export type ImportedFileKind = 'txt' | 'pdf' | 'docx' | 'csv' | 'xlsx';

export interface ImportedDocument {
  id: string;
  name: string;
  kind: ImportedFileKind;
  /** Bytes, when the picker reports it. */
  size?: number;
  /** Plain text extracted from the document, ready to send to the AI layer. */
  extractedText: string;
  importedAt: string;
}

export interface VoiceTranscript {
  id: string;
  /** Text as recognised, before any user edit. */
  text: string;
  /** Recording length in milliseconds. */
  durationMs: number;
  locale: string;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* User + preferences                                                         */
/* -------------------------------------------------------------------------- */

export interface User {
  id: string;
  displayName: string;
  role: 'teacher' | 'parent' | 'tutor' | 'other';
}

export interface Preferences {
  defaultSubject: string;
  defaultDifficulty: Difficulty;
  defaultQuestionType: QuestionType;
  /** BCP-47 tag used by the speech recogniser. */
  voiceLocale: string;
}

export const DEFAULT_PREFERENCES: Preferences = {
  defaultSubject: 'Mathematics',
  defaultDifficulty: 'easy',
  defaultQuestionType: 'multiple_choice',
  voiceLocale: 'en-US',
};
