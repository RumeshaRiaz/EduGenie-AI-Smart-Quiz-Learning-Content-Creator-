/**
 * Short-lived hand-off slot for passing a draft between screens.
 *
 * Expo Router params are URL strings, so serialising a whole question draft
 * through them would be lossy and fragile. Instead the producing screen (voice,
 * AI generation, import) puts the draft here and navigates; the editor takes it
 * on mount. Deliberately not persisted — it is transient navigation state.
 */

import { create } from 'zustand';
import type { QuestionDraft } from '../types/domain';

interface DraftHandoffState {
  draft: QuestionDraft | null;
  /** Stores a draft for the next screen to collect. */
  put: (draft: QuestionDraft) => void;
  /** Returns the pending draft and clears it, so it is consumed only once. */
  take: () => QuestionDraft | null;
}

export const useDraftHandoff = create<DraftHandoffState>((set, get) => ({
  draft: null,
  put: (draft) => set({ draft }),
  take: () => {
    const { draft } = get();
    if (draft) set({ draft: null });
    return draft;
  },
}));
