/**
 * AI transport configuration.
 *
 * The mobile app never holds a provider API key. It talks to the EduGenie
 * backend (see /server), which holds the key server-side. When no backend URL
 * is configured the app falls back to a local mock provider so the flows remain
 * explorable — the UI always states which mode is active, so mock output is
 * never presented as real AI.
 */

/** Base URL of the EduGenie backend, e.g. https://api.example.com */
const ENV_URL = process.env.EXPO_PUBLIC_API_URL?.trim() ?? '';

export type AIMode = 'backend' | 'mock';

/** Runtime override set from Settings; takes precedence over the env value. */
let overrideUrl: string | null = null;

export function setBackendUrlOverride(url: string | null): void {
  overrideUrl = url?.trim() ? url.trim().replace(/\/+$/, '') : null;
}

export function getBackendUrl(): string {
  return overrideUrl ?? ENV_URL.replace(/\/+$/, '');
}

export function getAIMode(): AIMode {
  return getBackendUrl() ? 'backend' : 'mock';
}

/** Requests are abandoned after this long so the UI never hangs forever. */
export const AI_TIMEOUT_MS = 45_000;
