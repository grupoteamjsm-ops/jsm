const { Hono } = require('hono');
const devicesController = require('../controllers/devicesController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole }       = require('../middleware/roles');

const devices = new Hono();

// Todas las rutas requieren autenticación
devices.use('/*', authenticateToken);

devices.get('/',              devicesController.listDevices);
devices.get('/:deviceId',     devicesController.getDevice);
devices.put('/:deviceId',     requireRole('admin', 'operador'), devicesController.updateDevice);
devices.delete('/:deviceId',  requireRole('admin'), devicesController.deleteDevice);

module.exports = devices;
