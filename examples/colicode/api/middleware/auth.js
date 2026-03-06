/**
 * Auth middleware
 *
 * Validates the X-API-Secret header against the API_SECRET env var.
 * The CLI sends this header automatically so that only authorized clients
 * can call the private endpoints.
 */

export function authMiddleware(req, res, next) {
  const secret = process.env.API_SECRET;

  // If no secret is configured, skip auth (useful for local dev without .env)
  if (!secret) {
    return next();
  }

  const provided = req.headers['x-api-secret'];
  if (!provided || provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized — invalid or missing X-API-Secret header' });
  }

  next();
}
