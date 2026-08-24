/**
 * AI provider layer.
 *
 * The rest of the server asks for "structured JSON matching this schema" and
 * does not care which vendor answers. Adding a provider means implementing
 * `generateStructured` here; no prompt, route or schema changes.
 *
 * Which provider runs is decided by whichever API key is present, so deploying
 * is a matter of setting one environment variable.
 */

import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenAI } from '@google/genai';

/** Thrown when the AI layer cannot produce a usable result. */
export class AIServiceError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'AIServiceError';
    this.status = status;
  }
}

export type ProviderName = 'gemini' | 'anthropic';

export interface Provider {
  readonly name: ProviderName;
  readonly model: string;
  /** Returns the model's raw response text, constrained to `jsonSchema`. */
  generateStructured(
    systemPrompt: string,
    instruction: string,
    jsonSchema: object,
  ): Promise<string>;
}

/** Question generation is short-form; this bounds cost and latency. */
const MAX_TOKENS = 4096;

/* -------------------------------------------------------------------------- */
/* Google Gemini                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Gemini has a genuine free tier, which makes it the default when its key is
 * present. `responseJsonSchema` constrains generation to our schema.
 */
class GeminiProvider implements Provider {
  readonly name = 'gemini' as const;
  readonly model: string;
  private client: GoogleGenAI | null = null;

  constructor(private readonly apiKey: string, model?: string) {
    this.model = model?.trim() || 'gemini-2.5-flash';
  }

  private getClient(): GoogleGenAI {
    if (!this.client) {
      this.client = new GoogleGenAI({ apiKey: this.apiKey });
    }
    return this.client;
  }

  async generateStructured(
    systemPrompt: string,
    instruction: string,
    jsonSchema: object,
  ): Promise<string> {
    let response;
    try {
      response = await this.getClient().models.generateContent({
        model: this.model,
        contents: instruction,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: 'application/json',
          responseJsonSchema: jsonSchema,
          maxOutputTokens: MAX_TOKENS,
        },
      });
    } catch (error) {
      throw translateGeminiError(error);
    }

    const text = response.text;
    if (!text?.trim()) {
      // An empty body usually means a safety filter stopped generation.
      throw new AIServiceError(
        'The AI returned an empty response. Try rephrasing the content.',
        422,
      );
    }
    return text;
  }
}

/** Maps Gemini transport failures onto our own error type. */
function translateGeminiError(error: unknown): AIServiceError {
  const message =
    error instanceof Error ? error.message : 'Unknown AI service failure';

  // The SDK surfaces HTTP failures in the message rather than a status field.
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(message)) {
    return new AIServiceError(
      'The AI free-tier limit was reached. Please wait a minute and try again.',
      429,
    );
  }
  if (/401|403|API key|PERMISSION_DENIED|UNAUTHENTICATED/i.test(message)) {
    return new AIServiceError('The AI API key was rejected.', 502);
  }
  if (/SAFETY|blocked/i.test(message)) {
    return new AIServiceError(
      'The AI declined this request. Try rephrasing the content.',
      422,
    );
  }
  return new AIServiceError(`The AI service failed: ${message}`);
}

/* -------------------------------------------------------------------------- */
/* Anthropic                                                                  */
/* -------------------------------------------------------------------------- */

class AnthropicProvider implements Provider {
  readonly name = 'anthropic' as const;
  readonly model: string;
  private client: Anthropic | null = null;

  constructor(private readonly apiKey: string, model?: string) {
    this.model = model?.trim() || 'claude-opus-5';
  }

  private getClient(): Anthropic {
    if (!this.client) this.client = new Anthropic({ apiKey: this.apiKey });
    return this.client;
  }

  async generateStructured(
    systemPrompt: string,
    instruction: string,
    jsonSchema: object,
  ): Promise<string> {
    let response: Anthropic.Message;
    try {
      response = await this.getClient().messages.create({
        model: this.model,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        output_config: {
          format: {
            type: 'json_schema',
            schema: jsonSchema as Record<string, unknown>,
          },
        },
        messages: [{ role: 'user', content: instruction }],
      });
    } catch (error) {
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

    if (!text) throw new AIServiceError('The AI returned an empty response.');
    return text;
  }
}

/* -------------------------------------------------------------------------- */
/* Selection                                                                  */
/* -------------------------------------------------------------------------- */

let cached: Provider | null | undefined;

/**
 * Picks a provider from the environment.
 *
 * `AI_PROVIDER` forces a choice; otherwise Gemini wins when its key is set,
 * because its free tier means a working deployment costs nothing.
 * Returns null when no key is configured at all.
 */
export function getProvider(): Provider | null {
  if (cached !== undefined) return cached;

  const gemini =
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.GOOGLE_API_KEY?.trim();
  const anthropic = process.env.ANTHROPIC_API_KEY?.trim();
  const preferred = process.env.AI_PROVIDER?.trim().toLowerCase();

  if (preferred === 'anthropic' && anthropic) {
    cached = new AnthropicProvider(anthropic, process.env.ANTHROPIC_MODEL);
  } else if (preferred === 'gemini' && gemini) {
    cached = new GeminiProvider(gemini, process.env.GEMINI_MODEL);
  } else if (gemini) {
    cached = new GeminiProvider(gemini, process.env.GEMINI_MODEL);
  } else if (anthropic) {
    cached = new AnthropicProvider(anthropic, process.env.ANTHROPIC_MODEL);
  } else {
    cached = null;
  }

  return cached;
}

/** Clears the memoised provider. Used by tests. */
export function resetProvider(): void {
  cached = undefined;
}

export function isConfigured(): boolean {
  return getProvider() !== null;
}

/** Describes the active provider, for the health endpoint. */
export function describeProvider(): {
  configured: boolean;
  provider: ProviderName | null;
  model: string | null;
} {
  const provider = getProvider();
  return {
    configured: provider !== null,
    provider: provider?.name ?? null,
    model: provider?.model ?? null,
  };
}
