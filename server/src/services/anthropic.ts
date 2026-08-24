/**
 * Anthropic client and the prompts behind each AI endpoint.
 *
 * The API key lives here, on the server, and is read from the environment. It
 * is never sent to the mobile app.
 *
 * Structured output is enforced with `output_config.format`, so the model's
 * response is constrained to our JSON schema. Every response is still parsed
 * with Zod afterwards — schema-constrained generation makes malformed output
 * unlikely, not impossible.
 */

import Anthropic from '@anthropic-ai/sdk';
import {
  aiQuestionSchema,
  explanationJsonSchema,
  optionsJsonSchema,
  questionJsonSchema,
  questionListJsonSchema,
  type AIQuestion,
} from '../schemas.js';
import { z } from 'zod';

const MODEL = process.env.ANTHROPIC_MODEL?.trim() || 'claude-opus-5';

/** Question generation is short-form; this is ample and bounds cost. */
const MAX_TOKENS = 4096;

/** Thrown when the AI layer cannot produce a usable result. */
export class AIServiceError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'AIServiceError';
    this.status = status;
  }
}

let client: Anthropic | null = null;

/** Lazily constructs the client so the server can boot without a key set. */
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new AIServiceError(
      'The server has no ANTHROPIC_API_KEY configured.',
      503,
    );
  }
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

const SYSTEM_PROMPT = `You are an assistant for EduGenie AI, used by teachers, tutors and parents to write questions for school-age children.

Rules you must always follow:
- Write clear, age-appropriate language. Prefer short sentences.
- Be factually correct. Never invent facts you are unsure of; if a passage does not contain enough information to write a correct answer, base the question only on what is stated.
- For multiple_choice and true_false questions, "correctAnswer" MUST exactly match one of the strings in "options".
- For multiple_choice, provide four options unless the content clearly calls for fewer. Distractors must be plausible but clearly wrong.
- For true_false, options must be exactly ["True", "False"].
- For short_answer, fill_in_blank and math, leave "options" empty and put the expected answer in "correctAnswer".
- Explanations should be one or two sentences a child can follow.
- Choose "difficulty" based on the age and the complexity of the reasoning required.`;

/**
 * Calls the model with a schema-constrained response and validates the result.
 *
 * @param instruction  The user-turn content for this request.
 * @param jsonSchema   JSON Schema the response must conform to.
 * @param schema       Zod schema used to validate the parsed response.
 */
