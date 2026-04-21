const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const { validateSensorData, validateQueryParams } = require('../middleware/validator');
const { authenticateToken } = require('../middleware/auth');
const { authenticateApiKey } = require('../middleware/apiKey');

// POST /api/sensors/data — Arduino envía datos con API Key
router.post('/data', authenticateApiKey, validateSensorData, sensorController.receiveSensorData);

// GET /api/sensors — requiere JWT
router.get('/', authenticateToken, validateQueryParams, sensorController.listSensors);

// GET /api/sensors/:deviceId — requiere JWT
router.get('/:deviceId', authenticateToken, sensorController.getSensorStatus);

module.exports = router;
