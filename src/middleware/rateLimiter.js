/**
 * Rate limiting para Hono — implementado con Map en memoria
 * Para producción con múltiples instancias, usar Redis
 */

const createRateLimiter = ({ windowMs, max, message }) => {
  const store = new Map(); // ip → { count, resetAt }

  return async (c, next) => {
    const ip  = c.req.header('x-forwarded-for')?.split(',')[0].trim()
             || c.req.header('x-real-ip')
             || 'unknown';

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return await next();
    }

    if (entry.count >= max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      c.header('X-RateLimit-Limit', String(max));
      c.header('X-RateLimit-Remaining', '0');
      return c.json({ error: message || 'Demasiadas peticiones. Inténtalo más tarde.' }, 429);
    }

    entry.count++;
    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(max - entry.count));
    return await next();
  };
};

// Límite estricto para auth (anti brute force): 10 intentos / 15 min
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  'Demasiados intentos de autenticación. Inténtalo en 15 minutos.'
});

// Límite alto para sensores Arduino: 1000 req / min
const sensorLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max:      1000,
  message:  'Límite de lecturas de sensor superado.'
});

// Límite general: 200 req / 15 min
const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max:      200
});

module.exports = { authLimiter, sensorLimiter, generalLimiter };
