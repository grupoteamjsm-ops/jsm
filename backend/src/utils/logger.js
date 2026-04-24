const pino = require('pino');

const isProd = process.env.NODE_ENV === 'production';

/**
 * Logger estructurado con Pino
 *
 * Desarrollo: salida legible con pino-pretty (colores, formato humano)
 * Producción: salida JSON (para enviar a servicios de logs: Datadog, Loki, CloudWatch...)
 */
const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),

  // En producción: JSON puro para ingestión por servicios de logs
  // En desarrollo: formato legible
  transport: isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: {
          colorize:        true,
          translateTime:   'SYS:HH:MM:ss',
          ignore:          'pid,hostname',
          messageFormat:   '{msg}',
          levelFirst:      true
        }
      },

  // Campos base en todos los logs
  base: {
    service: 'iot-occupancy-backend',
    env:     process.env.NODE_ENV || 'development'
  },

  // Serializar errores correctamente
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url:    req.url,
      ip:     req.headers?.['x-forwarded-for'] || req.remoteAddress
    })
  }
});

module.exports = logger;
