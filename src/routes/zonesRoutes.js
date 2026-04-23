const { Hono } = require('hono');
const zonesController   = require('../controllers/zonesController');
const devicesController = require('../controllers/devicesController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole }       = require('../middleware/roles');

const zones = new Hono();

// Todas las rutas requieren autenticación
zones.use('/*', authenticateToken);

// ─── Zonas ────────────────────────────────────────────────────
zones.get('/',     zonesController.listZones);
zones.get('/:id',  zonesController.getZone);
zones.post('/',    requireRole('admin'), zonesController.createZone);
zones.put('/:id',  requireRole('admin'), zonesController.updateZone);
zones.delete('/:id', requireRole('admin'), zonesController.deleteZone);

// ─── Dispositivos ─────────────────────────────────────────────
// Montados bajo /api/zones para mantener coherencia REST
// pero también accesibles desde /api/devices (ver server.js)

module.exports = zones;
