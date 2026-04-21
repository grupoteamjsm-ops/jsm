const { query } = require('../config/database');

/**
 * GET /api/occupancy/current
 * Ocupación actual por zona — último registro de cada sensor
 * Query: ?zone=
 */
const getCurrentOccupancy = async (req, res) => {
  try {
    const { zone } = req.query;

    let sql = `
      SELECT
        zone,
        SUM(people_count)                    AS people_count,
        BOOL_OR(movement)                    AS movement,
        COUNT(*)                             AS sensors_active,
        MAX(timestamp)                       AS last_update
      FROM (
        SELECT DISTINCT ON (device_id)
          device_id, zone, people_count, movement, timestamp
        FROM sensor_data
        ORDER BY device_id, timestamp DESC
      ) latest
    `;
    const params = [];

    if (zone) {
      sql += ' WHERE zone = $1';
      params.push(zone);
    }

    sql += ' GROUP BY zone ORDER BY zone';

    const result = await query(sql, params);

    res.json({
      success: true,
      occupancy: result.rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting current occupancy:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/occupancy/history
 * Historial paginado con filtros
 * Query: ?zone= &device_id= &from= &to= &limit= &offset=
 */
const getOccupancyHistory = async (req, res) => {
  try {
    const {
      zone,
      device_id,
      from,
      to,
      limit  = 100,
      offset = 0
    } = req.query;

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (zone)      { conditions.push(`zone = $${idx++}`);      params.push(zone); }
    if (device_id) { conditions.push(`device_id = $${idx++}`); params.push(device_id); }
    if (from)      { conditions.push(`timestamp >= $${idx++}`); params.push(new Date(from)); }
    if (to)        { conditions.push(`timestamp <= $${idx++}`); params.push(new Date(to)); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataResult, countResult] = await Promise.all([
      query(
        `SELECT * FROM sensor_data ${where}
         ORDER BY timestamp DESC
         LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, parseInt(limit), parseInt(offset)]
      ),
      query(
        `SELECT COUNT(*) FROM sensor_data ${where}`,
        params
      )
    ]);

    res.json({
      success: true,
      history: dataResult.rows,
      total:   parseInt(countResult.rows[0].count),
      limit:   parseInt(limit),
      offset:  parseInt(offset),
      filters: { zone, device_id, from, to },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting occupancy history:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/occupancy/stats
 * Estadísticas agregadas por zona
 * Query: ?zone= &from= &to=
 */
const getOccupancyStats = async (req, res) => {
  try {
    const { zone, from, to } = req.query;

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (zone) { conditions.push(`zone = $${idx++}`); params.push(zone); }
    if (from) { conditions.push(`timestamp >= $${idx++}`); params.push(new Date(from)); }
    if (to)   { conditions.push(`timestamp <= $${idx++}`); params.push(new Date(to)); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT
         zone,
         COUNT(*)                                          AS total_lecturas,
         SUM(people_count)                                 AS total_personas,
         ROUND(AVG(people_count)::numeric, 2)              AS media_personas,
         MAX(people_count)                                 AS max_personas,
         SUM(CASE WHEN movement THEN 1 ELSE 0 END)         AS lecturas_con_movimiento,
         MIN(timestamp)                                    AS primera_lectura,
         MAX(timestamp)                                    AS ultima_lectura,
         COUNT(DISTINCT device_id)                         AS sensores_distintos
       FROM sensor_data
       ${where}
       GROUP BY zone
       ORDER BY zone`,
      params
    );

    res.json({
      success: true,
      data: {
        zones:     result.rows,
        filters:   { zone, from, to },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting occupancy stats:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/occupancy/by-hour
 * Ocupación media agrupada por hora del día (0-23)
 * Útil para ver patrones de uso: cuándo hay más gente
 * Query: ?zone= &from= &to=
 */
const getOccupancyByHour = async (req, res) => {
  try {
    const { zone, from, to } = req.query;

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (zone) { conditions.push(`zone = $${idx++}`); params.push(zone); }
    if (from) { conditions.push(`timestamp >= $${idx++}`); params.push(new Date(from)); }
    if (to)   { conditions.push(`timestamp <= $${idx++}`); params.push(new Date(to)); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT
         EXTRACT(HOUR FROM timestamp)::integer          AS hora,
         zone,
         ROUND(AVG(people_count)::numeric, 2)           AS media_personas,
         MAX(people_count)                              AS max_personas,
         COUNT(*)                                       AS total_lecturas,
         SUM(CASE WHEN movement THEN 1 ELSE 0 END)      AS lecturas_con_movimiento
       FROM sensor_data
       ${where}
       GROUP BY hora, zone
       ORDER BY zone, hora`,
      params
    );

    res.json({
      success: true,
      data: {
        by_hour:   result.rows,
        filters:   { zone, from, to },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting occupancy by hour:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

/**
 * GET /api/occupancy/by-zone
 * Resumen comparativo de todas las zonas
 * Muestra ocupación actual + estadísticas del día
 */
const getOccupancyByZone = async (req, res) => {
  try {
    const result = await query(
      `SELECT
         z.zone,
         z.people_count                                   AS ocupacion_actual,
         z.sensors_active,
         z.last_update,
         COALESCE(s.media_hoy, 0)                         AS media_hoy,
         COALESCE(s.max_hoy, 0)                           AS max_hoy,
         COALESCE(s.lecturas_hoy, 0)                      AS lecturas_hoy,
         COALESCE(ess.lighting_status, 'off')             AS iluminacion,
         COALESCE(ess.climate_status, 'off')              AS climatizacion,
         COALESCE(ess.ventilation_status, 'off')          AS ventilacion
       FROM (
         -- Ocupación actual por zona
         SELECT
           zone,
           SUM(people_count) AS people_count,
           COUNT(*)          AS sensors_active,
           MAX(timestamp)    AS last_update
         FROM (
           SELECT DISTINCT ON (device_id)
             device_id, zone, people_count, timestamp
           FROM sensor_data
           ORDER BY device_id, timestamp DESC
         ) latest
         GROUP BY zone
       ) z
       LEFT JOIN (
         -- Estadísticas del día actual
         SELECT
           zone,
           ROUND(AVG(people_count)::numeric, 2) AS media_hoy,
           MAX(people_count)                    AS max_hoy,
           COUNT(*)                             AS lecturas_hoy
         FROM sensor_data
         WHERE timestamp >= CURRENT_DATE
         GROUP BY zone
       ) s ON z.zone = s.zone
       LEFT JOIN (
         -- Estado energético actual por zona (pivot)
         SELECT
           zone,
           MAX(CASE WHEN device_type = 'lighting'    THEN status END) AS lighting_status,
           MAX(CASE WHEN device_type = 'climate'     THEN status END) AS climate_status,
           MAX(CASE WHEN device_type = 'ventilation' THEN status END) AS ventilation_status
         FROM energy_system_status
         GROUP BY zone
       ) ess ON z.zone = ess.zone
       ORDER BY z.zone`
    );

    res.json({
      success: true,
      data: {
        zones:     result.rows,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting occupancy by zone:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getCurrentOccupancy,
  getOccupancyHistory,
  getOccupancyStats,
  getOccupancyByHour,
  getOccupancyByZone
};
