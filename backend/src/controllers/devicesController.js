const { query } = require('../config/database');

/**
 * GET /api/devices
 * Listar todos los dispositivos
 * Query: ?zone= &active=
 */
const listDevices = async (c) => {
  try {
    const zone   = c.req.query('zone');
    const active = c.req.query('active');

    const conditions = [];
    const params     = [];
    let   idx        = 1;

    if (zone)   { conditions.push(`zone = $${idx++}`);   params.push(zone); }
    if (active !== undefined) { conditions.push(`active = $${idx++}`); params.push(active === 'true'); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT * FROM devices ${where} ORDER BY last_seen DESC NULLS LAST`,
      params
    );
    return c.json({ success: true, devices: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Error listing devices:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

/**
 * GET /api/devices/:deviceId
 * Obtener un dispositivo por device_id
 */
const getDevice = async (c) => {
  try {
    const deviceId = c.req.param('deviceId');
    const result = await query(
      'SELECT * FROM devices WHERE device_id = $1',
      [deviceId]
    );
    if (result.rows.length === 0) return c.json({ error: 'Dispositivo no encontrado' }, 404);
    return c.json({ success: true, device: result.rows[0] });
  } catch (error) {
    console.error('Error getting device:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

/**
 * PUT /api/devices/:deviceId
 * Actualizar un dispositivo  [solo admin/operador]
 * Body: { zone?, description?, active? }
 */
const updateDevice = async (c) => {
  try {
    const deviceId = c.req.param('deviceId');
    const { zone, description, active } = await c.req.json();

    const fields = [];
    const params = [];
    let   idx    = 1;

    if (zone        !== undefined) { fields.push(`zone = $${idx++}`);        params.push(zone); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); params.push(description); }
    if (active      !== undefined) { fields.push(`active = $${idx++}`);      params.push(active); }

    if (fields.length === 0) return c.json({ error: 'No hay campos para actualizar' }, 400);

    params.push(deviceId);
    const result = await query(
      `UPDATE devices SET ${fields.join(', ')} WHERE device_id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) return c.json({ error: 'Dispositivo no encontrado' }, 404);
    return c.json({ success: true, device: result.rows[0] });
  } catch (error) {
    console.error('Error updating device:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

/**
 * DELETE /api/devices/:deviceId
 * Desactivar un dispositivo (soft delete)  [solo admin]
 */
const deleteDevice = async (c) => {
  try {
    const deviceId = c.req.param('deviceId');
    const result = await query(
      'UPDATE devices SET active = FALSE WHERE device_id = $1 RETURNING device_id',
      [deviceId]
    );
    if (result.rows.length === 0) return c.json({ error: 'Dispositivo no encontrado' }, 404);
    return c.json({ success: true, message: `Dispositivo "${deviceId}" desactivado` });
  } catch (error) {
    console.error('Error deleting device:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

module.exports = { listDevices, getDevice, updateDevice, deleteDevice };
