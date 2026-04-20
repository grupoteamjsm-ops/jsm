const { body, query, param, validationResult } = require('express-validator');

/**
 * Middleware para manejar errores de validación
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

/**
 * Validaciones para registro y login
 */
const validateAuth = [
  body('email')
    .notEmpty().withMessage('El email es obligatorio')
    .isEmail().withMessage('El email no es válido')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('La contraseña es obligatoria')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  handleValidationErrors
];

/**
 * Validaciones para cambio de contraseña
 */
const validateChangePassword = [
  body('password_actual')
    .notEmpty().withMessage('La contraseña actual es obligatoria'),
  body('password_nueva')
    .notEmpty().withMessage('La contraseña nueva es obligatoria')
    .isLength({ min: 6 }).withMessage('La contraseña nueva debe tener al menos 6 caracteres'),
  handleValidationErrors
];

/**
 * Validaciones para datos de sensores
 */
const validateSensorData = [
  body('device_id')
    .notEmpty()
    .withMessage('device_id is required')
    .isString()
    .withMessage('device_id must be a string'),
  body('zone')
    .notEmpty()
    .withMessage('zone is required')
    .isString()
    .withMessage('zone must be a string'),
  body('people_count')
    .optional()
    .isInt({ min: 0 })
    .withMessage('people_count must be a non-negative integer'),
  body('movement')
    .optional()
    .isBoolean()
    .withMessage('movement must be a boolean'),
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('timestamp must be a valid ISO 8601 date'),
  handleValidationErrors
];

/**
 * Validaciones para acciones energéticas
 */
const validateEnergyAction = [
  body('action')
    .notEmpty()
    .withMessage('action is required')
    .isIn(['turn_on', 'turn_off', 'adjust'])
    .withMessage('action must be turn_on, turn_off, or adjust'),
  body('zone')
    .notEmpty()
    .withMessage('zone is required')
    .isString()
    .withMessage('zone must be a string'),
  body('device_type')
    .notEmpty()
    .withMessage('device_type is required')
    .isIn(['lighting', 'ventilation', 'climate'])
    .withMessage('device_type must be lighting, ventilation, or climate'),
  body('value')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('value must be between 0 and 100'),
  handleValidationErrors
];

/**
 * Validaciones para parámetros de consulta
 */
const validateQueryParams = [
  query('zone')
    .optional()
    .isString()
    .withMessage('zone must be a string'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('limit must be between 1 and 1000'),
  query('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('offset must be a non-negative integer'),
  handleValidationErrors
];

module.exports = {
  validateSensorData,
  validateEnergyAction,
  validateQueryParams,
  validateAuth,
  validateChangePassword,
  handleValidationErrors
};
