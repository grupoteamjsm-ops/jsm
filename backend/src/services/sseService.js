/**
 * Servicio SSE (Server-Sent Events)
 * Gestiona los clientes conectados y el envío de eventos en tiempo real.
 * Compatible con Hono — no depende de Express.
 */

// Map de clientes conectados: id → { controller, zone? }
const clients = new Map();
let nextId = 1;

/**
 * Registrar un nuevo cliente SSE
 * @param {ReadableStreamDefaultController} controller
 * @param {string|null} zone - filtrar por zona (null = todos los eventos)
 * @returns {number} id del cliente
 */
const addClient = (controller, zone = null) => {
  const id = nextId++;
  clients.set(id, { controller, zone });
  console.log(`[SSE] Cliente conectado #${id} (zona: ${zone || 'todas'}) — total: ${clients.size}`);
  return id;
};

/**
 * Eliminar un cliente desconectado
 */
const removeClient = (id) => {
  clients.delete(id);
  console.log(`[SSE] Cliente desconectado #${id} — total: ${clients.size}`);
};

/**
 * Formatear un mensaje SSE
 */
const formatEvent = (event, data) =>
  `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

/**
 * Enviar un evento a todos los clientes suscritos
 * @param {string} event  - nombre del evento
 * @param {object} data   - payload
 * @param {string} zone   - si se especifica, solo se envía a clientes de esa zona
 */
const broadcast = (event, data, zone = null) => {
  const dead = [];

  for (const [id, client] of clients) {
    // Filtrar por zona si el cliente tiene zona o el evento tiene zona
    if (zone && client.zone && client.zone !== zone) continue;

    try {
      const msg = new TextEncoder().encode(formatEvent(event, data));
      client.controller.enqueue(msg);
    } catch {
      dead.push(id);
    }
  }

  // Limpiar clientes muertos
  dead.forEach(removeClient);
};

/**
 * Eventos disponibles:
 * - sensor_data     → nueva lectura de sensor
 * - energy_action   → acción energética ejecutada
 * - occupancy_update → cambio de ocupación en una zona
 */
const emitSensorData    = (data)   => broadcast('sensor_data',      data, data.zone);
const emitEnergyAction  = (data)   => broadcast('energy_action',    data, data.zone);
const emitOccupancy     = (data)   => broadcast('occupancy_update', data, data.zone);

module.exports = { addClient, removeClient, broadcast, emitSensorData, emitEnergyAction, emitOccupancy };
