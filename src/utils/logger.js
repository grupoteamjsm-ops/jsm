/**
 * Servicio de logging centralizado
 */
const logger = {
  log: (message, level = 'INFO') => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
  },

  info: (message) => {
    logger.log(message, 'INFO');
  },

  warn: (message) => {
    logger.log(message, 'WARN');
  },

  error: (message, error = null) => {
    logger.log(message, 'ERROR');
    if (error) {
      console.error(error);
    }
  },

  sensorData: (data) => {
    logger.info(`Sensor data received: ${JSON.stringify(data)}`);
  },

  energyAction: (action) => {
    logger.info(`Energy action executed: ${JSON.stringify(action)}`);
  },

  decision: (decision) => {
    logger.info(`Decision made: ${JSON.stringify(decision)}`);
  }
};

module.exports = logger;
