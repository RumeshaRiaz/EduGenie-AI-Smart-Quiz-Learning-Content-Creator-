/**
 * AI endpoints consumed by the mobile app.
 *
 * Every handler validates its request body, calls the AI service, and responds
 * with `{ data }` on success or `{ error }` with a suitable status on failure.
 */

import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import {
  generateExplanationBody,
  generateOptionsBody,
  generateQuestionBody,
  improveQuestionBody,
  parseContentBody,
  processVoiceBody,
} from '../schemas.js';
import {
  AIServiceError,
  generateExplanation,
  generateOptions,
  generateQuestion,
  improveQuestion,
  parseEducationalContent,
  processVoiceQuestion,
} from '../services/anthropic.js';

export const aiRouter = Router();

/**
 * Wraps a handler so body validation and AI failures become clean JSON errors
 * instead of unhandled rejections.
 */
function handle<T>(
  schema: z.ZodType<T>,
  run: (body: T) => Promise<unknown>,
) {
  return async (req: Request, res: Response): Promise<void> => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: `Invalid request: ${parsed.error.issues
          .map((issue) => `${issue.path.join('.')} ${issue.message}`)
          .join('; ')}`,
      });
      return;
    }

    try {
      const data = await run(parsed.data);
      res.json({ data });
    } catch (error) {
      if (error instanceof AIServiceError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      // Log the real cause server-side; return something safe to the client.
      console.error('[ai] unexpected failure', error);
      res.status(500).json({ error: 'Something went wrong. Please try again.' });
    }
  };
}

aiRouter.post(
  '/generate-question',
  handle(generateQuestionBody, ({ prompt, ...hints }) =>
    generateQuestion(prompt, hints),
  ),
);

aiRouter.post(
  '/process-voice',
  handle(processVoiceBody, ({ transcript, ...hints }) =>
    processVoiceQuestion(transcript, hints),
  ),
);

aiRouter.post(
  '/parse-content',
  handle(parseContentBody, ({ content, limit }) =>
    parseEducationalContent(content, limit),
  ),
);

aiRouter.post(
  '/improve-question',
  handle(improveQuestionBody, ({ question }) => improveQuestion(question)),
);

aiRouter.post(
  '/generate-options',
  handle(generateOptionsBody, ({ questionText, correctAnswer }) =>
    generateOptions(questionText, correctAnswer),
  ),
);

aiRouter.post(
  '/generate-explanation',
  handle(generateExplanationBody, async ({ questionText, correctAnswer }) => ({
    explanation: await generateExplanation(questionText, correctAnswer),
  })),
);
