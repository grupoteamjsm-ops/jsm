const { query } = require('../config/database');
const logger    = require('../utils/logger');

/**
 * Servicio de predicción de ocupación
 *
 * Implementa regresión estadística simple sobre datos históricos reales.
 * No requiere librerías de ML externas — usa SQL para agregar y calcular.
 *
 * Algoritmo:
 * 1. Agrupa el historial por (zona, hora, día_semana)
 * 2. Calcula media, desviación estándar y número de muestras
 * 3. Determina el nivel de confianza según el número de muestras
 * 4. Devuelve la predicción con intervalo de confianza
 *
 * Mejora futura: sustituir por modelo ML (TensorFlow.js, Python microservice)
 * cuando haya suficientes datos históricos (>6 meses)
 */

const MIN_SAMPLES_ALTA   = 30; // >= 30 muestras → confianza alta
const MIN_SAMPLES_MEDIA  = 10; // >= 10 muestras → confianza media
const MIN_SAMPLES_BAJA   = 3;  // >= 3 muestras  → confianza baja

/**
 * Predecir ocupación para una zona, hora y día de la semana
 *
 * @param {string}  zone       - Zona a predecir
 * @param {number}  hora       - Hora del día (0-23), null = todas las horas
 * @param {number}  diaSemana  - Día de la semana (0=Dom, 1=Lun...), null = todos
 * @returns {Array} predicciones
 */
const predecirOcupacion = async (zone, hora = null, diaSemana = null) => {
  try {
    // Construir filtros
    const conditions = [`zone = $1`];
    const params     = [zone];
    let   idx        = 2;

    if (hora       !== null) { conditions.push(`EXTRACT(HOUR FROM timestamp)::integer = $${idx++}`);       params.push(hora); }
    if (diaSemana  !== null) { conditions.push(`EXTRACT(DOW  FROM timestamp)::integer = $${idx++}`);       params.push(diaSemana); }

    const where = `WHERE ${conditions.join(' AND ')}`;

    // Consultar historial completo (activo + archivo)
    const result = await query(
      `SELECT
         zone,
         EXTRACT(HOUR FROM timestamp)::integer     AS hora,
         EXTRACT(DOW  FROM timestamp)::integer     AS dia_semana,
         COUNT(*)                                  AS muestras,
         ROUND(AVG(people_count)::numeric, 2)      AS media,
         ROUND(STDDEV(people_count)::numeric, 2)   AS desviacion,
         MAX(people_count)                         AS maximo,
         MIN(people_count)                         AS minimo,
         SUM(CASE WHEN movement THEN 1 ELSE 0 END)::float / COUNT(*) AS prob_movimiento
       FROM (
         SELECT zone, timestamp, people_count, movement FROM sensor_data
         UNION ALL
         SELECT zone, timestamp, people_count, movement FROM sensor_data_archive
       ) all_data
       ${where}
       GROUP BY zone, hora, dia_semana
       ORDER BY dia_semana, hora`,
      params
    );

    if (result.rows.length === 0) {
      return null; // Sin datos suficientes
    }

    // Calcular predicciones con nivel de confianza
    const predicciones = result.rows.map(row => {
      const muestras = parseInt(row.muestras);
      let confianza;

      if (muestras >= MIN_SAMPLES_ALTA)  confianza = 'alta';
      else if (muestras >= MIN_SAMPLES_MEDIA) confianza = 'media';
      else if (muestras >= MIN_SAMPLES_BAJA)  confianza = 'baja';
      else confianza = 'insuficiente';

      const media      = parseFloat(row.media) || 0;
      const desviacion = parseFloat(row.desviacion) || 0;

      return {
        zone:                row.zone,
        hora:                parseInt(row.hora),
        dia_semana:          parseInt(row.dia_semana),
        dia_nombre:          ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][parseInt(row.dia_semana)],
        ocupacion_prevista:  Math.round(media * 10) / 10,
        intervalo_min:       Math.max(0, Math.round((media - desviacion) * 10) / 10),
        intervalo_max:       Math.round((media + desviacion) * 10) / 10,
        maximo_historico:    parseInt(row.maximo),
        prob_movimiento:     Math.round(parseFloat(row.prob_movimiento) * 100),
        confianza,
        basado_en_lecturas:  muestras
      };
    });

    return predicciones;
  } catch (error) {
    logger.error({ err: error }, '[Prediction] Error calculando predicción');
    throw error;
  }
};

/**
 * Obtener resumen de predicción para las próximas 24 horas
 * Basado en el día de la semana actual
 */
const predecirProximas24h = async (zone) => {
  const ahora      = new Date();
  const horaActual = ahora.getHours();
  const diaSemana  = ahora.getDay();

  try {
    const result = await query(
      `SELECT
         zone,
         EXTRACT(HOUR FROM timestamp)::integer     AS hora,
         ROUND(AVG(people_count)::numeric, 2)      AS media,
         COUNT(*)                                  AS muestras,
         MAX(people_count)                         AS maximo
       FROM (
         SELECT zone, timestamp, people_count FROM sensor_data
         UNION ALL
         SELECT zone, timestamp, people_count FROM sensor_data_archive
       ) all_data
       WHERE zone = $1
         AND EXTRACT(DOW FROM timestamp)::integer = $2
         AND EXTRACT(HOUR FROM timestamp)::integer >= $3
       GROUP BY zone, hora
       ORDER BY hora`,
      [zone, diaSemana, horaActual]
    );

    return result.rows.map(row => ({
      hora:               parseInt(row.hora),
      ocupacion_prevista: parseFloat(row.media) || 0,
      maximo_historico:   parseInt(row.maximo),
      basado_en_lecturas: parseInt(row.muestras)
    }));
  } catch (error) {
    logger.error({ err: error }, '[Prediction] Error en predicción 24h');
    throw error;
  }
};

module.exports = { predecirOcupacion, predecirProximas24h };
