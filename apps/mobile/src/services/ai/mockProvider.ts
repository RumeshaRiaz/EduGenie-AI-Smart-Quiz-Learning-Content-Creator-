/**
 * Offline stand-in for the AI backend.
 *
 * This is NOT artificial intelligence. It is a deterministic, rule-based parser
 * used only when no backend URL is configured, so that the import, voice and
 * generation flows can be exercised end to end during development. Every screen
 * that can reach it renders an "Offline sample mode" notice, and `getAIMode()`
 * reports `mock`, so its output is never presented to a user as real AI.
 *
 * Replace nothing here to go live: set EXPO_PUBLIC_API_URL (or the Settings
 * override) and the real backend takes over automatically.
 */

import type { AIQuestion } from '../../types/ai';
import type { Difficulty, QuestionType } from '../../types/domain';

/** Simulated latency so loading states are visible while developing. */
const MOCK_DELAY_MS = 700;

export function mockDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
}

/* -------------------------------------------------------------------------- */
/* Arithmetic understanding                                                   */
/* -------------------------------------------------------------------------- */

interface Arithmetic {
  a: number;
  b: number;
  operator: '+' | '-' | '×' | '÷';
  /** The value the question asks for. */
  result: number;
  /**
   * Value on the right of the equals sign, when it differs from `result`.
   * For "5 + __ = 9" the result is 4 (the blank) but the total is 9, and the
   * explanation must read "5 + 4 = 9".
   */
  total?: number;
  topic: string;
}

const OPERATOR_WORDS: Array<{ pattern: RegExp; operator: Arithmetic['operator'] }> = [
  { pattern: /\b(?:plus|add(?:ed)?(?:\s+to)?|sum\s+of)\b/i, operator: '+' },
  { pattern: /\b(?:minus|subtract(?:ed)?|less|take\s+away)\b/i, operator: '-' },
  { pattern: /\b(?:times|multiplied\s+by|product\s+of)\b/i, operator: '×' },
  { pattern: /\b(?:divided\s+by|over)\b/i, operator: '÷' },
];

const TOPIC_BY_OPERATOR: Record<Arithmetic['operator'], string> = {
  '+': 'Addition',
  '-': 'Subtraction',
  '×': 'Multiplication',
  '÷': 'Division',
};

/** Returns null when the expression has no well-defined answer. */
function compute(
  a: number,
  b: number,
  operator: Arithmetic['operator'],
): number | null {
  switch (operator) {
    case '+':
      return a + b;
    case '-':
      return a - b;
    case '×':
      return a * b;
    case '÷':
      // Division by zero is undefined; refuse rather than inventing an answer.
      return b === 0 ? null : Number((a / b).toFixed(2));
  }
}

/**
 * Solves an equation with one blank operand, e.g. `5 + ____ = 9` → 4.
 *
 * Returns the equation in a form whose `result` is the value that belongs in
 * the blank, so the rest of the pipeline treats it like any other answer.
 */
function parseBlankEquation(text: string): Arithmetic | null {
  const BLANK = '(_{2,}|\\?{2,})';
  const NUM = '(-?\\d+(?:\\.\\d+)?)';
  const OP = '([+\\-×x*÷/])';

  // Blank on the right of the operator: a ? _ = c
  const rightBlank = text.match(
    new RegExp(`${NUM}\\s*${OP}\\s*${BLANK}\\s*=\\s*${NUM}`, 'i'),
  );
  // Blank on the left of the operator: _ ? b = c
  const leftBlank = text.match(
    new RegExp(`${BLANK}\\s*${OP}\\s*${NUM}\\s*=\\s*${NUM}`, 'i'),
  );

  if (!rightBlank && !leftBlank) return null;

  const symbolFor = (raw: string): Arithmetic['operator'] => {
    const lower = raw.toLowerCase();
    if (lower === '+') return '+';
    if (lower === '-') return '-';
    if (lower === '÷' || lower === '/') return '÷';
    return '×';
  };

  if (rightBlank) {
    const known = Number(rightBlank[1]);
    const operator = symbolFor(rightBlank[2]);
    const total = Number(rightBlank[4]);

    // known ? missing = total, solved for `missing`.
    const missing =
      operator === '+'
        ? total - known
        : operator === '-'
          ? known - total
          : operator === '×'
            ? known === 0
              ? null
              : total / known
            : total === 0
              ? null
              : known / total;

    if (missing === null || !Number.isFinite(missing)) return null;
    return {
      a: known,
      b: Number(missing.toFixed(2)),
      operator,
      result: Number(missing.toFixed(2)),
      total,
      topic: TOPIC_BY_OPERATOR[operator],
    };
  }

  const operator = symbolFor(leftBlank![2]);
  const known = Number(leftBlank![3]);
  const total = Number(leftBlank![4]);

  // missing ? known = total, solved for `missing`.
  const missing =
    operator === '+'
      ? total - known
      : operator === '-'
        ? total + known
        : operator === '×'
          ? known === 0
            ? null
            : total / known
          : total * known;

  if (missing === null || !Number.isFinite(missing)) return null;
  return {
    a: Number(missing.toFixed(2)),
    b: known,
    operator,
    result: Number(missing.toFixed(2)),
    total,
    topic: TOPIC_BY_OPERATOR[operator],
  };
}

