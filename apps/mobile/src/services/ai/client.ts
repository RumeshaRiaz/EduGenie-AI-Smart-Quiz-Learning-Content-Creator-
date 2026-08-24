/**
 * HTTP transport for the AI backend.
 *
 * Every failure mode — offline, timeout, HTTP error, unparseable body, schema
 * mismatch — is normalised into an `AIError` so callers handle one error type.
 */

import type { z } from 'zod';
import { AIError } from '../../types/ai';
import { AI_TIMEOUT_MS, getBackendUrl } from './config';

/**
 * POSTs to the backend and validates the response against `schema`.
 *
 * @param path   Endpoint path, e.g. `/api/ai/generate-question`.
 * @param body   JSON-serialisable request payload.
 * @param schema Zod schema the response `data` field must satisfy.
 */
export async function postJSON<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
): Promise<T> {
  const base = getBackendUrl();
  if (!base) {
    throw new AIError(
      'not_configured',
      'No AI backend URL configured',
      false,
    );
  }

  // AbortController gives us a hard ceiling on how long a screen can spin.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    // `fetch` rejects both for a genuine network failure and for our abort.
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AIError('timeout', 'The AI request timed out');
    }
    throw new AIError('network', 'Could not reach the AI service');
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) {
    throw new AIError('rate_limited', 'Rate limited by the AI service');
  }
  if (!response.ok) {
    throw new AIError('unknown', `AI service returned ${response.status}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AIError('invalid_response', 'AI response was not valid JSON');
  }

  // The backend wraps successful results as { data: ... }.
  const envelope = payload as { data?: unknown; error?: string };
  if (envelope?.error) {
    throw new AIError('unknown', envelope.error);
  }

  const parsed = schema.safeParse(envelope?.data);
  if (!parsed.success) {
    throw new AIError(
      'invalid_response',
      `AI returned data in an unexpected shape: ${parsed.error.issues
        .map((issue) => issue.message)
        .join('; ')}`,
    );
  }

  return parsed.data;
}
