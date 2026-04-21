const { query } = require('../config/database');
const crypto = require('crypto');

/**
 * Middleware de autenticación por API Key para dispositivos IoT (Arduino)
 *
 * El Arduino debe enviar la cabecera:
 *   X-API-Key: <api_key>
 *
 * Si no hay API keys configuradas en BD, se permite el acceso
 * (modo desarrollo). En producción siempre debe haber al menos una key.
 */
const authenticateApiKey = async (req, res, next) => {
  // En desarrollo sin BD, permitir paso libre
  if (process.env.NODE_ENV !== 'production' && !process.env.REQUIRE_API_KEY) {
    return next();
  }

  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'API Key requerida. Incluye la cabecera X-API-Key.'
    });
  }

  try {
    // Hashear la key recibida para comparar con la BD
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const result = await query(
      `SELECT id, device_id, zone FROM api_keys
       WHERE key_hash = $1 AND activa = TRUE AND (expires_at IS NULL OR expires_at > NOW())`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'API Key inválida o expirada' });
    }

    // Adjuntar info del dispositivo al request
    req.device = result.rows[0];

    // Actualizar último uso
    await query(
      'UPDATE api_keys SET ultimo_uso = NOW() WHERE key_hash = $1',
      [keyHash]
    ).catch(() => {}); // no bloquear si falla

    next();
  } catch (error) {
    // Si la tabla no existe aún, permitir paso (modo desarrollo)
    if (error.code === '42P01') return next();
    console.error('[ApiKey] Error:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { authenticateApiKey };