async function generateStructured<T>(
  instruction: string,
  jsonSchema: object,
  schema: z.ZodType<T>,
): Promise<T> {
  let response: Anthropic.Message;
  try {
    response = await getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM_PROMPT,
      output_config: {
        format: {
          type: 'json_schema',
          schema: jsonSchema as Record<string, unknown>,
        },
      },
      messages: [{ role: 'user', content: instruction }],
    });
  } catch (error) {
    if (error instanceof AIServiceError) throw error;
    if (error instanceof Anthropic.RateLimitError) {
      throw new AIServiceError('The AI service is rate limited.', 429);
    }
    if (error instanceof Anthropic.AuthenticationError) {
      throw new AIServiceError('The AI API key was rejected.', 502);
    }
    if (error instanceof Anthropic.APIError) {
      throw new AIServiceError(`The AI service failed: ${error.message}`);
    }
    throw new AIServiceError('Could not reach the AI service.');
  }

  // A safety decline arrives as HTTP 200 with stop_reason "refusal".
  if (response.stop_reason === 'refusal') {
    throw new AIServiceError(
      'The AI declined this request. Try rephrasing the content.',
      422,
    );
  }

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')
    .trim();

  if (!text) {
    throw new AIServiceError('The AI returned an empty response.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AIServiceError('The AI returned output that was not valid JSON.');
  }

  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new AIServiceError(
      `The AI returned data in an unexpected shape: ${result.error.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    );
  }
  return result.data;
}

/**
 * Repairs the one failure that schema constraints cannot express: for
 * option-based types the correct answer must be one of the options. Rather than
 * rejecting an otherwise good question, adopt the answer as an option when it
 * is missing.
 */
function reconcileAnswer(question: AIQuestion): AIQuestion {
  const needsOptions =
    question.questionType === 'multiple_choice' ||
    question.questionType === 'true_false';
  if (!needsOptions) return question;

  const normalise = (value: string) => value.trim().toLowerCase();
  const matched = question.options.find(
    (option) => normalise(option) === normalise(question.correctAnswer),
  );
  if (matched) {
    // Align the answer with the option's exact casing.
    return { ...question, correctAnswer: matched };
  }

  if (question.options.length === 0) {
    throw new AIServiceError(
      'The AI produced a choice question with no options.',
    );
  }

  // Replace the last distractor so the answer is present and count is stable.
  const options = [...question.options.slice(0, -1), question.correctAnswer];
  return { ...question, options };
}

/* -------------------------------------------------------------------------- */
/* Operations                                                                 */
/* -------------------------------------------------------------------------- */

export interface GenerationHints {
  questionType?: string;
  subject?: string;
  difficulty?: string;
}

function hintText(hints: GenerationHints): string {
  const parts: string[] = [];
  if (hints.questionType) {
    parts.push(
      `Preferred question type: ${hints.questionType} (use a different type only if it clearly does not suit the content).`,
    );
  }
  if (hints.subject) parts.push(`Likely subject: ${hints.subject}.`);
  if (hints.difficulty) parts.push(`Target difficulty: ${hints.difficulty}.`);
  return parts.length ? `\n\n${parts.join('\n')}` : '';
}

export async function generateQuestion(
  prompt: string,
  hints: GenerationHints = {},
): Promise<AIQuestion> {
  const question = await generateStructured(
    `Create one educational question from this request:\n\n"""${prompt}"""${hintText(hints)}`,
    questionJsonSchema,
    aiQuestionSchema,
  );
  return reconcileAnswer(question);
}

export async function processVoiceQuestion(
  transcript: string,
  hints: GenerationHints = {},
): Promise<AIQuestion> {
  const question = await generateStructured(
    `A teacher spoke this instruction aloud and it was transcribed. Work out what question they want and produce it. The transcript may contain speech-recognition errors — interpret the intent charitably.\n\n"""${transcript}"""${hintText(hints)}`,
    questionJsonSchema,
    aiQuestionSchema,
  );
  return reconcileAnswer(question);
}

export async function parseEducationalContent(
  content: string,
  limit: number,
): Promise<AIQuestion[]> {
  const { questions } = await generateStructured(
    `Convert the following educational material into at most ${limit} well-formed questions. If it already contains questions, structure those rather than inventing new ones. Only write a question you can answer correctly from the material or from basic general knowledge.\n\n"""${content}"""`,
    questionListJsonSchema,
    z.object({ questions: z.array(aiQuestionSchema).min(1) }),
  );
  return questions.slice(0, limit).map(reconcileAnswer);
}

export async function improveQuestion(
  question: AIQuestion,
): Promise<AIQuestion> {
  const improved = await generateStructured(
    `Improve this question: fix grammar and spelling, make the wording clear and age-appropriate, and fill in any missing options or explanation. Keep the original meaning and the correct answer unchanged.\n\n${JSON.stringify(question, null, 2)}`,
    questionJsonSchema,
    aiQuestionSchema,
  );
  return reconcileAnswer(improved);
}

export async function generateOptions(
  questionText: string,
  correctAnswer: string,
): Promise<{ options: string[]; correctAnswer: string }> {
  const result = await generateStructured(
    `Write four multiple-choice options for this question. Exactly one must be the given correct answer, reproduced verbatim; the other three must be plausible but clearly wrong. Return the correct answer in "correctAnswer".\n\nQuestion: ${questionText}\nCorrect answer: ${correctAnswer}`,
    optionsJsonSchema,
    z.object({
      options: z.array(z.string().trim().min(1)).min(2).max(8),
      correctAnswer: z.string().trim().min(1),
    }),
  );

  // Guarantee the answer is present even if the model paraphrased it.
  const normalise = (value: string) => value.trim().toLowerCase();
  if (!result.options.some((option) => normalise(option) === normalise(result.correctAnswer))) {
    result.options = [...result.options.slice(0, -1), result.correctAnswer];
  }
  return result;
}

export async function generateExplanation(
  questionText: string,
  correctAnswer: string,
): Promise<string> {
  const { explanation } = await generateStructured(
    `Write a one or two sentence explanation, suitable for a child, of why this answer is correct.\n\nQuestion: ${questionText}\nCorrect answer: ${correctAnswer}`,
    explanationJsonSchema,
    z.object({ explanation: z.string().trim().min(1) }),
  );
  return explanation;
}
