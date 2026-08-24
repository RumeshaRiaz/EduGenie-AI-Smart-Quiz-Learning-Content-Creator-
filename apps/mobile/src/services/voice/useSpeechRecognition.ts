/**
 * On-device speech recognition.
 *
 * Wraps `expo-speech-recognition` in a small state machine so the recorder UI
 * only deals with `status`, `transcript`, `durationMs` and `error`.
 *
 * NOTE: this uses a native module, so it requires a development build
 * (`npx expo run:android` / `run:ios`) or a custom dev client. It is absent in
 * Expo Go, where `isAvailable` reports false and the UI explains why.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

/**
 * The native module is missing in Expo Go, and a static import of it throws at
 * module-evaluation time — before any component can check availability. Loading
 * it defensively keeps the rest of the app usable there, so the voice screen
 * can show an explanation instead of crashing the whole bundle.
 */
type SpeechModule = typeof import('expo-speech-recognition');

const speech: SpeechModule | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-speech-recognition') as SpeechModule;
  } catch {
    return null;
  }
})();

const ExpoSpeechRecognitionModule = speech?.ExpoSpeechRecognitionModule;

/**
 * Stand-in for the module's event hook when the native module is absent.
 * It must still be called unconditionally to satisfy the rules of hooks.
 */
const useSpeechRecognitionEvent =
  speech?.useSpeechRecognitionEvent ??
  ((_event: string, _listener: (payload: never) => void): void => {
    // No native module, so no events will ever fire.
  });

export type RecognitionStatus =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'stopping'
  | 'done'
  | 'error';

export interface SpeechRecognitionState {
  status: RecognitionStatus;
  /** Best transcript so far; updates live while the user speaks. */
  transcript: string;
  /** Elapsed recording time in milliseconds. */
  durationMs: number;
  error: string | null;
  isAvailable: boolean;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
  reset: () => void;
}

/** Maps recogniser error codes onto copy a teacher can act on. */
function friendlyError(code: string, message?: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone access was denied. Enable it in your device settings to use voice.';
    case 'no-speech':
      return 'We did not hear anything. Tap the microphone and try again.';
    case 'audio-capture':
      return 'The microphone is unavailable. Close other apps using it and try again.';
    case 'network':
      return 'No internet connection. Check your network and try again.';
    case 'language-not-supported':
      return 'That language is not supported on this device. Choose another in Settings.';
    case 'aborted':
      return '';
    default:
      return message?.trim()
        ? `Could not understand the voice input: ${message}`
        : 'Could not understand the voice input. Please try again.';
  }
}

export function useSpeechRecognition(locale = 'en-US'): SpeechRecognitionState {
  const [status, setStatus] = useState<RecognitionStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startedAt = useRef<number | null>(null);
  const ticker = useRef<ReturnType<typeof setInterval> | null>(null);
  // Guards against a late `end` event flipping a cancelled session to 'done'.
  const cancelled = useRef(false);

  const isAvailable = typeof ExpoSpeechRecognitionModule?.start === 'function';

  const stopTicker = useCallback(() => {
    if (ticker.current) {
      clearInterval(ticker.current);
      ticker.current = null;
    }
  }, []);

  useSpeechRecognitionEvent('start', () => {
    cancelled.current = false;
    startedAt.current = Date.now();
    setStatus('recording');
    stopTicker();
    ticker.current = setInterval(() => {
      if (startedAt.current) setDurationMs(Date.now() - startedAt.current);
    }, 200);
  });

  useSpeechRecognitionEvent('result', (event: ExpoSpeechRecognitionResultEvent) => {
    const best = event.results?.[0]?.transcript;
    // Partial results arrive continuously; keep the latest non-empty one.
    if (typeof best === 'string' && best.trim()) setTranscript(best);
  });

  useSpeechRecognitionEvent('error', (event: ExpoSpeechRecognitionErrorEvent) => {
    stopTicker();
    const message = friendlyError(event.error, event.message);
    if (!message) {
      // An abort is a user action, not a failure.
      setStatus('idle');
      return;
    }
    setError(message);
    setStatus('error');
  });

  useSpeechRecognitionEvent('end', () => {
    stopTicker();
    if (cancelled.current) {
      setStatus('idle');
      return;
    }
    // Preserve an error that already set the terminal state.
    setStatus((current) => (current === 'error' ? current : 'done'));
  });

  // Make sure a live recognition session cannot outlive the screen.
  useEffect(() => {
    return () => {
      stopTicker();
      try {
        ExpoSpeechRecognitionModule?.abort();
      } catch {
        // Nothing was running; safe to ignore.
      }
    };
  }, [stopTicker]);

  const start = useCallback(async () => {
    if (!isAvailable) {
      setError(
        'Voice input needs a development build of EduGenie AI. It is not available in Expo Go.',
      );
      setStatus('error');
      return;
    }

    setError(null);
    setTranscript('');
    setDurationMs(0);
    setStatus('requesting');

    if (!ExpoSpeechRecognitionModule) return;

    try {
      const permission =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setError(
          'Microphone access is needed to create questions by voice. Enable it in Settings.',
        );
        setStatus('error');
        return;
      }

      ExpoSpeechRecognitionModule.start({
        lang: locale,
        // Live partial results let the user see recognition as they speak.
        interimResults: true,
        continuous: false,
      });
    } catch {
      setError('Could not start the microphone. Please try again.');
      setStatus('error');
    }
  }, [isAvailable, locale]);

  const stop = useCallback(() => {
    setStatus('stopping');
    try {
      ExpoSpeechRecognitionModule?.stop();
    } catch {
      setStatus('done');
    }
  }, []);

  const cancel = useCallback(() => {
    cancelled.current = true;
    stopTicker();
    try {
      ExpoSpeechRecognitionModule?.abort();
    } catch {
      // Nothing running.
    }
    setStatus('idle');
    setTranscript('');
    setDurationMs(0);
    setError(null);
  }, [stopTicker]);

  const reset = useCallback(() => {
    cancelled.current = false;
    setStatus('idle');
    setTranscript('');
    setDurationMs(0);
    setError(null);
  }, []);

  return {
    status,
    transcript,
    durationMs,
    error,
    isAvailable,
    start,
    stop,
    cancel,
    reset,
  };
}
