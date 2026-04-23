const { query } = require('../config/database');

const getCurrentOccupancy = async (c) => {
  try {
    const zone = c.req.query('zone');
    const params = [];
    let sql = `
      SELECT zone, SUM(people_count) AS people_count, BOOL_OR(movement) AS movement,
             COUNT(*) AS sensors_active, MAX(timestamp) AS last_update
      FROM (
        SELECT DISTINCT ON (device_id) device_id, zone, people_count, movement, timestamp
        FROM sensor_data ORDER BY device_id, timestamp DESC
      ) latest
    `;
    if (zone) { sql += ' WHERE zone = $1'; params.push(zone); }
    sql += ' GROUP BY zone ORDER BY zone';

    const result = await query(sql, params);
    return c.json({ success: true, occupancy: result.rows, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error getting current occupancy:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

const getOccupancyHistory = async (c) => {
  try {
    const zone      = c.req.query('zone');
    const device_id = c.req.query('device_id');
    const from      = c.req.query('from');
    const to        = c.req.query('to');
    const limit     = parseInt(c.req.query('limit')  || '100');
    const offset    = parseInt(c.req.query('offset') || '0');

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (zone)      { conditions.push(`zone = $${idx++}`);      params.push(zone); }
    if (device_id) { conditions.push(`device_id = $${idx++}`); params.push(device_id); }
    if (from)      { conditions.push(`timestamp >= $${idx++}`); params.push(new Date(from)); }
    if (to)        { conditions.push(`timestamp <= $${idx++}`); params.push(new Date(to)); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [dataResult, countResult] = await Promise.all([
      query(`SELECT * FROM sensor_data ${where} ORDER BY timestamp DESC LIMIT $${idx++} OFFSET $${idx++}`,
        [...params, limit, offset]),
      query(`SELECT COUNT(*) FROM sensor_data ${where}`, params)
    ]);

    return c.json({
      success: true,
      history: dataResult.rows,
      total:   parseInt(countResult.rows[0].count),
      limit, offset,
      filters: { zone, device_id, from, to },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting occupancy history:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

const getOccupancyStats = async (c) => {
  try {
    const zone = c.req.query('zone');
    const from = c.req.query('from');
    const to   = c.req.query('to');

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (zone) { conditions.push(`zone = $${idx++}`); params.push(zone); }
    if (from) { conditions.push(`timestamp >= $${idx++}`); params.push(new Date(from)); }
    if (to)   { conditions.push(`timestamp <= $${idx++}`); params.push(new Date(to)); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT zone, COUNT(*) AS total_lecturas, SUM(people_count) AS total_personas,
              ROUND(AVG(people_count)::numeric, 2) AS media_personas,
              MAX(people_count) AS max_personas,
              SUM(CASE WHEN movement THEN 1 ELSE 0 END) AS lecturas_con_movimiento,
              MIN(timestamp) AS primera_lectura, MAX(timestamp) AS ultima_lectura,
              COUNT(DISTINCT device_id) AS sensores_distintos
       FROM sensor_data ${where} GROUP BY zone ORDER BY zone`,
      params
    );

    return c.json({ success: true, data: { zones: result.rows, filters: { zone, from, to }, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('Error getting occupancy stats:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

const getOccupancyByHour = async (c) => {
  try {
    const zone = c.req.query('zone');
    const from = c.req.query('from');
    const to   = c.req.query('to');

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (zone) { conditions.push(`zone = $${idx++}`); params.push(zone); }
    if (from) { conditions.push(`timestamp >= $${idx++}`); params.push(new Date(from)); }
    if (to)   { conditions.push(`timestamp <= $${idx++}`); params.push(new Date(to)); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT EXTRACT(HOUR FROM timestamp)::integer AS hora, zone,
              ROUND(AVG(people_count)::numeric, 2) AS media_personas,
              MAX(people_count) AS max_personas, COUNT(*) AS total_lecturas,
              SUM(CASE WHEN movement THEN 1 ELSE 0 END) AS lecturas_con_movimiento
       FROM sensor_data ${where} GROUP BY hora, zone ORDER BY zone, hora`,
      params
    );

    return c.json({ success: true, data: { by_hour: result.rows, filters: { zone, from, to }, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('Error getting occupancy by hour:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

const getOccupancyByZone = async (c) => {
  try {
    const result = await query(
      `SELECT z.zone, z.people_count AS ocupacion_actual, z.sensors_active, z.last_update,
              COALESCE(s.media_hoy, 0) AS media_hoy, COALESCE(s.max_hoy, 0) AS max_hoy,
              COALESCE(s.lecturas_hoy, 0) AS lecturas_hoy,
              COALESCE(ess.lighting_status, 'off') AS iluminacion,
              COALESCE(ess.climate_status, 'off') AS climatizacion,
              COALESCE(ess.ventilation_status, 'off') AS ventilacion
       FROM (
         SELECT zone, SUM(people_count) AS people_count, COUNT(*) AS sensors_active, MAX(timestamp) AS last_update
         FROM (SELECT DISTINCT ON (device_id) device_id, zone, people_count, timestamp
               FROM sensor_data ORDER BY device_id, timestamp DESC) latest
         GROUP BY zone
       ) z
       LEFT JOIN (
         SELECT zone, ROUND(AVG(people_count)::numeric, 2) AS media_hoy,
                MAX(people_count) AS max_hoy, COUNT(*) AS lecturas_hoy
         FROM sensor_data WHERE timestamp >= CURRENT_DATE GROUP BY zone
       ) s ON z.zone = s.zone
       LEFT JOIN (
         SELECT zone,
                MAX(CASE WHEN device_type = 'lighting'    THEN status END) AS lighting_status,
                MAX(CASE WHEN device_type = 'climate'     THEN status END) AS climate_status,
                MAX(CASE WHEN device_type = 'ventilation' THEN status END) AS ventilation_status
         FROM energy_system_status GROUP BY zone
       ) ess ON z.zone = ess.zone
       ORDER BY z.zone`
    );

    return c.json({ success: true, data: { zones: result.rows, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('Error getting occupancy by zone:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

module.exports = { getCurrentOccupancy, getOccupancyHistory, getOccupancyStats, getOccupancyByHour, getOccupancyByZone };
