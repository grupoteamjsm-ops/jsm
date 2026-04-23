const { Hono } = require('hono');
const usersController = require('../controllers/usersController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole }       = require('../middleware/roles');

const users = new Hono();

// Todas las rutas requieren autenticación + rol admin
users.use('/*', authenticateToken, requireRole('admin'));

users.get('/',                      usersController.listUsers);
users.get('/:id',                   usersController.getUser);
users.put('/:id',                   usersController.updateUser);
users.delete('/:id',                usersController.deleteUser);
users.post('/:id/reset-password',   usersController.resetPassword);

module.exports = users;
