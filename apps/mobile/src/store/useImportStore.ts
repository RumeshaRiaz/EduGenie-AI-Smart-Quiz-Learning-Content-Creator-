/**
 * State for the file-import flow: the picked document and the questions the AI
 * produced from it, held while the user reviews them across three screens.
 * Cleared once the questions are saved or the flow is abandoned.
 */

import { create } from 'zustand';
import type { ImportedDocument, QuestionDraft } from '../types/domain';

interface ImportState {
  document: ImportedDocument | null;
  /** Editable drafts awaiting the user's approval. */
  generated: QuestionDraft[];
  setDocument: (document: ImportedDocument | null) => void;
  setGenerated: (drafts: QuestionDraft[]) => void;
  updateGenerated: (index: number, draft: QuestionDraft) => void;
  removeGenerated: (index: number) => void;
  reset: () => void;
}

export const useImportStore = create<ImportState>((set) => ({
  document: null,
  generated: [],
  setDocument: (document) => set({ document }),
  setGenerated: (generated) => set({ generated }),
  updateGenerated: (index, draft) =>
    set((state) => ({
      generated: state.generated.map((item, position) =>
        position === index ? draft : item,
      ),
    })),
  removeGenerated: (index) =>
    set((state) => ({
      generated: state.generated.filter((_, position) => position !== index),
    })),
  reset: () => set({ document: null, generated: [] }),
}));
