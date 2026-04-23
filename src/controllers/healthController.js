const { pool } = require('../config/database');
const logger   = require('../utils/logger');

const startTime = Date.now();

/**
 * GET /health
 * Health check completo — comprueba PostgreSQL y devuelve estado real
 */
const healthCheck = async (c) => {
  const checks = {
    server:   { status: 'ok' },
    database: { status: 'unknown' },
  };

  // Comprobar conexión a PostgreSQL
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() AS now, version() AS version');
    client.release();

    checks.database = {
      status:    'ok',
      connected: true,
      timestamp: result.rows[0].now,
      version:   result.rows[0].version.split(' ').slice(0, 2).join(' ')
    };
  } catch (error) {
    logger.warn({ err: error }, '[Health] PostgreSQL no disponible');
    checks.database = {
      status:    'error',
      connected: false,
      message:   'No se puede conectar a PostgreSQL'
    };
  }

  const allOk      = Object.values(checks).every(c => c.status === 'ok');
  const statusCode = allOk ? 200 : 503;
  const uptimeMs   = Date.now() - startTime;

  return c.json({
    status:    allOk ? 'ok' : 'degraded',
    framework: 'Hono',
    uptime:    `${Math.floor(uptimeMs / 1000)}s`,
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV || 'development',
    checks
  }, statusCode);
};

module.exports = { healthCheck };
