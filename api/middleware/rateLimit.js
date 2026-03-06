// Simple in-memory rate limiter middleware
// windowMs: time window in milliseconds
// max: max requests per window per IP
function rateLimit({ windowMs = 60_000, max = 100, message = 'Too many requests, please try again later.' } = {}) {
  const hits = new Map();

  // Periodically clear expired entries to avoid memory growth
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits.entries()) {
      if (now > entry.resetAt) {
        hits.delete(key);
      }
    }
  }, windowMs);

  // Allow GC in tests / serverless environments
  if (interval.unref) interval.unref();

  return function rateLimitMiddleware(req, res, next) {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000));
      return res.status(429).json({ error: message });
    }

    next();
  };
}

module.exports = { rateLimit };
