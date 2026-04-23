const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { procesarDecision } = require('../services/decisionService');

const memoryStore = new Map();

const receiveSensorData = async (c) => {
  try {
    const { device_id, timestamp, people_count = 0, movement = false, zone } = c.req.valid('json');

    const ts = timestamp ? new Date(timestamp) : new Date();
    const id = uuidv4();
    let data;

    try {
      const result = await query(
        `INSERT INTO sensor_data (id, device_id, timestamp, people_count, movement, zone)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [id, device_id, ts, people_count, movement, zone]
      );
      data = result.rows[0];

      await query(
        `INSERT INTO devices (device_id, zone, last_seen)
         VALUES ($1, $2, NOW())
         ON CONFLICT (device_id) DO UPDATE SET last_seen = NOW(), zone = EXCLUDED.zone`,
        [device_id, zone]
      );
    } catch {
      data = { id, device_id, timestamp: ts.toISOString(), people_count, movement, zone, received_at: new Date().toISOString() };
      if (!memoryStore.has(device_id)) memoryStore.set(device_id, []);
      const records = memoryStore.get(device_id);
      records.push(data);
      if (records.length > 1000) records.shift();
    }

    console.log(`[Sensor] Data received from ${device_id} (zone: ${zone})`);

    procesarDecision(zone, people_count, movement).catch(err =>
      console.error('[Sensor] Error en decisión automática:', err.message)
    );

    return c.json({ success: true, data }, 201);
  } catch (error) {
    console.error('Error receiving sensor data:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

const getSensorStatus = async (c) => {
  try {
    const deviceId = c.req.param('deviceId');
    let lastData = null;
    let totalRecords = 0;

    try {
      const [countResult, lastResult] = await Promise.all([
        query('SELECT COUNT(*) FROM sensor_data WHERE device_id = $1', [deviceId]),
        query('SELECT * FROM sensor_data WHERE device_id = $1 ORDER BY timestamp DESC LIMIT 1', [deviceId])
      ]);
      totalRecords = parseInt(countResult.rows[0].count);
      lastData     = lastResult.rows[0] || null;
    } catch {
      const records = memoryStore.get(deviceId);
      if (!records) return c.json({ error: 'Sensor no encontrado' }, 404);
      totalRecords = records.length;
      lastData     = records[records.length - 1];
    }

    if (!lastData && totalRecords === 0) {
      return c.json({ error: 'Sensor no encontrado' }, 404);
    }

    return c.json({ success: true, device_id: deviceId, last_data: lastData, total_records: totalRecords });
  } catch (error) {
    console.error('Error getting sensor status:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

const listSensors = async (c) => {
  try {
    let sensors = [];

    try {
      const result = await query(
        `SELECT device_id, zone, last_seen,
                (SELECT COUNT(*) FROM sensor_data sd WHERE sd.device_id = d.device_id) AS total_records
         FROM devices d ORDER BY last_seen DESC NULLS LAST`
      );
      sensors = result.rows;
    } catch {
      sensors = Array.from(memoryStore.keys()).map(deviceId => {
        const records = memoryStore.get(deviceId);
        return { device_id: deviceId, last_seen: records[records.length - 1]?.timestamp, total_records: records.length };
      });
    }

    return c.json({ success: true, sensors, total: sensors.length });
  } catch (error) {
    console.error('Error listing sensors:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

module.exports = { receiveSensorData, getSensorStatus, listSensors };
