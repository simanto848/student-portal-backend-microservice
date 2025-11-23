import rateLimit from 'express-rate-limit';

export const notificationWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many notification actions, please slow down.' }
});

export const notificationReadLimiter = rateLimit({
  windowMs: 30 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many reads, please slow down.' }
});
