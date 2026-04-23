// Validar variables de entorno ANTES de cualquier otra cosa
require('dotenv').config();
const validateEnv = require('./config/validateEnv');
validateEnv();

const { serve }        = require('@hono/node-server');
const { Hono }         = require('hono');
const { cors }         = require('hono/cors');
const { secureHeaders } = require('hono/secure-headers');
const { compress }     = require('hono/compress');
const logger           = require('./utils/logger');
const { connectDB }    = require('./config/database');
const { apagadoAutomatico }  = require('./services/decisionService');
const { runMaintenance }     = require('./services/maintenanceService');
const { authLimiter, sensorLimiter, generalLimiter } = require('./middleware/rateLimiter');
const { healthCheck }  = require('./controllers/healthController');

// Rutas
const authRoutes      = require('./routes/authRoutes');
const sensorRoutes    = require('./routes/sensorRoutes');
const occupancyRoutes = require('./routes/occupancyRoutes');
const energyRoutes    = require('./routes/energyRoutes');
const zonesRoutes     = require('./routes/zonesRoutes');
const devicesRoutes   = require('./routes/devicesRoutes');
const usersRoutes     = require('./routes/usersRoutes');
const sseRoutes       = require('./routes/sseRoutes');

const app = new Hono();

// ─── CORS ─────────────────────────────────────────────────────
const corsOrigins = process.env.CORS_ORIGINS === '*'
  ? '*'
  : (process.env.CORS_ORIGINS || '*').split(',').map(o => o.trim());

app.use('/*', cors({
  origin:        corsOrigins,
  allowMethods:  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders:  ['Content-Type', 'Authorization', 'X-API-Key'],
  exposeHeaders: ['Authorization', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  credentials:   corsOrigins !== '*',
  maxAge:        86400
}));

// ─── Middleware global ────────────────────────────────────────
app.use('/*', secureHeaders());
app.use('/*', compress());
app.use('/*', generalLimiter);

// Logger HTTP con Pino (reemplaza morgan)
app.use('/*', async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  logger.info({
    method: c.req.method,
    path:   c.req.path,
    status: c.res.status,
    ms
  }, `${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`);
});

// ─── Health check ─────────────────────────────────────────────
app.get('/health', healthCheck);

// ─── Rate limits específicos ──────────────────────────────────
app.use('/api/auth/*',       authLimiter);
app.use('/api/sensors/data', sensorLimiter);

// ─── Rutas API ────────────────────────────────────────────────
app.route('/api/auth',      authRoutes);
app.route('/api/sensors',   sensorRoutes);
app.route('/api/occupancy', occupancyRoutes);
app.route('/api/energy',    energyRoutes);
app.route('/api/zones',     zonesRoutes);
app.route('/api/devices',   devicesRoutes);
app.route('/api/users',     usersRoutes);
app.route('/api/sse',       sseRoutes);

// ─── 404 ──────────────────────────────────────────────────────
app.notFound((c) => {
  logger.warn({ method: c.req.method, path: c.req.path }, 'Ruta no encontrada');
  return c.json({ error: `Ruta no encontrada: ${c.req.method} ${c.req.path}` }, 404);
});

// ─── Error global ─────────────────────────────────────────────
app.onError((err, c) => {
  logger.error({ err, method: c.req.method, path: c.req.path }, err.message);

  if (err.code === '23505') return c.json({ error: 'El recurso ya existe' }, 409);
  if (err.code === '23503') return c.json({ error: 'Referencia inválida' }, 400);
  if (err.code === '22P02') return c.json({ error: 'Formato de datos inválido' }, 400);
  if (err.name === 'JsonWebTokenError') return c.json({ error: 'Token inválido' }, 401);
  if (err.name === 'TokenExpiredError') return c.json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' }, 401);

  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message;

  return c.json({ error: message }, err.status || 500);
});

// ─── Arranque ─────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 3000;

connectDB().then(() => {
  serve({ fetch: app.fetch, port: PORT }, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Framework: Hono | Env: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`API available at http://localhost:${PORT}/api`);

    // ── Jobs periódicos ──────────────────────────────────────
    // Apagado automático: cada minuto
    setInterval(() => apagadoAutomatico(), 60 * 1000);

    // Mantenimiento (archivado + limpieza tokens): cada 24 horas
    setInterval(() => runMaintenance(), 24 * 60 * 60 * 1000);

    // Primera ejecución de mantenimiento al arrancar (con delay de 1 min)
    setTimeout(() => runMaintenance(), 60 * 1000);
  });
});

module.exports = app;
