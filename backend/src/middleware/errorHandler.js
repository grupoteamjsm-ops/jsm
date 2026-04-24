/**
 * Middleware de manejo de errores global
 * Garantiza que nunca se exponga información interna sensible
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  // Log interno completo (solo en servidor)
  console.error(`[Error] ${req.method} ${req.path} →`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Errores conocidos de PostgreSQL
  if (err.code) {
    switch (err.code) {
      case '23505': // unique_violation
        return res.status(409).json({ error: 'El recurso ya existe' });
      case '23503': // foreign_key_violation
        return res.status(400).json({ error: 'Referencia inválida' });
      case '22P02': // invalid_text_representation (UUID mal formado, etc.)
        return res.status(400).json({ error: 'Formato de datos inválido' });
      case '42P01': // undefined_table
        return res.status(503).json({ error: 'Base de datos no disponible' });
    }
  }

  // Errores de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token inválido' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
  }

  // Error genérico — nunca exponer stack trace en producción
  const statusCode = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message || 'Error interno del servidor';

  res.status(statusCode).json({ error: message });
};

/**
 * Middleware para rutas no encontradas (404)
 */
const notFound = (req, res) => {
  res.status(404).json({
    error: `Ruta no encontrada: ${req.method} ${req.path}`
  });
};

module.exports = { errorHandler, notFound };
