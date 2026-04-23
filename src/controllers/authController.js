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

const saveRefreshToken = async (usuarioId, refreshToken, c) => {
  const hash      = hashToken(refreshToken);
  const expiresAt = refreshExpiresAt();
  const userAgent = c.req.header('user-agent') || null;
  const ip        = c.req.header('x-forwarded-for')?.split(',')[0].trim()
                 || c.req.header('x-real-ip')
                 || null;

  await query(
    `INSERT INTO refresh_tokens (usuario_id, token_hash, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (token_hash) DO NOTHING`,
    [usuarioId, hash, expiresAt, userAgent, ip]
  );
};

const buildAuthResponse = (usuario, accessToken, refreshToken) => ({
  success:       true,
  access_token:  accessToken,
  refresh_token: refreshToken,
  token_type:    'Bearer',
  expires_in:    900,
  usuario: {
    id:     usuario.id,
    nombre: usuario.nombre,
    email:  usuario.email,
    rol:    usuario.rol
  }
});

// ─── Controladores ───────────────────────────────────────────

const register = async (c) => {
  try {
    const { nombre, email, password, rol = 'operador' } = c.req.valid('json');

    const existing = await query('SELECT id FROM usuarios WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return c.json({ error: 'El email ya está registrado' }, 409);
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

    await saveRefreshToken(usuario.id, refreshToken, c);

    return c.json(buildAuthResponse(usuario, accessToken, refreshToken), 201);
  } catch (error) {
    console.error('Error en register:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

const login = async (c) => {
  try {
    const { email, password } = c.req.valid('json');

    const result = await query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Credenciales incorrectas' }, 401);
    }

    const usuario = result.rows[0];
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);

    if (!passwordValida) {
      return c.json({ error: 'Credenciales incorrectas' }, 401);
    }

    await query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1', [usuario.id]);

    const payload      = { id: usuario.id, email: usuario.email, rol: usuario.rol };
    const accessToken  = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await saveRefreshToken(usuario.id, refreshToken, c);

    return c.json(buildAuthResponse(usuario, accessToken, refreshToken));
  } catch (error) {
    console.error('Error en login:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

const refresh = async (c) => {
  try {
    const body = await c.req.json();
    const { refresh_token } = body;

    if (!refresh_token) {
      return c.json({ error: 'refresh_token requerido' }, 400);
    }

    let payload;
    try {
      payload = verifyRefreshToken(refresh_token);
    } catch (err) {
      return c.json({
        error: err.name === 'TokenExpiredError'
          ? 'Refresh token expirado, inicia sesión de nuevo'
          : 'Refresh token inválido'
      }, 401);
    }

    const hash   = hashToken(refresh_token);
    const result = await query(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = $1 AND revocado = FALSE AND expires_at > NOW()`,
      [hash]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Refresh token inválido o revocado' }, 401);
    }

    await query('UPDATE refresh_tokens SET revocado = TRUE WHERE token_hash = $1', [hash]);

    const userResult = await query(
      'SELECT id, nombre, email, rol FROM usuarios WHERE id = $1 AND activo = TRUE',
      [payload.id]
    );

    if (userResult.rows.length === 0) {
      return c.json({ error: 'Usuario no encontrado o inactivo' }, 401);
    }

    const usuario      = userResult.rows[0];
    const newPayload   = { id: usuario.id, email: usuario.email, rol: usuario.rol };
    const accessToken  = generateAccessToken(newPayload);
    const newRefresh   = generateRefreshToken(newPayload);

    await saveRefreshToken(usuario.id, newRefresh, c);

    return c.json(buildAuthResponse(usuario, accessToken, newRefresh));
  } catch (error) {
    console.error('Error en refresh:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

const logout = async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const { refresh_token } = body;

    if (refresh_token) {
      const hash = hashToken(refresh_token);
      await query('UPDATE refresh_tokens SET revocado = TRUE WHERE token_hash = $1', [hash]);
    }

    return c.json({ success: true, message: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('Error en logout:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

const logoutAll = async (c) => {
  try {
    const user = c.get('user');
    await query('UPDATE refresh_tokens SET revocado = TRUE WHERE usuario_id = $1', [user.id]);
    return c.json({ success: true, message: 'Todas las sesiones cerradas' });
  } catch (error) {
    console.error('Error en logoutAll:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

const me = async (c) => {
  try {
    const user   = c.get('user');
    const result = await query(
      'SELECT id, nombre, email, rol, activo, creado_en, ultimo_login FROM usuarios WHERE id = $1',
      [user.id]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }

    return c.json({ success: true, usuario: result.rows[0] });
  } catch (error) {
    console.error('Error en me:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

const changePassword = async (c) => {
  try {
    const user = c.get('user');
    const { password_actual, password_nueva } = c.req.valid('json');

    const result = await query(
      'SELECT password_hash FROM usuarios WHERE id = $1',
      [user.id]
    );

    if (result.rows.length === 0) {
      return c.json({ error: 'Usuario no encontrado' }, 404);
    }

    const valida = await bcrypt.compare(password_actual, result.rows[0].password_hash);
    if (!valida) {
      return c.json({ error: 'La contraseña actual es incorrecta' }, 401);
    }

    const nuevo_hash = await bcrypt.hash(password_nueva, SALT_ROUNDS);
    await query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [nuevo_hash, user.id]);
    await query('UPDATE refresh_tokens SET revocado = TRUE WHERE usuario_id = $1', [user.id]);

    return c.json({ success: true, message: 'Contraseña actualizada. Inicia sesión de nuevo.' });
  } catch (error) {
    console.error('Error en changePassword:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

module.exports = { register, login, refresh, logout, logoutAll, me, changePassword };
