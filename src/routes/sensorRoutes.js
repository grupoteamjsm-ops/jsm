const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensorController');
const { validateSensorData, validateQueryParams } = require('../middleware/validator');

// POST /api/sensors/data - Recibir datos de sensores
router.post('/data', validateSensorData, sensorController.receiveSensorData);

// GET /api/sensors/:deviceId - Obtener estado de un sensor
router.get('/:deviceId', sensorController.getSensorStatus);

// GET /api/sensors - Listar todos los sensores
router.get('/', validateQueryParams, sensorController.listSensors);

module.exports = router;
