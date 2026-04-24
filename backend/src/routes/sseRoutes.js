const { Hono } = require('hono');
const { streamSSE } = require('hono/streaming');
const { addClient, removeClient } = require('../services/sseService');
const { authenticateToken } = require('../middleware/auth');

const sse = new Hono();

/**
 * GET /api/sse/events
 * Conexión SSE — el cliente recibe eventos en tiempo real
 * Query: ?zone=oficina-a  (opcional, filtra por zona)
 *
 * Eventos emitidos:
 *   - sensor_data      → nueva lectura de sensor
 *   - energy_action    → acción energética ejecutada
 *   - occupancy_update → cambio de ocupación
 *   - ping             → keepalive cada 30 segundos
 *
 * Cabecera requerida: Authorization: Bearer <token>
 */
sse.get('/events', authenticateToken, async (c) => {
  const zone = c.req.query('zone') || null;

  return streamSSE(c, async (stream) => {
    let clientId;

    // Crear un ReadableStream controller compatible con sseService
    const controller = {
      enqueue: (chunk) => {
        stream.write(new TextDecoder().decode(chunk)).catch(() => {});
      }
    };

    clientId = addClient(controller, zone);

    // Enviar evento de bienvenida
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({
        message: 'Conectado al stream de eventos IoT',
        client_id: clientId,
        zone: zone || 'todas',
        timestamp: new Date().toISOString()
      })
    });

    // Keepalive cada 30 segundos para mantener la conexión abierta
    const pingInterval = setInterval(async () => {
      try {
        await stream.writeSSE({
          event: 'ping',
          data: JSON.stringify({ timestamp: new Date().toISOString() })
        });
      } catch {
        clearInterval(pingInterval);
      }
    }, 30000);

    // Esperar hasta que el cliente se desconecte
    await stream.onAbort(() => {
      clearInterval(pingInterval);
      removeClient(clientId);
    });

    // Mantener el stream abierto
    await new Promise((resolve) => {
      stream.onAbort(resolve);
    });
  });
});

module.exports = sse;
