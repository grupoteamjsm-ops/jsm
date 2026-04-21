const express = require('express');
const router = express.Router();
const energyController = require('../controllers/energyController');
const { validateEnergyAction, validateQueryParams } = require('../middleware/validator');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// Todas las rutas de energía requieren autenticación
router.use(authenticateToken);

// POST /api/energy/actions — solo admin y operador pueden ejecutar acciones
router.post('/actions', requireRole('admin', 'operador'), validateEnergyAction, energyController.executeEnergyAction);

// GET /api/energy/status — cualquier usuario autenticado puede ver el estado
router.get('/status', validateQueryParams, energyController.getEnergyStatus);

// GET /api/energy/consumption — historial de consumo
router.get('/consumption', validateQueryParams, energyController.getConsumptionData);

module.exports = router;
