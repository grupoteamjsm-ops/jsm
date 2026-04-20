require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { connectDB } = require('./config/database');
const { apagadoAutomatico } = require('./services/decisionService');

const app = express();

// Conectar a PostgreSQL
connectDB();

// ─── CORS ────────────────────────────────────────────────────
// Permite peticiones desde web, tablet y móvil (React Native, PWA, etc.)
const corsOrigins = process.env.CORS_ORIGINS === '*'
  ? '*'
  : (process.env.CORS_ORIGINS || '*').split(',').map(o => o.trim());

app.use(cors({
  origin: corsOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Authorization'],
  credentials: corsOrigins !== '*', // credentials solo si hay orígenes específicos
  maxAge: 86400 // preflight cache 24h
}));

// ─── Middleware ───────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // permite recursos desde apps móviles
}));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas
const authRoutes      = require('./routes/authRoutes');
const sensorRoutes    = require('./routes/sensorRoutes');
const occupancyRoutes = require('./routes/occupancyRoutes');
const energyRoutes    = require('./routes/energyRoutes');

app.use('/api/auth',      authRoutes);
app.use('/api/sensors',   sensorRoutes);
app.use('/api/occupancy', occupancyRoutes);
app.use('/api/energy',    energyRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'IoT Occupancy Backend is running',
    timestamp: new Date().toISOString()
  });
});

// Manejo de errores global
app.use((err, _req, res, _next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API available at http://localhost:${PORT}/api`);

  // Apagado automático: cada minuto revisa zonas sin actividad reciente
  setInterval(() => {
    apagadoAutomatico();
  }, 60 * 1000);
});

module.exports = app;
