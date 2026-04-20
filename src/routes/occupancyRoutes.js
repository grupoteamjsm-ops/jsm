const express = require('express');
const router = express.Router();
const occupancyController = require('../controllers/occupancyController');
const { validateQueryParams } = require('../middleware/validator');

// GET /api/occupancy/current - Ocupación actual por zona
router.get('/current', validateQueryParams, occupancyController.getCurrentOccupancy);

// GET /api/occupancy/history - Historial de ocupación
router.get('/history', validateQueryParams, occupancyController.getOccupancyHistory);

// GET /api/occupancy/stats - Estadísticas de ocupación
router.get('/stats', validateQueryParams, occupancyController.getOccupancyStats);

module.exports = router;
