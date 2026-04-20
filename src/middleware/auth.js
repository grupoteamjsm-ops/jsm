const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_SECRET  = process.env.JWT_SECRET          || 'dev-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET  || 'dev-refresh-secret';
const ACCESS_EXP     = process.env.JWT_EXPIRES_IN      || '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ─── Generadores ────────────────────────────────────────────

/**
 * Genera un access token JWT (corta duración: 15 min)
 */
const generateAccessToken = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXP });

/**
 * Genera un refresh token JWT (larga duración: 7 días)
 */
const generateRefreshToken = (payload) =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXP });

/**
 * Hash SHA-256 del refresh token para guardarlo en BD
 * (nunca guardamos el token en claro)
 */
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

/**
 * Calcula la fecha de expiración del refresh token
 */
const refreshExpiresAt = () => {
  const days = parseInt(REFRESH_EXP) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

// ─── Verificadores ───────────────────────────────────────────

/**
 * Verifica un access token
 */
const verifyAccessToken = (token) =>
  jwt.verify(token, ACCESS_SECRET);

/**
 * Verifica un refresh token
 */
const verifyRefreshToken = (token) =>
  jwt.verify(token, REFRESH_SECRET);

// ─── Middleware ──────────────────────────────────────────────

/**
 * Middleware de autenticación — requiere access token válido
 * Header: Authorization: Bearer <token>
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de acceso requerido' });
  }

  try {
    req.user = verifyAccessToken(token);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expirado',
        code: 'TOKEN_EXPIRED'
      });
    }
    return res.status(403).json({ error: 'Token inválido' });
  }
};

/**
 * Middleware opcional — no bloquea si no hay token
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    try { req.user = verifyAccessToken(token); } catch { /* ignorar */ }
  }
  next();
};

// Alias para compatibilidad
const generateToken = generateAccessToken;

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateToken,
  hashToken,
  refreshExpiresAt,
  verifyAccessToken,
  verifyRefreshToken,
  authenticateToken,
  optionalAuth
};
