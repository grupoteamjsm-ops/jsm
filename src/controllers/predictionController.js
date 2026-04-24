const { predecirOcupacion, predecirProximas24h } = require('../services/predictionService');
const logger = require('../utils/logger');

/**
 * GET /api/occupancy/predict
 * Predecir ocupación basada en historial
 * Query: ?zone= &hora= &dia_semana=
 */
const predict = async (c) => {
  try {
    const zone      = c.req.query('zone');
    const hora      = c.req.query('hora')      !== undefined ? parseInt(c.req.query('hora'))      : null;
    const diaSemana = c.req.query('dia_semana') !== undefined ? parseInt(c.req.query('dia_semana')) : null;

    if (!zone) {
      return c.json({ error: 'El parámetro zone es obligatorio' }, 400);
    }

    if (hora !== null && (hora < 0 || hora > 23)) {
      return c.json({ error: 'hora debe estar entre 0 y 23' }, 400);
    }

    if (diaSemana !== null && (diaSemana < 0 || diaSemana > 6)) {
      return c.json({ error: 'dia_semana debe estar entre 0 (Domingo) y 6 (Sábado)' }, 400);
    }

    const predicciones = await predecirOcupacion(zone, hora, diaSemana);

    if (!predicciones || predicciones.length === 0) {
      return c.json({
        error:   'Sin datos históricos suficientes para predecir',
        message: `No hay lecturas registradas para la zona "${zone}" con los filtros indicados. Se necesitan al menos 3 lecturas.`
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        predicciones,
        zona:      zone,
        filtros:   { hora, dia_semana: diaSemana },
        nota:      'Predicción basada en regresión estadística sobre datos históricos reales',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en predict');
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

/**
 * GET /api/occupancy/predict/next24h
 * Predicción para las próximas 24 horas basada en el día actual
 * Query: ?zone=
 */
const predictNext24h = async (c) => {
  try {
    const zone = c.req.query('zone');

    if (!zone) {
      return c.json({ error: 'El parámetro zone es obligatorio' }, 400);
    }

    const prediccion = await predecirProximas24h(zone);

    if (!prediccion || prediccion.length === 0) {
      return c.json({
        error:   'Sin datos históricos suficientes',
        message: `No hay datos para la zona "${zone}" en el día de la semana actual.`
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        zona:        zone,
        dia_actual:  ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][new Date().getDay()],
        prediccion,
        timestamp:   new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error en predictNext24h');
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

module.exports = { predict, predictNext24h };