/**
 * Extracts a two-operand sum from free text, understanding both symbolic
 * ("8 x 7", "12 + 8") and worded ("gives 3 to his brother") forms.
 */
function parseArithmetic(text: string): Arithmetic | null {
  // "5 + ____ = 9" asks for the missing operand, not for the sum to be
  // evaluated left to right.
  const blank = parseBlankEquation(text);
  if (blank) return blank;
  if (/_{2,}|\?{2,}/.test(text) && /=/.test(text)) return null;

  const symbolic = text.match(
    /(-?\d+(?:\.\d+)?)\s*([+\-×x*÷/])\s*(-?\d+(?:\.\d+)?)/i,
  );
  if (symbolic) {
    const a = Number(symbolic[1]);
    const b = Number(symbolic[3]);
    const raw = symbolic[2].toLowerCase();
    const operator: Arithmetic['operator'] =
      raw === '+' ? '+' : raw === '-' ? '-' : raw === '÷' || raw === '/' ? '÷' : '×';
    const result = compute(a, b, operator);
    if (result === null) return null;
    return { a, b, operator, result, topic: TOPIC_BY_OPERATOR[operator] };
  }

  // Strip phrases whose numbers are not operands — an age ("for a 7 year old")
  // or a grade ("grade 3") would otherwise be read as part of the sum.
  const operandText = text
    .replace(/\b\d+\s*[-‑]?\s*years?\s*[-‑]?\s*old\b/gi, ' ')
    .replace(/\bage[ds]?\s+\d+\b/gi, ' ')
    .replace(/\b(?:grade|class|year|level)\s+\d+\b/gi, ' ');

  const numbers = [...operandText.matchAll(/(-?\d+(?:\.\d+)?)/g)].map((match) =>
    Number(match[1]),
  );
  if (numbers.length < 2) return null;

  // Word problems that mention giving/losing are subtraction even without a
  // "minus" keyword — this is the single most common shape in the spec.
  const worded = OPERATOR_WORDS.find((entry) => entry.pattern.test(text));
  const givesAway = /\b(?:gives?|gave|lost|loses|ate|spent|sold|away)\b/i.test(
    text,
  );
  const operator: Arithmetic['operator'] = worded
    ? worded.operator
    : givesAway
      ? '-'
      : '+';

  const [a, b] = numbers;
  const result = compute(a, b, operator);
  if (result === null) return null;
  return { a, b, operator, result, topic: TOPIC_BY_OPERATOR[operator] };
}

/* -------------------------------------------------------------------------- */
/* Option generation                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Builds plausible numeric distractors around `answer`, keeping them distinct
 * and non-negative where the answer itself is.
 */
export function numericDistractors(answer: number): string[] {
  const candidates = [answer + 2, answer - 2, answer + 1, answer * 2, answer + 10];
  const seen = new Set<number>([answer]);
  const distractors: string[] = [];

  for (const candidate of candidates) {
    const rounded = Number(candidate.toFixed(2));
    if (seen.has(rounded)) continue;
    if (answer >= 0 && rounded < 0) continue;
    seen.add(rounded);
    distractors.push(String(rounded));
    if (distractors.length === 3) break;
  }

  // Guarantee three distractors even for awkward answers such as 0 or 1.
  let filler = answer + 3;
  while (distractors.length < 3) {
    const rounded = Number(filler.toFixed(2));
    if (!seen.has(rounded) && (answer < 0 || rounded >= 0)) {
      seen.add(rounded);
      distractors.push(String(rounded));
    }
    filler += 1;
  }

  return distractors;
}

/** Deterministically interleaves the answer among distractors. */
function shuffleWithAnswer(answer: string, distractors: string[]): string[] {
  const options = [...distractors];
  // Position derived from the answer text so the correct choice is not always
  // in the same slot, yet the result stays reproducible.
  const index =
    answer.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    (options.length + 1);
  options.splice(index, 0, answer);
  return options;
}

export function buildOptions(answer: string): string[] {
  const numeric = Number(answer);
  if (!Number.isNaN(numeric) && answer.trim() !== '') {
    return shuffleWithAnswer(answer, numericDistractors(numeric));
  }
  return shuffleWithAnswer(answer, ['None of these', 'Not enough information', 'All of these']);
}

/* -------------------------------------------------------------------------- */
/* Classification                                                             */
/* -------------------------------------------------------------------------- */

function detectSubject(text: string): string {
  if (/\b(?:\d|add|sum|subtract|multipl|divid|math|equation|number)\b/i.test(text)) {
    return 'Mathematics';
  }
  if (/\b(?:science|plant|animal|water|energy|planet|body|cell)\b/i.test(text)) {
    return 'Science';
  }
  if (/\b(?:grammar|verb|noun|spelling|sentence|english)\b/i.test(text)) {
    return 'English';
  }
  if (/[؀-ۿ]/.test(text)) return 'Urdu';
  return 'General Knowledge';
}

