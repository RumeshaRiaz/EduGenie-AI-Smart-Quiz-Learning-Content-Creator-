/**
 * Text extraction for binary document formats.
 *
 * These parsers are Node libraries that need Buffer and zlib, which is why
 * extraction happens here rather than in the React Native app.
 */

import mammoth from 'mammoth';
import * as XLSX from 'xlsx';

export class ExtractError extends Error {
  readonly status: number;

  constructor(message: string, status = 422) {
    super(message);
    this.name = 'ExtractError';
    this.status = status;
  }
}

export type SupportedKind = 'pdf' | 'docx' | 'xlsx' | 'csv' | 'txt';

/** Maps a filename and MIME type onto a parser. */
export function detectKind(
  filename: string,
  mimetype: string,
): SupportedKind | null {
  const extension = filename.split('.').pop()?.toLowerCase() ?? '';

  if (extension === 'pdf' || mimetype === 'application/pdf') return 'pdf';
  if (extension === 'docx' || extension === 'doc') return 'docx';
  if (extension === 'xlsx' || extension === 'xls') return 'xlsx';
  if (extension === 'csv') return 'csv';
  if (['txt', 'md', 'text'].includes(extension)) return 'txt';
  if (mimetype.startsWith('text/')) return 'txt';

  return null;
}

export async function extractText(
  buffer: Buffer,
  kind: SupportedKind,
): Promise<string> {
  switch (kind) {
    case 'txt':
    case 'csv':
      return buffer.toString('utf8');
    case 'pdf':
      return extractPdf(buffer);
    case 'docx':
      return extractDocx(buffer);
    case 'xlsx':
      return extractSpreadsheet(buffer);
  }
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // pdf-parse v2 exposes a PDFParse class that owns a worker; it must be
  // destroyed after use or the process keeps handles open.
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    // Suppress the default "-- 1 of 3 --" page markers; they would otherwise be
    // read as question text by the AI layer.
    const result = await parser.getText({ pageJoiner: '' });
    return result.text ?? '';
  } catch {
    throw new ExtractError(
      'This PDF could not be read. It may be scanned images rather than text, or password protected.',
    );
  } finally {
    await parser.destroy().catch(() => {
      // Cleanup failure must not mask a successful extraction.
    });
  }
}

async function extractDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? '';
  } catch {
    throw new ExtractError('This Word document could not be read.');
  }
}

function extractSpreadsheet(buffer: Buffer): string {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    // Flatten every sheet: a question bank often spans more than one tab.
    return workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name];
      const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
        header: 1,
        blankrows: false,
      });
      return rows
        .map((row) =>
          row
            .map((cell) => String(cell ?? '').trim())
            .filter(Boolean)
            .join(' — '),
        )
        .filter(Boolean)
        .join('\n');
    })
      .filter(Boolean)
      .join('\n\n');
  } catch {
    throw new ExtractError('This spreadsheet could not be read.');
  }
}
