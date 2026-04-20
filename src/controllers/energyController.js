const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

// Fallback en memoria
const memoryStatus = { lighting: {}, ventilation: {}, climate: {} };

/**
 * Ejecutar acción energética
 * Body: { action, zone, device_type, value?, reason? }
 */
const executeEnergyAction = async (req, res) => {
  try {
    const { action, zone, device_type, value, reason } = req.body;

    const newStatus = action === 'turn_off' ? 'off' : 'on';
    const newValue  = action === 'turn_off' ? 0 : (value ?? 100);

    let savedAction;

    try {
      // Registrar la acción
      const actionResult = await query(
        `INSERT INTO energy_actions (id, zone, action, device_type, value, reason)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [uuidv4(), zone, action, device_type, newValue, reason || null]
      );
      savedAction = actionResult.rows[0];

      // Actualizar estado actual (upsert)
      await query(
        `INSERT INTO energy_system_status (zone, device_type, status, value, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (zone, device_type) DO UPDATE
           SET status = EXCLUDED.status,
               value  = EXCLUDED.value,
               updated_at = NOW()`,
        [zone, device_type, newStatus, newValue]
      );
    } catch {
      // Fallback a memoria
      savedAction = {
        id: uuidv4(), zone, action, device_type,
        value: newValue, reason: reason || null,
        executed_at: new Date().toISOString()
      };
      memoryStatus[device_type][zone] = { status: newStatus, value: newValue, updated_at: new Date().toISOString() };
    }

    console.log(`[Energy] ${action} ${device_type} in zone ${zone}`);

    res.json({ success: true, data: savedAction });
  } catch (error) {
    console.error('Error executing energy action:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Estado actual de sistemas energéticos
 */
const getEnergyStatus = async (req, res) => {
  try {
    const { zone } = req.query;

    let sql = 'SELECT * FROM energy_system_status';
    const params = [];

    if (zone) {
      sql += ' WHERE zone = $1';
      params.push(zone);
    }

    sql += ' ORDER BY zone, device_type';

    let rows = [];
    try {
      const result = await query(sql, params);
      rows = result.rows;
    } catch {
      // Fallback a memoria
      for (const device_type of ['lighting', 'ventilation', 'climate']) {
        for (const [z, s] of Object.entries(memoryStatus[device_type])) {
          if (!zone || z === zone) {
            rows.push({ zone: z, device_type, ...s });
          }
        }
      }
    }

    res.json({
      success: true,
      data: { systems: rows, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Error getting energy status:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Historial de acciones energéticas y consumo estimado
 */
const getConsumptionData = async (req, res) => {
  try {
    const { zone, limit = 50 } = req.query;

    let sql = `
      SELECT
        zone,
        device_type,
        COUNT(*)                                    AS total_actions,
        SUM(CASE WHEN action = 'turn_on'  THEN 1 ELSE 0 END) AS times_on,
        SUM(CASE WHEN action = 'turn_off' THEN 1 ELSE 0 END) AS times_off,
        ROUND(AVG(value)::numeric, 1)               AS avg_value,
        MAX(executed_at)                            AS last_action
      FROM energy_actions
    `;
    const params = [];

    if (zone) {
      sql += ' WHERE zone = $1';
      params.push(zone);
    }

    sql += ` GROUP BY zone, device_type ORDER BY zone, device_type LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    let rows = [];
    try {
      const result = await query(sql, params);
      rows = result.rows;
    } catch {
      rows = [];
    }

    res.json({
      success: true,
      data: { consumption: rows, timestamp: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Error getting consumption data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { executeEnergyAction, getEnergyStatus, getConsumptionData };
