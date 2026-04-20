const { query } = require('../config/database');

/**
 * Ocupación actual por zona
 * Toma el último registro de cada sensor y agrupa por zona
 */
const getCurrentOccupancy = async (req, res) => {
  try {
    const { zone } = req.query;

    let sql = `
      SELECT
        zone,
        SUM(people_count)    AS people_count,
        BOOL_OR(movement)    AS movement,
        COUNT(*)             AS sensors_active,
        MAX(timestamp)       AS last_update
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

    let rows;
    try {
      const result = await query(sql, params);
      rows = result.rows;
    } catch {
      rows = [];
    }

    res.json({
      success: true,
      occupancy: rows,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting current occupancy:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Historial de ocupación con paginación
 */
const getOccupancyHistory = async (req, res) => {
  try {
    const { zone, limit = 100, offset = 0 } = req.query;

    let sql = 'SELECT * FROM sensor_data';
    const params = [];
    let idx = 1;

    if (zone) {
      sql += ` WHERE zone = $${idx++}`;
      params.push(zone);
    }

    sql += ` ORDER BY timestamp DESC LIMIT $${idx++} OFFSET $${idx++}`;
    params.push(parseInt(limit), parseInt(offset));

    // Total count
    let countSql = 'SELECT COUNT(*) FROM sensor_data';
    const countParams = [];
    if (zone) {
      countSql += ' WHERE zone = $1';
      countParams.push(zone);
    }

    let rows = [], total = 0;
    try {
      const [dataResult, countResult] = await Promise.all([
        query(sql, params),
        query(countSql, countParams)
      ]);
      rows = dataResult.rows;
      total = parseInt(countResult.rows[0].count);
    } catch {
      rows = [];
    }

    res.json({
      success: true,
      history: rows,
      total,
      limit: parseInt(limit),
      offset: parseInt(offset),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting occupancy history:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Estadísticas de ocupación por zona
 */
const getOccupancyStats = async (req, res) => {
  try {
    const { zone } = req.query;

    let sql = `
      SELECT
        zone,
        COUNT(*)                          AS total_readings,
        SUM(people_count)                 AS total_people,
        ROUND(AVG(people_count)::numeric, 2) AS avg_people,
        MAX(people_count)                 AS max_people,
        SUM(CASE WHEN movement THEN 1 ELSE 0 END) AS movement_detected
      FROM sensor_data
    `;
    const params = [];

    if (zone) {
      sql += ' WHERE zone = $1';
      params.push(zone);
    }

    sql += ' GROUP BY zone ORDER BY zone';

    let rows = [];
    try {
      const result = await query(sql, params);
      rows = result.rows;
    } catch {
      rows = [];
    }

    res.json({
      success: true,
      data: {
        zones: rows,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error getting occupancy stats:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { getCurrentOccupancy, getOccupancyHistory, getOccupancyStats };
