const { query } = require('../config/database');

/**
 * GET /api/zones
 * Listar todas las zonas
 */
const listZones = async (c) => {
  try {
    const result = await query(
      'SELECT * FROM zones ORDER BY name'
    );
    return c.json({ success: true, zones: result.rows, total: result.rows.length });
  } catch (error) {
    console.error('Error listing zones:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

/**
 * GET /api/zones/:id
 * Obtener una zona por ID
 */
const getZone = async (c) => {
  try {
    const id = c.req.param('id');
    const result = await query('SELECT * FROM zones WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return c.json({ error: 'Zona no encontrada' }, 404);
    }
    return c.json({ success: true, zone: result.rows[0] });
  } catch (error) {
    console.error('Error getting zone:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

/**
 * POST /api/zones
 * Crear una zona  [solo admin]
 * Body: { name, description?, capacity? }
 */
const createZone = async (c) => {
  try {
    const { name, description = null, capacity = 0 } = await c.req.json();

    if (!name) return c.json({ error: 'El nombre de la zona es obligatorio' }, 400);

    const result = await query(
      `INSERT INTO zones (name, description, capacity)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, description, capacity]
    );
    return c.json({ success: true, zone: result.rows[0] }, 201);
  } catch (error) {
    if (error.code === '23505') return c.json({ error: 'Ya existe una zona con ese nombre' }, 409);
    console.error('Error creating zone:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

/**
 * PUT /api/zones/:id
 * Actualizar una zona  [solo admin]
 * Body: { name?, description?, capacity?, active? }
 */
const updateZone = async (c) => {
  try {
    const id = c.req.param('id');
    const { name, description, capacity, active } = await c.req.json();

    const fields  = [];
    const params  = [];
    let   idx     = 1;

    if (name        !== undefined) { fields.push(`name = $${idx++}`);        params.push(name); }
    if (description !== undefined) { fields.push(`description = $${idx++}`); params.push(description); }
    if (capacity    !== undefined) { fields.push(`capacity = $${idx++}`);    params.push(capacity); }
    if (active      !== undefined) { fields.push(`active = $${idx++}`);      params.push(active); }

    if (fields.length === 0) return c.json({ error: 'No hay campos para actualizar' }, 400);

    params.push(id);
    const result = await query(
      `UPDATE zones SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );

    if (result.rows.length === 0) return c.json({ error: 'Zona no encontrada' }, 404);
    return c.json({ success: true, zone: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') return c.json({ error: 'Ya existe una zona con ese nombre' }, 409);
    console.error('Error updating zone:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

/**
 * DELETE /api/zones/:id
 * Desactivar una zona (soft delete)  [solo admin]
 */
const deleteZone = async (c) => {
  try {
    const id = c.req.param('id');
    const result = await query(
      'UPDATE zones SET active = FALSE WHERE id = $1 RETURNING id, name',
      [id]
    );
    if (result.rows.length === 0) return c.json({ error: 'Zona no encontrada' }, 404);
    return c.json({ success: true, message: `Zona "${result.rows[0].name}" desactivada` });
  } catch (error) {
    console.error('Error deleting zone:', error.message);
    return c.json({ error: 'Error interno del servidor' }, 500);
  }
};

module.exports = { listZones, getZone, createZone, updateZone, deleteZone };
