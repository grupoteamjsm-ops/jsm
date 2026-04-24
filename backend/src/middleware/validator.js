const { zValidator } = require('@hono/zod-validator');
const { z } = require('zod');

// ─── Schemas Zod ─────────────────────────────────────────────

const authSchema = z.object({
  email:    z.string().email('El email no es válido').toLowerCase(),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  nombre:   z.string().min(1).optional(),
  rol:      z.enum(['admin', 'operador', 'viewer']).optional()
});

const changePasswordSchema = z.object({
  password_actual: z.string().min(1, 'La contraseña actual es obligatoria'),
  password_nueva:  z.string().min(6, 'La contraseña nueva debe tener al menos 6 caracteres')
});

const sensorDataSchema = z.object({
  device_id:    z.string().min(1, 'device_id es obligatorio'),
  zone:         z.string().min(1, 'zone es obligatorio'),
  people_count: z.number().int().min(0).optional().default(0),
  movement:     z.boolean().optional().default(false),
  timestamp:    z.string().datetime().optional()
});

const energyActionSchema = z.object({
  action:      z.enum(['turn_on', 'turn_off', 'adjust']),
  zone:        z.string().min(1, 'zone es obligatorio'),
  device_type: z.enum(['lighting', 'ventilation', 'climate']),
  value:       z.number().int().min(0).max(100).optional(),
  reason:      z.string().optional()
});

// ─── Validadores Hono ─────────────────────────────────────────

/**
 * Respuesta de error de validación uniforme
 */
const validationErrorHandler = (result, c) => {
  if (!result.success) {
    return c.json({
      error:   'Datos de entrada inválidos',
      details: result.error.errors.map(e => ({
        field:   e.path.join('.'),
        message: e.message
      }))
    }, 400);
  }
};

const validateAuth          = zValidator('json', authSchema,          validationErrorHandler);
const validateChangePassword = zValidator('json', changePasswordSchema, validationErrorHandler);
const validateSensorData    = zValidator('json', sensorDataSchema,    validationErrorHandler);
const validateEnergyAction  = zValidator('json', energyActionSchema,  validationErrorHandler);

module.exports = {
  validateAuth,
  validateChangePassword,
  validateSensorData,
  validateEnergyAction,
  // Schemas exportados por si se necesitan en otros sitios
  authSchema,
  sensorDataSchema,
  energyActionSchema
};
