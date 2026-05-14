import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => (req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req)),
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many AI requests. Limit is 20 per hour.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
  standardHeaders: true,
  legacyHeaders: false,
});
