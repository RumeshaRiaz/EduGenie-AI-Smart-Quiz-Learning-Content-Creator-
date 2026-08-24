/**
 * Carries a finished voice transcript from the recorder to the review screen.
 * Transient navigation state, like `useDraftHandoff`; never persisted.
 */

import { create } from 'zustand';
import type { VoiceTranscript } from '../types/domain';
import { createId } from '../utils/id';

interface VoiceHandoffState {
  transcript: VoiceTranscript | null;
  set: (input: { text: string; durationMs: number; locale: string }) => void;
  clear: () => void;
}

export const useVoiceHandoff = create<VoiceHandoffState>((set) => ({
  transcript: null,
  set: ({ text, durationMs, locale }) =>
    set({
      transcript: {
        id: createId('vt_'),
        text,
        durationMs,
        locale,
        createdAt: new Date().toISOString(),
      },
    }),
  clear: () => set({ transcript: null }),
}));
