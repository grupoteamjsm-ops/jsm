require('dotenv').config();
const { serve } = require('@hono/node-server');
const { Hono } = require('hono');
const { logger } = require('hono/logger');
const { cors } = require('hono/cors');
const { secureHeaders } = require('hono/secure-headers');
const { compress } = require('hono/compress');
const { connectDB } = require('./config/database');
const { apagadoAutomatico } = require('./services/decisionService');
const { authLimiter, sensorLimiter, generalLimiter } = require('./middleware/rateLimiter');

// Rutas
const authRoutes      = require('./routes/authRoutes');
const sensorRoutes    = require('./routes/sensorRoutes');
const occupancyRoutes = require('./routes/occupancyRoutes');
const energyRoutes    = require('./routes/energyRoutes');

const app = new Hono();

// ─── CORS ─────────────────────────────────────────────────────
const corsOrigins = process.env.CORS_ORIGINS === '*'
  ? '*'
  : (process.env.CORS_ORIGINS || '*').split(',').map(o => o.trim());

app.use('/*', cors({
  origin:           corsOrigins,
  allowMethods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders:     ['Content-Type', 'Authorization', 'X-API-Key'],
  exposeHeaders:    ['Authorization', 'X-RateLimit-Limit', 'X-RateLimit-Remaining'],
  credentials:      corsOrigins !== '*',
  maxAge:           86400
}));

// ─── Middleware global ────────────────────────────────────────
app.use('/*', secureHeaders());
app.use('/*', compress());
app.use('/*', logger());
app.use('/*', generalLimiter);

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (c) => c.json({
  status:    'ok',
  message:   'IoT Occupancy Backend is running',
  framework: 'Hono',
  timestamp: new Date().toISOString(),
  env:       process.env.NODE_ENV || 'development'
}));

// ─── Rutas API ────────────────────────────────────────────────
app.use('/api/auth/*',      authLimiter);
app.use('/api/sensors/data', sensorLimiter);

app.route('/api/auth',      authRoutes);
app.route('/api/sensors',   sensorRoutes);
app.route('/api/occupancy', occupancyRoutes);
app.route('/api/energy',    energyRoutes);

// ─── 404 ──────────────────────────────────────────────────────
app.notFound((c) => c.json({
  error: `Ruta no encontrada: ${c.req.method} ${c.req.path}`
}, 404));

// ─── Error global ─────────────────────────────────────────────
app.onError((err, c) => {
  console.error(`[Error] ${c.req.method} ${c.req.path} →`, err.message);

  // Errores PostgreSQL
  if (err.code === '23505') return c.json({ error: 'El recurso ya existe' }, 409);
  if (err.code === '23503') return c.json({ error: 'Referencia inválida' }, 400);
  if (err.code === '22P02') return c.json({ error: 'Formato de datos inválido' }, 400);

  // Errores JWT
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
    console.log(`Server running on port ${PORT}`);
    console.log(`Framework: Hono`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API available at http://localhost:${PORT}/api`);

    // Apagado automático: cada minuto revisa zonas sin actividad
    setInterval(() => apagadoAutomatico(), 60 * 1000);
  });
});

module.exports = app;
