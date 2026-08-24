/**
 * EduGenie AI backend.
 *
 * Exists so the mobile app never has to hold an AI provider key: the app posts
 * plain requests here, and this service adds the credential and calls the
 * provider. It also extracts text from binary documents, which the React Native
 * runtime cannot do reliably.
 *
 * Run `npm run dev` after copying `.env.example` to `.env`.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { aiRouter } from './routes/ai.js';
import { filesRouter } from './routes/files.js';
import { isConfigured } from './services/anthropic.js';

const app = express();
const port = Number(process.env.PORT ?? 8787);

// Hosting platforms put a proxy in front of the app; without this the rate
// limiter sees every request as coming from the proxy's single address.
app.set('trust proxy', 1);

// Comma-separated allow-list; unset means allow any origin, which is fine for
// local development but should be set in production.
const origins = process.env.CORS_ORIGINS?.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors(origins?.length ? { origin: origins } : {}));
// JSON bodies carry document text, so allow more than the 100kb default.
app.use(express.json({ limit: '2mb' }));

/**
 * Every AI call costs real money, and this service is reachable from the open
 * internet. Cap how often one address can spend credits. Raise
 * `RATE_LIMIT_PER_HOUR` if a shared school network hits the ceiling.
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: Number(process.env.RATE_LIMIT_PER_HOUR ?? 60),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests right now. Please wait a moment and retry.',
  },
});

/** Liveness plus whether the AI key is present, for the app to check setup. */
app.get('/health', (_req, res) => {
  res.json({
    data: {
      status: 'ok',
      aiConfigured: isConfigured(),
      model: process.env.ANTHROPIC_MODEL?.trim() || 'claude-opus-5',
    },
  });
});

app.use('/api/ai', aiLimiter, aiRouter);
app.use('/api/files', aiLimiter, filesRouter);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Bind to every interface, not just loopback: hosting platforms route traffic
// in from outside the container, and a phone on the LAN needs the same.
app.listen(port, '0.0.0.0', () => {
  console.log(`EduGenie API listening on port ${port}`);
  if (!isConfigured()) {
    console.warn(
      'WARNING: ANTHROPIC_API_KEY is not set. AI endpoints will return 503 until it is.',
    );
  }
});
