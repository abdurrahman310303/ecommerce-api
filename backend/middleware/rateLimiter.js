const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Too many requests, please try again later'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return req.user && req.user.role === 'admin';
    }
  });
};

const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // 5 attempts
  'Too many authentication attempts, please try again in 15 minutes'
);

const apiLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests
  'Too many requests from this IP, please try again in 15 minutes'
);

const paymentLimiter = createRateLimiter(
  5 * 60 * 1000, // 5 minutes
  3, // 3 attempts
  'Too many payment attempts, please try again in 5 minutes'
);

const searchLimiter = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  30, // 30 searches
  'Too many search requests, please slow down'
);

const uploadLimiter = createRateLimiter(
  10 * 60 * 1000, // 10 minutes
  10, // 10 uploads
  'Too many upload requests, please try again later'
);

const passwordResetLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 attempts
  'Too many password reset attempts, please try again in 1 hour'
);

const registrationLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  3, // 3 registrations
  'Too many registration attempts from this IP'
);

const cartLimiter = createRateLimiter(
  1 * 60 * 1000, // 1 minute
  50, // 50 cart operations
  'Too many cart operations, please slow down'
);

module.exports = {
  authLimiter,
  apiLimiter,
  paymentLimiter,
  searchLimiter,
  uploadLimiter,
  passwordResetLimiter,
  registrationLimiter,
  cartLimiter,
  createRateLimiter
};
