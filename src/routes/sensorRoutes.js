const { Hono } = require('hono');
const sensorController = require('../controllers/sensorController');
const { authenticateToken } = require('../middleware/auth');
const { authenticateApiKey } = require('../middleware/apiKey');
const { validateSensorData } = require('../middleware/validator');

const sensors = new Hono();

// Arduino envía datos con API Key
sensors.post('/data',       authenticateApiKey, validateSensorData, sensorController.receiveSensorData);

// Consultas requieren JWT
sensors.get('/',            authenticateToken, sensorController.listSensors);
sensors.get('/:deviceId',   authenticateToken, sensorController.getSensorStatus);

module.exports = sensors;
