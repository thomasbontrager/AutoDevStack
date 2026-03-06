/**
 * PR routes
 *
 * GET /api/pr/:owner/:repo/:number
 *   Returns pull-request metadata (title, author, state, labels, reviews,
 *   check-run statuses) plus a truncated diff (first 6000 chars).
 *
 * GET /api/pr/:owner/:repo/:number/insights
 *   Returns the same data enriched with a brief AI-generated summary of the
 *   changes and any obvious concerns spotted from the diff.
 */

import { Router } from 'express';
import { fetchPR, fetchPRDiff, fetchPRChecks, fetchPRReviews } from '../lib/github.js';
import { generateInsights } from '../lib/openai.js';

const router = Router();

// ── GET /api/pr/:owner/:repo/:number ─────────────────────────────────────────

router.get('/:owner/:repo/:number', async (req, res, next) => {
  try {
    const { owner, repo, number } = req.params;
    const prNumber = parseInt(number, 10);

    if (!Number.isInteger(prNumber) || prNumber < 1) {
      return res.status(400).json({ error: 'PR number must be a positive integer' });
    }

    const [pr, diff, checks, reviews] = await Promise.all([
      fetchPR(owner, repo, prNumber),
      fetchPRDiff(owner, repo, prNumber),
      fetchPRChecks(owner, repo, prNumber),
      fetchPRReviews(owner, repo, prNumber),
    ]);

    res.json({
      pr,
      diff: diff.slice(0, 6000),
      checks,
      reviews,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/pr/:owner/:repo/:number/insights ─────────────────────────────────

router.get('/:owner/:repo/:number/insights', async (req, res, next) => {
  try {
    const { owner, repo, number } = req.params;
    const prNumber = parseInt(number, 10);

    if (!Number.isInteger(prNumber) || prNumber < 1) {
      return res.status(400).json({ error: 'PR number must be a positive integer' });
    }

    const [pr, diff, checks, reviews] = await Promise.all([
      fetchPR(owner, repo, prNumber),
      fetchPRDiff(owner, repo, prNumber),
      fetchPRChecks(owner, repo, prNumber),
      fetchPRReviews(owner, repo, prNumber),
    ]);

    const truncatedDiff = diff.slice(0, 6000);
    const insights = await generateInsights(pr, truncatedDiff);

    res.json({
      pr,
      diff: truncatedDiff,
      checks,
      reviews,
      insights,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
