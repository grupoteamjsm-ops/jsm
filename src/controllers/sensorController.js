const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { procesarDecision } = require('../services/decisionService');

// Fallback en memoria si no hay DB
const memoryStore = new Map();

/**
 * Recibir datos de sensores
 * Body: { device_id, timestamp?, people_count, movement, zone }
 */
const receiveSensorData = async (req, res) => {
  try {
    const { device_id, timestamp, people_count = 0, movement = false, zone } = req.body;

    const ts = timestamp ? new Date(timestamp) : new Date();
    const id = uuidv4();

    let data;

    try {
      // Intentar guardar en PostgreSQL
      const result = await query(
        `INSERT INTO sensor_data (id, device_id, timestamp, people_count, movement, zone)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [id, device_id, ts, people_count, movement, zone]
      );
      data = result.rows[0];

      // Actualizar last_seen del dispositivo (upsert)
      await query(
        `INSERT INTO devices (device_id, zone, last_seen)
         VALUES ($1, $2, NOW())
         ON CONFLICT (device_id) DO UPDATE
           SET last_seen = NOW(), zone = EXCLUDED.zone`,
        [device_id, zone]
      );
    } catch (dbError) {
      // Fallback a memoria
      data = { id, device_id, timestamp: ts.toISOString(), people_count, movement, zone, received_at: new Date().toISOString() };
      if (!memoryStore.has(device_id)) memoryStore.set(device_id, []);
      const records = memoryStore.get(device_id);
      records.push(data);
      if (records.length > 1000) records.shift();
    }

    console.log(`[Sensor] Data received from ${device_id} (zone: ${zone})`);

    // Disparar lógica de decisión energética en segundo plano
    procesarDecision(zone, people_count, movement).catch(err =>
      console.error('[Sensor] Error en decisión automática:', err.message)
    );

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error receiving sensor data:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Obtener estado de un sensor específico
 */
const getSensorStatus = async (req, res) => {
  try {
    const { deviceId } = req.params;
    let lastData = null;
    let totalRecords = 0;

    try {
      const countResult = await query(
        'SELECT COUNT(*) FROM sensor_data WHERE device_id = $1',
        [deviceId]
      );
      totalRecords = parseInt(countResult.rows[0].count);

      const lastResult = await query(
        'SELECT * FROM sensor_data WHERE device_id = $1 ORDER BY timestamp DESC LIMIT 1',
        [deviceId]
      );
      lastData = lastResult.rows[0] || null;
    } catch {
      // Fallback a memoria
      const records = memoryStore.get(deviceId);
      if (!records) return res.status(404).json({ error: 'Sensor not found' });
      totalRecords = records.length;
      lastData = records[records.length - 1];
    }

    if (!lastData && totalRecords === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    res.json({ success: true, device_id: deviceId, last_data: lastData, total_records: totalRecords });
  } catch (error) {
    console.error('Error getting sensor status:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Listar todos los sensores
 */
const listSensors = async (req, res) => {
  try {
    let sensors = [];

    try {
      const result = await query(
        `SELECT device_id, zone, last_seen,
                (SELECT COUNT(*) FROM sensor_data sd WHERE sd.device_id = d.device_id) AS total_records
         FROM devices d
         ORDER BY last_seen DESC NULLS LAST`
      );
      sensors = result.rows;
    } catch {
      // Fallback a memoria
      sensors = Array.from(memoryStore.keys()).map(deviceId => {
        const records = memoryStore.get(deviceId);
        return {
          device_id: deviceId,
          last_seen: records[records.length - 1]?.timestamp,
          total_records: records.length
        };
      });
    }

    res.json({ success: true, sensors, total: sensors.length });
  } catch (error) {
    console.error('Error listing sensors:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { receiveSensorData, getSensorStatus, listSensors };
