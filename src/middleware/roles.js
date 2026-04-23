/**
 * Middleware de control de roles para Hono
 * Uso: app.use('/ruta', authenticateToken, requireRole('admin'))
 */
const requireRole = (...rolesPermitidos) => {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      return c.json({ error: 'No autenticado' }, 401);
    }

    if (!rolesPermitidos.includes(user.rol)) {
      return c.json({
        error: `Acceso denegado. Se requiere rol: ${rolesPermitidos.join(' o ')}`
      }, 403);
    }

    await next();
  };
};

module.exports = { requireRole };
