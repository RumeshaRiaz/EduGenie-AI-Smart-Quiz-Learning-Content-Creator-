/**
 * File extraction endpoint.
 *
 * Accepts one uploaded document and returns its plain text. Files are held in
 * memory and discarded once the response is sent — nothing is written to disk.
 */

import { Router } from 'express';
import multer from 'multer';
import {
  ExtractError,
  detectKind,
  extractText,
} from '../services/extract.js';

const MAX_BYTES = 8 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

export const filesRouter = Router();

filesRouter.post('/extract', (req, res) => {
  upload.single('file')(req, res, async (uploadError) => {
    if (uploadError) {
      const tooLarge =
        uploadError instanceof multer.MulterError &&
        uploadError.code === 'LIMIT_FILE_SIZE';
      res.status(tooLarge ? 413 : 400).json({
        error: tooLarge
          ? 'That file is larger than 8 MB. Please choose a smaller file.'
          : 'The upload could not be read.',
      });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file was uploaded.' });
      return;
    }

    const kind = detectKind(file.originalname, file.mimetype);
    if (!kind) {
      res.status(415).json({
        error: `"${file.originalname}" is not a supported file type. Use TXT, CSV, PDF, DOCX or XLSX.`,
      });
      return;
    }

    try {
      const text = await extractText(file.buffer, kind);
      if (!text.trim()) {
        res.status(422).json({
          error: 'That file appears to be empty — no text could be read from it.',
        });
        return;
      }
      res.json({ data: { text: text.trim(), kind } });
    } catch (error) {
      if (error instanceof ExtractError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      console.error('[files] extraction failed', error);
      res.status(500).json({ error: 'Could not process this file.' });
    }
  });
});
