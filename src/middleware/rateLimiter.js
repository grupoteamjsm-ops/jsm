const rateLimit = require('express-rate-limit');

/**
 * Respuesta estándar cuando se supera el límite
 * Sin exponer información interna del sistema
 */
const rateLimitHandler = (req, res) => {
  res.status(429).json({
    error: 'Demasiadas peticiones. Inténtalo más tarde.',
    retry_after: Math.ceil(req.rateLimit.resetTime / 1000)
  });
};

/**
 * Límite general — todas las rutas
 * 200 peticiones por IP cada 15 minutos
 */
const generalLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              200,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler
});

/**
 * Límite estricto para autenticación
 * Protege contra brute force en login/register
 * 10 intentos por IP cada 15 minutos
 */
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          rateLimitHandler,
  skipSuccessfulRequests: true  // solo cuenta los intentos fallidos
});

/**
 * Límite para ingesta de sensores
 * 1000 lecturas por IP cada minuto (permite alta frecuencia de Arduino)
 */
const sensorLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             1000,
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         rateLimitHandler
});

module.exports = { generalLimiter, authLimiter, sensorLimiter };
