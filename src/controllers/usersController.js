const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const SALT_ROUNDS = 12;

/**
 * GET /api/users
 * Listar todos los usuarios  [solo admin]
 * Query: ?rol= &activo=
 */
const listUsers = async (c) => {
  try {
    const rol    = c.req.query('rol');
    const activo = c.req.query('activo');

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (rol)    { conditions.push(`rol = $${idx++}`);    params.push(rol); }
    if (activo !== undefined) { conditions.push(`activo = $${idx++}`); params.push(activo === 'true'); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT id, nombre, email, rol, activo, creado_en, ultimo_login
       FROM usuarios ${where} ORDER BY creado_en DESC`,
      params
    );
    return c.json({ success: true, users: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Error listing users:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

/**
 * GET /api/users/:id
 * Obtener un usuario por ID  [solo admin]
 */
const getUser = async (c) => {
  try {
    const id = c.req.param('id');
    const result = await query(
      'SELECT id, nombre, email, rol, activo, creado_en, ultimo_login FROM usuarios WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) return c.json({ error: 'Usuario no encontrado' }, 404);
    return c.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error getting user:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

/**
 * PUT /api/users/:id
 * Actualizar usuario  [solo admin]
 * Body: { nombre?, rol?, activo? }
 * No permite cambiar email ni contraseña desde aquí
 */
const updateUser = async (c) => {
  try {
    const id = c.req.param('id');
    const { nombre, rol, activo } = await c.req.json();

    const fields = [];
    const params = [];
    let   idx    = 1;

    if (nombre !== undefined) { fields.push(`nombre = $${idx++}`); params.push(nombre); }
    if (rol    !== undefined) {
      const rolesValidos = ['admin', 'operador', 'viewer'];
      if (!rolesValidos.includes(rol)) {
        return c.json({ error: `Rol inválido. Valores permitidos: ${rolesValidos.join(', ')}` }, 400);
      }
      fields.push(`rol = $${idx++}`);
      params.push(rol);
    }
    if (activo !== undefined) { fields.push(`activo = $${idx++}`); params.push(activo); }

    if (fields.length === 0) return c.json({ error: 'No hay campos para actualizar' }, 400);

    // Evitar que un admin se quite sus propios permisos
    const currentUser = c.get('user');
    if (currentUser.id === id && rol && rol !== 'admin') {
      return c.json({ error: 'No puedes cambiar tu propio rol de admin' }, 403);
    }

    params.push(id);
    const result = await query(
      `UPDATE usuarios SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, nombre, email, rol, activo`,
      params
    );

    if (result.rows.length === 0) return c.json({ error: 'Usuario no encontrado' }, 404);
    return c.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error updating user:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

/**
 * DELETE /api/users/:id
 * Desactivar usuario (soft delete)  [solo admin]
 */
const deleteUser = async (c) => {
  try {
    const id          = c.req.param('id');
    const currentUser = c.get('user');

    if (currentUser.id === id) {
      return c.json({ error: 'No puedes desactivar tu propia cuenta' }, 403);
    }

    const result = await query(
      `UPDATE usuarios SET activo = FALSE WHERE id = $1
       RETURNING id, nombre, email`,
      [id]
    );

    if (result.rows.length === 0) return c.json({ error: 'Usuario no encontrado' }, 404);

    // Revocar todos sus tokens
    await query('UPDATE refresh_tokens SET revocado = TRUE WHERE usuario_id = $1', [id]);

    return c.json({ success: true, message: `Usuario "${result.rows[0].email}" desactivado` });
  } catch (error) {
    console.error('Error deleting user:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

/**
 * POST /api/users/:id/reset-password
 * Resetear contraseña de un usuario  [solo admin]
 * Body: { nueva_password }
 */
const resetPassword = async (c) => {
  try {
    const id = c.req.param('id');
    const { nueva_password } = await c.req.json();

    if (!nueva_password || nueva_password.length < 6) {
      return c.json({ error: 'La contraseña debe tener al menos 6 caracteres' }, 400);
    }

    const hash = await bcrypt.hash(nueva_password, SALT_ROUNDS);

    const result = await query(
      'UPDATE usuarios SET password_hash = $1 WHERE id = $2 RETURNING id, email',
      [hash, id]
    );

    if (result.rows.length === 0) return c.json({ error: 'Usuario no encontrado' }, 404);

    // Revocar todos los tokens del usuario
    await query('UPDATE refresh_tokens SET revocado = TRUE WHERE usuario_id = $1', [id]);

    return c.json({ success: true, message: `Contraseña reseteada para ${result.rows[0].email}` });
  } catch (error) {
    console.error('Error resetting password:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

module.exports = { listUsers, getUser, updateUser, deleteUser, resetPassword };
