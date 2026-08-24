/**
 * Document import and text extraction.
 *
 * Text-based formats (TXT, CSV) are parsed on-device: they are just strings and
 * doing so keeps import working with no network. Binary container formats (PDF,
 * DOCX, XLSX) cannot be parsed reliably in the React Native runtime — the
 * mature parsers are Node libraries that need Buffer and zlib — so those files
 * are uploaded to the backend, which extracts the text and returns it.
 *
 * When no backend is configured, binary formats report a clear, actionable
 * error rather than silently producing empty or garbled content.
 */

import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import Papa from 'papaparse';
import { createId } from '../../utils/id';
import type { ImportedDocument, ImportedFileKind } from '../../types/domain';
import { AI_TIMEOUT_MS, getBackendUrl } from '../ai/config';

/** Thrown for every import failure, with copy safe to show to the user. */
export class ImportError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable = true) {
    super(message);
    this.name = 'ImportError';
    this.retryable = retryable;
  }
}

/** Formats accepted by the picker. */
const MIME_TYPES = [
  'text/plain',
  'text/csv',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
];

/** Refuse very large files early — they stall the UI and the AI call. */
const MAX_BYTES = 8 * 1024 * 1024;

const EXTENSION_KINDS: Record<string, ImportedFileKind> = {
  txt: 'txt',
  md: 'txt',
  text: 'txt',
  csv: 'csv',
  pdf: 'pdf',
  docx: 'docx',
  doc: 'docx',
  xlsx: 'xlsx',
  xls: 'xlsx',
};

/** Formats parsed locally; everything else needs the backend extractor. */
const LOCAL_KINDS: readonly ImportedFileKind[] = ['txt', 'csv'];

function kindFromName(name: string): ImportedFileKind | null {
  const extension = name.split('.').pop()?.toLowerCase() ?? '';
  return EXTENSION_KINDS[extension] ?? null;
}

/**
 * Opens the system file picker and extracts text from the chosen document.
 *
 * @returns The imported document, or `null` if the user cancelled.
 */
export async function pickAndExtract(): Promise<ImportedDocument | null> {
  let result: DocumentPicker.DocumentPickerResult;
  try {
    result = await DocumentPicker.getDocumentAsync({
      type: MIME_TYPES,
      copyToCacheDirectory: true,
      multiple: false,
    });
  } catch {
    throw new ImportError('Could not open the file picker. Please try again.');
  }

  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const kind = kindFromName(asset.name);

  if (!kind) {
    throw new ImportError(
      `"${asset.name}" is not a supported file type. Use TXT, CSV, PDF, DOCX or XLSX.`,
      false,
    );
  }

  if (asset.size !== undefined && asset.size > MAX_BYTES) {
    throw new ImportError(
      'That file is larger than 8 MB. Please choose a smaller file.',
      false,
    );
  }

  const extractedText = LOCAL_KINDS.includes(kind)
    ? await extractLocally(asset.uri, kind)
    : await extractViaBackend(asset.uri, asset.name, kind);

  if (!extractedText.trim()) {
    throw new ImportError(
      'That file appears to be empty — no text could be read from it.',
      false,
    );
  }

  return {
    id: createId('doc_'),
    name: asset.name,
    kind,
    size: asset.size,
    extractedText: extractedText.trim(),
    importedAt: new Date().toISOString(),
  };
}

/* -------------------------------------------------------------------------- */
/* Local extraction                                                           */
/* -------------------------------------------------------------------------- */

async function extractLocally(
  uri: string,
  kind: ImportedFileKind,
): Promise<string> {
  let raw: string;
  try {
    raw = await new File(uri).text();
  } catch {
    throw new ImportError('Could not read that file from your device.');
  }

  return kind === 'csv' ? flattenCsv(raw) : raw;
}

/**
 * Renders CSV rows as readable lines. A spreadsheet of questions usually has
 * one question per row, so each row becomes one chunk for the AI to structure.
 */
function flattenCsv(raw: string): string {
  const parsed = Papa.parse<string[]>(raw.trim(), {
    skipEmptyLines: true,
  });

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new ImportError('That CSV file could not be read.', false);
  }

  return parsed.data
    .map((row) =>
      row
        .map((cell) => String(cell ?? '').trim())
        .filter(Boolean)
        .join(' — '),
    )
    .filter(Boolean)
    .join('\n');
}

/* -------------------------------------------------------------------------- */
/* Backend extraction                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Uploads a binary document to the backend for text extraction.
 * See /server `POST /api/files/extract`.
 */
async function extractViaBackend(
  uri: string,
  name: string,
  kind: ImportedFileKind,
): Promise<string> {
  const base = getBackendUrl();
  if (!base) {
    throw new ImportError(
      `${kind.toUpperCase()} files are read by the EduGenie backend, which is not configured yet. ` +
        'Add a backend URL in Settings, or import a TXT or CSV file instead.',
      false,
    );
  }

  const form = new FormData();
  // React Native's FormData accepts this file descriptor shape for uploads.
  form.append('file', {
    uri,
    name,
    type: mimeForKind(kind),
  } as unknown as Blob);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(`${base}/api/files/extract`, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ImportError('Reading that file took too long. Please try again.');
    }
    throw new ImportError('No internet connection. Check your network and try again.');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new ImportError('Could not process this file. Please try another one.');
  }

  const payload = (await response.json().catch(() => null)) as {
    data?: { text?: string };
    error?: string;
  } | null;

  if (!payload || payload.error || typeof payload.data?.text !== 'string') {
    throw new ImportError(payload?.error ?? 'Could not process this file.');
  }

  return payload.data.text;
}

function mimeForKind(kind: ImportedFileKind): string {
  switch (kind) {
    case 'pdf':
      return 'application/pdf';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'csv':
      return 'text/csv';
    default:
      return 'text/plain';
  }
}
