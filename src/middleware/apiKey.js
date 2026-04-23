const { query } = require('../config/database');
const crypto = require('crypto');

/**
 * Middleware de autenticación por API Key para dispositivos IoT (Arduino)
 * Cabecera requerida: X-API-Key: <key>
 */
const authenticateApiKey = async (c, next) => {
  // En desarrollo sin REQUIRE_API_KEY=true, permitir paso libre
  if (process.env.REQUIRE_API_KEY !== 'true') {
    return await next();
  }

  const apiKey = c.req.header('x-api-key');

  if (!apiKey) {
    return c.json({ error: 'API Key requerida. Incluye la cabecera X-API-Key.' }, 401);
  }

  try {
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    const result = await query(
      `SELECT id, device_id, zone FROM api_keys
       WHERE key_hash = $1 AND activa = TRUE AND (expires_at IS NULL OR expires_at > NOW())`,
      [keyHash]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'API Key inválida o expirada' }, 401);
    }

    c.set('device', result.rows[0]);

    // Actualizar último uso en segundo plano
    query('UPDATE api_keys SET ultimo_uso = NOW() WHERE key_hash = $1', [keyHash])
      .catch(() => {});

    await next();
  } catch (error) {
    if (error.code === '42P01') return await next(); // tabla no existe aún (dev)
    console.error('[ApiKey] Error:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

module.exports = { authenticateApiKey };
