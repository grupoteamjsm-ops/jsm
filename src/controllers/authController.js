const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
  refreshExpiresAt,
  verifyRefreshToken
} = require('../middleware/auth');

const SALT_ROUNDS = 12;

// ─── Helpers ─────────────────────────────────────────────────

/**
 * Guarda el refresh token (hasheado) en la BD
 */
const saveRefreshToken = async (usuarioId, refreshToken, req) => {
  const hash      = hashToken(refreshToken);
  const expiresAt = refreshExpiresAt();
  const userAgent = req.headers['user-agent'] || null;
  const ip        = req.ip || req.connection?.remoteAddress || null;

  await query(
    `INSERT INTO refresh_tokens (usuario_id, token_hash, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5)`,
    [usuarioId, hash, expiresAt, userAgent, ip]
  );
};

/**
 * Construye la respuesta estándar de autenticación
 */
const buildAuthResponse = (usuario, accessToken, refreshToken) => ({
  success: true,
  access_token:  accessToken,
  refresh_token: refreshToken,
  token_type:    'Bearer',
  expires_in:    parseInt(process.env.JWT_EXPIRES_IN) || 900, // segundos
  usuario: {
    id:     usuario.id,
    nombre: usuario.nombre,
    email:  usuario.email,
    rol:    usuario.rol
  }
});

// ─── Controladores ───────────────────────────────────────────

/**
 * POST /api/auth/register
 * Body: { nombre, email, password, rol? }
 */
const register = async (req, res) => {
  try {
    const { nombre, email, password, rol = 'operador' } = req.body;

    // Email duplicado
    const existing = await query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'El email ya está registrado' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol`,
      [nombre, email, password_hash, rol]
    );

    const usuario      = result.rows[0];
    const payload      = { id: usuario.id, email: usuario.email, rol: usuario.rol };
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await saveRefreshToken(usuario.id, refreshToken, req);

    res.status(201).json(buildAuthResponse(usuario, accessToken, refreshToken));
  } catch (error) {
    console.error('Error en register:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = result.rows[0];

    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Actualizar último login
    await query(
      'UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1',
      [usuario.id]
    );

    const payload      = { id: usuario.id, email: usuario.email, rol: usuario.rol };
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await saveRefreshToken(usuario.id, refreshToken, req);

    res.json(buildAuthResponse(usuario, accessToken, refreshToken));
  } catch (error) {
    console.error('Error en login:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/auth/refresh
 * Body: { refresh_token }
 * Devuelve un nuevo access token sin necesidad de volver a hacer login
 */
const refresh = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({ error: 'refresh_token requerido' });
    }

    // Verificar firma JWT del refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refresh_token);
    } catch (err) {
      return res.status(401).json({
        error: err.name === 'TokenExpiredError'
          ? 'Refresh token expirado, inicia sesión de nuevo'
          : 'Refresh token inválido'
      });
    }

    // Comprobar que existe en BD y no está revocado
    const hash   = hashToken(refresh_token);
    const result = await query(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1
         AND revocado   = FALSE
         AND expires_at > NOW()`,
      [hash]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Refresh token inválido o revocado' });
    }

    // Revocar el token usado (rotación de tokens)
    await query(
      'UPDATE refresh_tokens SET revocado = TRUE WHERE token_hash = $1',
      [hash]
    );

    // Obtener datos actualizados del usuario
    const userResult = await query(
      'SELECT id, nombre, email, rol FROM usuarios WHERE id = $1 AND activo = TRUE',
      [payload.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    const usuario       = userResult.rows[0];
    const newPayload    = { id: usuario.id, email: usuario.email, rol: usuario.rol };
    const accessToken   = generateAccessToken(newPayload);
    const newRefresh    = generateRefreshToken(newPayload);

    await saveRefreshToken(usuario.id, newRefresh, req);

    res.json(buildAuthResponse(usuario, accessToken, newRefresh));
  } catch (error) {
    console.error('Error en refresh:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/auth/logout
 * Revoca el refresh token actual
 * Body: { refresh_token }
 */
const logout = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (refresh_token) {
      const hash = hashToken(refresh_token);
      await query(
        'UPDATE refresh_tokens SET revocado = TRUE WHERE token_hash = $1',
        [hash]
      );
    }

    res.json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('Error en logout:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * POST /api/auth/logout-all
 * Revoca TODOS los refresh tokens del usuario (cerrar todas las sesiones)
 * Requiere access token válido
 */
const logoutAll = async (req, res) => {
  try {
    await query(
      'UPDATE refresh_tokens SET revocado = TRUE WHERE usuario_id = $1',
      [req.user.id]
    );

    res.json({ success: true, message: 'Todas las sesiones cerradas' });
  } catch (error) {
    console.error('Error en logoutAll:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/auth/me
 * Perfil del usuario autenticado
 */
const me = async (req, res) => {
  try {
    const result = await query(
      'SELECT id, nombre, email, rol, activo, creado_en, ultimo_login FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ success: true, usuario: result.rows[0] });
  } catch (error) {
    console.error('Error en me:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * PUT /api/auth/password
 * Cambiar contraseña — requiere access token
 * Body: { password_actual, password_nueva }
 */
const changePassword = async (req, res) => {
  try {
    const { password_actual, password_nueva } = req.body;

    const result = await query(
      'SELECT password_hash FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const valida = await bcrypt.compare(password_actual, result.rows[0].password_hash);
    if (!valida) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    const nuevo_hash = await bcrypt.hash(password_nueva, SALT_ROUNDS);

    await query(
      'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
      [nuevo_hash, req.user.id]
    );

    // Revocar todos los refresh tokens al cambiar contraseña
    await query(
      'UPDATE refresh_tokens SET revocado = TRUE WHERE usuario_id = $1',
      [req.user.id]
    );

    res.json({ success: true, message: 'Contraseña actualizada. Inicia sesión de nuevo.' });
  } catch (error) {
    console.error('Error en changePassword:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = { register, login, refresh, logout, logoutAll, me, changePassword };
