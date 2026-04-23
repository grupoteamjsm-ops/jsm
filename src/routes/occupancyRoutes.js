const { Hono } = require('hono');
const occupancyController = require('../controllers/occupancyController');
const { authenticateToken } = require('../middleware/auth');

const occupancy = new Hono();

// Todas las rutas requieren JWT
occupancy.use('/*', authenticateToken);

occupancy.get('/current',  occupancyController.getCurrentOccupancy);
occupancy.get('/by-zone',  occupancyController.getOccupancyByZone);
occupancy.get('/by-hour',  occupancyController.getOccupancyByHour);
occupancy.get('/history',  occupancyController.getOccupancyHistory);
occupancy.get('/stats',    occupancyController.getOccupancyStats);

module.exports = occupancy;
