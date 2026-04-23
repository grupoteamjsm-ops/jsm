const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_SECRET  = process.env.JWT_SECRET             || 'dev-secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET     || 'dev-refresh-secret';
const ACCESS_EXP     = process.env.JWT_EXPIRES_IN         || '15m';
const REFRESH_EXP    = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// ─── Generadores ─────────────────────────────────────────────

const generateAccessToken  = (payload) => jwt.sign(payload, ACCESS_SECRET,  { expiresIn: ACCESS_EXP });
const generateRefreshToken = (payload) => jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXP });
const generateToken        = generateAccessToken; // alias

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const refreshExpiresAt = () => {
  const days = parseInt(REFRESH_EXP) || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};

// ─── Verificadores ───────────────────────────────────────────

const verifyAccessToken  = (token) => jwt.verify(token, ACCESS_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, REFRESH_SECRET);

// ─── Middleware Hono ─────────────────────────────────────────

/**
 * Middleware de autenticación para Hono
 * Requiere cabecera: Authorization: Bearer <token>
 * Adjunta el payload en c.set('user', payload)
 */
const authenticateToken = async (c, next) => {
  const authHeader = c.req.header('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return c.json({ error: 'Token de acceso requerido' }, 401);
  }

  try {
    const user = verifyAccessToken(token);
    c.set('user', user);
    await next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return c.json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' }, 401);
    }
    return c.json({ error: 'Token inválido' }, 403);
  }
};

/**
 * Middleware opcional — no bloquea si no hay token
 */
const optionalAuth = async (c, next) => {
  const authHeader = c.req.header('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    try { c.set('user', verifyAccessToken(token)); } catch { /* ignorar */ }
  }
  await next();
};

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
