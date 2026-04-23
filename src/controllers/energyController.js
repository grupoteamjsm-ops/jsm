const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

const memoryStatus = { lighting: {}, ventilation: {}, climate: {} };

const executeEnergyAction = async (c) => {
  try {
    const { action, zone, device_type, value, reason } = c.req.valid('json');

    const newStatus = action === 'turn_off' ? 'off' : 'on';
    const newValue  = action === 'turn_off' ? 0 : (value ?? 100);
    let savedAction;

    try {
      const actionResult = await query(
        `INSERT INTO energy_actions (id, zone, action, device_type, value, reason)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [uuidv4(), zone, action, device_type, newValue, reason || null]
      );
      savedAction = actionResult.rows[0];

      await query(
        `INSERT INTO energy_system_status (zone, device_type, status, value, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (zone, device_type) DO UPDATE
           SET status = EXCLUDED.status, value = EXCLUDED.value, updated_at = NOW()`,
        [zone, device_type, newStatus, newValue]
      );
    } catch {
      savedAction = { id: uuidv4(), zone, action, device_type, value: newValue, reason: reason || null, executed_at: new Date().toISOString() };
      memoryStatus[device_type][zone] = { status: newStatus, value: newValue, updated_at: new Date().toISOString() };
    }

    console.log(`[Energy] ${action} ${device_type} in zone ${zone}`);
    return c.json({ success: true, data: savedAction });
  } catch (error) {
    console.error('Error executing energy action:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

const getEnergyStatus = async (c) => {
  try {
    const zone = c.req.query('zone');
    let sql = 'SELECT * FROM energy_system_status';
    const params = [];
    if (zone) { sql += ' WHERE zone = $1'; params.push(zone); }
    sql += ' ORDER BY zone, device_type';

    let rows = [];
    try {
      rows = (await query(sql, params)).rows;
    } catch {
      for (const dt of ['lighting', 'ventilation', 'climate']) {
        for (const [z, s] of Object.entries(memoryStatus[dt])) {
          if (!zone || z === zone) rows.push({ zone: z, device_type: dt, ...s });
        }
      }
    }

    return c.json({ success: true, data: { systems: rows, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('Error getting energy status:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

const getConsumptionData = async (c) => {
  try {
    const zone  = c.req.query('zone');
    const limit = parseInt(c.req.query('limit') || '50');

    const params = [];
    let sql = `
      SELECT zone, device_type, COUNT(*) AS total_actions,
             SUM(CASE WHEN action = 'turn_on'  THEN 1 ELSE 0 END) AS times_on,
             SUM(CASE WHEN action = 'turn_off' THEN 1 ELSE 0 END) AS times_off,
             ROUND(AVG(value)::numeric, 1) AS avg_value, MAX(executed_at) AS last_action
      FROM energy_actions
    `;
    if (zone) { sql += ' WHERE zone = $1'; params.push(zone); }
    sql += ` GROUP BY zone, device_type ORDER BY zone, device_type LIMIT $${params.length + 1}`;
    params.push(limit);

    let rows = [];
    try { rows = (await query(sql, params)).rows; } catch { rows = []; }

    return c.json({ success: true, data: { consumption: rows, timestamp: new Date().toISOString() } });
  } catch (error) {
    console.error('Error getting consumption data:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

module.exports = { executeEnergyAction, getEnergyStatus, getConsumptionData };
