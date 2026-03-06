/**
 * AI routes
 *
 * POST /api/review
 *   Body: { code: string, filename?: string, language?: string }
 *   Returns: { review: string }  — structured code-review feedback
 *
 * POST /api/suggest
 *   Body: { code: string, instruction: string, filename?: string }
 *   Returns: { suggestion: string }  — rewritten/improved snippet
 */

import { Router } from 'express';
import { reviewCode, suggestImprovement } from '../lib/openai.js';

const router = Router();

// ── POST /api/review ──────────────────────────────────────────────────────────

router.post('/review', async (req, res, next) => {
  try {
    const { code, filename, language } = req.body;

    if (typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ error: '`code` field is required and must be a non-empty string' });
    }

    const review = await reviewCode(code, { filename, language });
    res.json({ review });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/suggest ─────────────────────────────────────────────────────────

router.post('/suggest', async (req, res, next) => {
  try {
    const { code, instruction, filename } = req.body;

    if (typeof code !== 'string' || code.trim().length === 0) {
      return res.status(400).json({ error: '`code` field is required and must be a non-empty string' });
    }
    if (typeof instruction !== 'string' || instruction.trim().length === 0) {
      return res.status(400).json({ error: '`instruction` field is required and must be a non-empty string' });
    }

    const suggestion = await suggestImprovement(code, instruction, { filename });
    res.json({ suggestion });
  } catch (err) {
    next(err);
  }
});

export default router;
