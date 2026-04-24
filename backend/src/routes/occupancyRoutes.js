const { Hono } = require('hono');
const occupancyController  = require('../controllers/occupancyController');
const predictionController = require('../controllers/predictionController');
const { authenticateToken } = require('../middleware/auth');

const occupancy = new Hono();

occupancy.use('/*', authenticateToken);

occupancy.get('/current',       occupancyController.getCurrentOccupancy);
occupancy.get('/by-zone',       occupancyController.getOccupancyByZone);
occupancy.get('/by-hour',       occupancyController.getOccupancyByHour);
occupancy.get('/history',       occupancyController.getOccupancyHistory);
occupancy.get('/stats',         occupancyController.getOccupancyStats);
occupancy.get('/annual',        occupancyController.getAnnualHistory);
occupancy.get('/predict',       predictionController.predict);
occupancy.get('/predict/next24h', predictionController.predictNext24h);

module.exports = occupancy;
