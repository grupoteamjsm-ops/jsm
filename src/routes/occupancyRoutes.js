const express = require('express');
const router = express.Router();
const occupancyController = require('../controllers/occupancyController');
const { validateQueryParams } = require('../middleware/validator');
const { authenticateToken } = require('../middleware/auth');

// Todas las rutas de ocupación requieren autenticación
router.use(authenticateToken);

// GET /api/occupancy/current — ocupación actual por zona
router.get('/current', validateQueryParams, occupancyController.getCurrentOccupancy);

// GET /api/occupancy/history — historial paginado con filtros de fecha/zona/sensor
router.get('/history', validateQueryParams, occupancyController.getOccupancyHistory);

// GET /api/occupancy/stats — estadísticas agregadas
router.get('/stats', validateQueryParams, occupancyController.getOccupancyStats);

// GET /api/occupancy/by-hour — ocupación media por hora del día
router.get('/by-hour', validateQueryParams, occupancyController.getOccupancyByHour);

// GET /api/occupancy/by-zone — resumen comparativo de todas las zonas
router.get('/by-zone', occupancyController.getOccupancyByZone);

module.exports = router;
