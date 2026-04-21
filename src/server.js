require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { connectDB } = require('./config/database');
const { apagadoAutomatico } = require('./services/decisionService');
const { generalLimiter, authLimiter, sensorLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFound } = require('./middleware/errorHandler');

const app = express();

// Conectar a PostgreSQL
connectDB();

// ─── CORS ────────────────────────────────────────────────────
// Permite peticiones desde web, tablet y móvil (React Native, PWA, etc.)
const corsOrigins = process.env.CORS_ORIGINS === '*'
  ? '*'
  : (process.env.CORS_ORIGINS || '*').split(',').map(o => o.trim());

app.use(cors({
  origin:           corsOrigins,
  methods:          ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:   ['Content-Type', 'Authorization', 'X-API-Key'],
  exposedHeaders:   ['Authorization', 'RateLimit-Limit', 'RateLimit-Remaining'],
  credentials:      corsOrigins !== '*',
  maxAge:           86400
}));

// ─── Seguridad HTTP ───────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  // En producción activar HSTS (fuerza HTTPS)
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 31536000, includeSubDomains: true }
    : false
}));

// ─── Rate limiting general ────────────────────────────────────
app.use(generalLimiter);

// ─── Utilidades ───────────────────────────────────────────────
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));       // limitar tamaño del body
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ─── Rutas ────────────────────────────────────────────────────
const authRoutes      = require('./routes/authRoutes');
const sensorRoutes    = require('./routes/sensorRoutes');
const occupancyRoutes = require('./routes/occupancyRoutes');
const energyRoutes    = require('./routes/energyRoutes');

// Auth con rate limit estricto (anti brute force)
app.use('/api/auth',      authLimiter, authRoutes);

// Sensores con rate limit alto (Arduino envía frecuentemente)
app.use('/api/sensors',   sensorLimiter, sensorRoutes);

// Ocupación y energía con rate limit general
app.use('/api/occupancy', occupancyRoutes);
app.use('/api/energy',    energyRoutes);

// ─── Health check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status:    'ok',
    message:   'IoT Occupancy Backend is running',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV || 'development'
  });
});

// ─── 404 y errores globales ───────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ─── Arranque ─────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API available at http://localhost:${PORT}/api`);

  // Apagado automático: cada minuto revisa zonas sin actividad
  setInterval(() => {
    apagadoAutomatico();
  }, 60 * 1000);
});

module.exports = app;
