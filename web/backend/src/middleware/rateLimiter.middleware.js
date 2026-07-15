const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * General API rate limiter.
 * Development needs a higher ceiling because the UI can trigger many read-only
 * search requests while filters are being tested.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 2000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' || req.path.startsWith('/v1/papers/search'),
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.',
    },
  },
});

/**
 * Auth-specific rate limiter — stricter: 20 requests per 15 minutes.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many authentication attempts, please try again later.',
    },
  },
});

/**
 * AI endpoints can call paid/slow providers, so keep a separate budget.
 */
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 120 : 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many AI requests, please try again later.',
    },
  },
});

module.exports = { apiLimiter, authLimiter, aiLimiter };
