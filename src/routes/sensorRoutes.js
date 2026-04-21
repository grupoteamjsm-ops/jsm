const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const { validateSensorData, validateQueryParams } = require('../middleware/validator');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// POST /api/sensors/data — el Arduino envía datos (sin auth, usa API key en futuro)
router.post('/data', validateSensorData, sensorController.receiveSensorData);

// GET /api/sensors — requiere estar autenticado
router.get('/', authenticateToken, validateQueryParams, sensorController.listSensors);

// GET /api/sensors/:deviceId — requiere estar autenticado
router.get('/:deviceId', authenticateToken, sensorController.getSensorStatus);

module.exports = router;
