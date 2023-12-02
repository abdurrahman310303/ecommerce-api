const rateLimit = require('express-rate-limit');

const createRateLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

const authLimiter = createRateLimiter(
  15 * 60 * 1000,
  5,
  'Too many authentication attempts, please try again later'
);

const apiLimiter = createRateLimiter(
  15 * 60 * 1000,
  100,
  'Too many requests from this IP, please try again later'
);

const passwordResetLimiter = createRateLimiter(
  60 * 60 * 1000,
  3,
  'Too many password reset attempts, please try again later'
);

module.exports = {
  authLimiter,
  apiLimiter,
  passwordResetLimiter
};