/** Larger operands and decimals imply a harder question for young learners. */
function detectDifficulty(sum: Arithmetic | null, text: string): Difficulty {
  if (/\b(?:hard|difficult|advanced|challenging)\b/i.test(text)) return 'hard';
  if (/\b(?:medium|moderate)\b/i.test(text)) return 'medium';
  if (!sum) return 'easy';

  const largest = Math.max(Math.abs(sum.a), Math.abs(sum.b));
  if (largest > 100 || !Number.isInteger(sum.result)) return 'hard';
  if (largest > 12) return 'medium';
  return 'easy';
}

/** Honours an explicit request such as "true or false" in the prompt. */
function detectType(text: string, sum: Arithmetic | null): QuestionType {
  if (/\btrue\s*(?:or|\/)\s*false\b/i.test(text)) return 'true_false';
  if (/\bfill\s+in\s+the\s+blank\b/i.test(text) || text.includes('____')) {
    return 'fill_in_blank';
  }
  if (/\bshort\s+answer\b/i.test(text)) return 'short_answer';
  if (sum) return 'math';
  return 'multiple_choice';
}

/* -------------------------------------------------------------------------- */
/* Public mock operations                                                     */
/* -------------------------------------------------------------------------- */

/** Turns one chunk of raw text into a structured question. */
export function mockQuestionFromText(raw: string): AIQuestion {
  // Parse the question itself, not the instruction wrapped around it.
  const text = stripInstruction(raw.trim()) || raw.trim();
  const sum = parseArithmetic(text);
  const type = detectType(text, sum);
  const difficulty = detectDifficulty(sum, text);

  if (sum) {
    const answer = String(sum.result);
    const symbol = `${sum.a} ${sum.operator} ${sum.b}`;
    const isWordProblem = /[a-z]{3,}/i.test(text.replace(/\b(?:what|is|the)\b/gi, ''));

    return {
      questionText: isWordProblem
        ? cleanSentence(text)
        : `What is ${symbol}?`,
      questionType: type === 'multiple_choice' ? 'math' : type,
      options:
        type === 'true_false'
          ? ['True', 'False']
          : type === 'math' || type === 'multiple_choice'
            ? buildOptions(answer)
            : [],
      correctAnswer: type === 'true_false' ? 'True' : answer,
      explanation: `${symbol} = ${sum.total ?? answer}.`,
      subject: 'Mathematics',
      topic: sum.topic,
      difficulty,
    };
  }

  // Non-arithmetic content: reformat as a clean question and leave the answer
  // for the user to fill in, rather than inventing a fact. Without a known
  // answer there is nothing to build options around, so fall back to a
  // short-answer question instead of emitting a choice question with no
  // choices, which would fail schema validation.
  const openType = type === 'true_false' ? 'true_false' : 'short_answer';

  return {
    questionText: cleanSentence(text),
    questionType: openType,
    options: openType === 'true_false' ? ['True', 'False'] : [],
    correctAnswer: openType === 'true_false' ? 'True' : 'Answer',
    explanation: '',
    subject: detectSubject(text),
    topic: '',
    difficulty,
  };
}

/**
 * Removes a spoken instruction preamble, keeping the question itself.
 *
 * Voice input usually arrives as "Create a math question for a 7 year old. If
 * Ahmed has 8 candies…" — only the part after the instruction is the question.
 */
function stripInstruction(raw: string): string {
  const instruction =
    /^\s*(?:please\s+)?(?:make|create|generate|write|give me|can you (?:make|create|write))\b[^.?!]*[.?!]\s*/i;

  const withoutLead = raw.replace(instruction, '').trim();
  // Only accept the strip if something substantial remains.
  if (withoutLead.length >= 12) return withoutLead;

  // No sentence boundary: drop just the leading instruction phrase.
  return raw
    .replace(
      /^\s*(?:please\s+)?(?:make|create|generate|write)\s+(?:me\s+)?(?:some\s+|a\s+|an\s+)?(?:\w+\s+)?questions?\s+(?:for|about|from|on)\s+/i,
      '',
    )
    .trim();
}

/** Capitalises, trims filler and ensures the text reads as a question. */
function cleanSentence(raw: string): string {
  let text = stripInstruction(raw).replace(/\s+/g, ' ').trim();

  if (!text) return raw.trim();
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!/[?.!]$/.test(text)) text += '?';
  return text;
}

/**
 * Splits raw document text into question-sized chunks, honouring explicit
 * "Question 1:" markers, then blank lines, then sentences.
 */
export function splitIntoChunks(raw: string, limit = 10): string[] {
  const text = raw.trim();
  if (!text) return [];

  const numbered = text
    .split(/(?:^|\n)\s*(?:question\s*)?\d+[.):]\s*/i)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (numbered.length > 1) return numbered.slice(0, limit);

  const paragraphs = text
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (paragraphs.length > 1) return paragraphs.slice(0, limit);

  const lines = text
    .split(/\n+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines.slice(0, limit);

  return [text];
}

export function mockQuestionsFromDocument(raw: string, limit = 10): AIQuestion[] {
  return splitIntoChunks(raw, limit).map(mockQuestionFromText);
}
