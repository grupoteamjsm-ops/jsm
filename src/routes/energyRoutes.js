const express = require('express');
const router = express.Router();
const energyController = require('../controllers/energyController');
const { validateEnergyAction, validateQueryParams } = require('../middleware/validator');

// POST /api/energy/actions - Ejecutar acción energética
router.post('/actions', validateEnergyAction, energyController.executeEnergyAction);

// GET /api/energy/status - Estado actual de sistemas energéticos
router.get('/status', validateQueryParams, energyController.getEnergyStatus);

// GET /api/energy/consumption - Consumo energético
router.get('/consumption', validateQueryParams, energyController.getConsumptionData);

module.exports = router;
