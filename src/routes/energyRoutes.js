const { Hono } = require('hono');
const energyController = require('../controllers/energyController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { validateEnergyAction } = require('../middleware/validator');

const energy = new Hono();

// Todas las rutas requieren JWT
energy.use('/*', authenticateToken);

// Acciones solo para admin y operador
energy.post('/actions',    requireRole('admin', 'operador'), validateEnergyAction, energyController.executeEnergyAction);
energy.get('/status',      energyController.getEnergyStatus);
energy.get('/consumption', energyController.getConsumptionData);

module.exports = energy;
