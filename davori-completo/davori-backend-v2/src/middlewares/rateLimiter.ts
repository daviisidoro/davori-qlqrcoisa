// src/middlewares/rateLimiter.ts
import rateLimit from 'express-rate-limit'

// Rate limiter geral: 100 req / 15min por IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Muitas requisições. Tente novamente em alguns minutos.',
  },
})

// Rate limiter estrito para auth: 10 req / 15min por IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Muitas tentativas de login. Aguarde 15 minutos.',
  },
})
