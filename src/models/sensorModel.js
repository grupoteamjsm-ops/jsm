/**
 * Modelo de sensor para validación de datos
 */
const validateSensorData = (data) => {
  const errors = [];

  if (!data.device_id || typeof data.device_id !== 'string') {
    errors.push('device_id is required and must be a string');
  }

  if (!data.zone || typeof data.zone !== 'string') {
    errors.push('zone is required and must be a string');
  }

  if (data.people_count !== undefined && (typeof data.people_count !== 'number' || data.people_count < 0)) {
    errors.push('people_count must be a non-negative number');
  }

  if (data.movement !== undefined && typeof data.movement !== 'boolean') {
    errors.push('movement must be a boolean');
  }

  if (data.timestamp !== undefined) {
    const date = new Date(data.timestamp);
    if (isNaN(date.getTime())) {
      errors.push('timestamp must be a valid ISO 8601 date string');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Normalizar datos del sensor
 */
const normalizeSensorData = (data) => {
  return {
    device_id: data.device_id,
    timestamp: data.timestamp || new Date().toISOString(),
    people_count: typeof data.people_count === 'number' ? data.people_count : 0,
    movement: typeof data.movement === 'boolean' ? data.movement : false,
    zone: data.zone
  };
};

module.exports = {
  validateSensorData,
  normalizeSensorData
};
