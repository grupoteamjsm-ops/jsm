const { swaggerUI } = require('@hono/swagger-ui');
const { Hono }      = require('hono');

/**
 * Especificación OpenAPI 3.0 completa del backend IoT
 */
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title:       'IoT Occupancy Backend API',
    version:     '2.0.0',
    description: `
Backend para sistema IoT de monitorización de ocupación y optimización energética.

## Autenticación
La mayoría de endpoints requieren un **Bearer token** JWT.

1. Llama a \`POST /api/auth/login\` para obtener \`access_token\` y \`refresh_token\`
2. Incluye el access token en la cabecera: \`Authorization: Bearer <token>\`
3. Cuando el access token expire (15 min), usa \`POST /api/auth/refresh\` para renovarlo sin re-login

## Roles
- **admin**: acceso total
- **operador**: lectura + ejecutar acciones energéticas
- **viewer**: solo lectura

## Dispositivos IoT (Arduino)
El Arduino envía datos con la cabecera \`X-API-Key\` (en producción).
En desarrollo \`REQUIRE_API_KEY=false\` permite enviar sin key.
    `,
    contact: {
      name: 'Grupo Team JSM',
      url:  'https://github.com/grupoteamjsm-ops/jsm'
    }
  },
  servers: [
    { url: 'http://localhost:3000', description: 'Desarrollo local' },
    { url: 'https://tudominio.com', description: 'Producción' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type:         'http',
        scheme:       'bearer',
        bearerFormat: 'JWT',
        description:  'Access token obtenido en /api/auth/login'
      },
      apiKey: {
        type: 'apiKey',
        in:   'header',
        name: 'X-API-Key',
        description: 'API Key para dispositivos Arduino (requerida en producción)'
      }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Mensaje de error' }
        }
      },
      AuthResponse: {
        type: 'object',
        properties: {
          success:       { type: 'boolean' },
          access_token:  { type: 'string' },
          refresh_token: { type: 'string' },
          token_type:    { type: 'string', example: 'Bearer' },
          expires_in:    { type: 'integer', example: 900 },
          usuario: {
            type: 'object',
            properties: {
              id:     { type: 'string', format: 'uuid' },
              nombre: { type: 'string' },
              email:  { type: 'string', format: 'email' },
              rol:    { type: 'string', enum: ['admin', 'operador', 'viewer'] }
            }
          }
        }
      },
      SensorData: {
        type: 'object',
        required: ['device_id', 'zone'],
        properties: {
          device_id:    { type: 'string', example: 'sensor-001' },
          zone:         { type: 'string', example: 'oficina-a' },
          people_count: { type: 'integer', minimum: 0, example: 3 },
          movement:     { type: 'boolean', example: true },
          timestamp:    { type: 'string', format: 'date-time', example: '2026-04-23T10:00:00Z' }
        }
      },
      EnergyAction: {
        type: 'object',
        required: ['action', 'zone', 'device_type'],
        properties: {
          action:      { type: 'string', enum: ['turn_on', 'turn_off', 'adjust'] },
          zone:        { type: 'string', example: 'oficina-a' },
          device_type: { type: 'string', enum: ['lighting', 'ventilation', 'climate'] },
          value:       { type: 'integer', minimum: 0, maximum: 100, example: 75 },
          reason:      { type: 'string', example: 'Ocupación alta detectada' }
        }
      },
      Zone: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          name:        { type: 'string', example: 'oficina-a' },
          description: { type: 'string' },
          capacity:    { type: 'integer', example: 10 },
          active:      { type: 'boolean' },
          created_at:  { type: 'string', format: 'date-time' }
        }
      },
      User: {
        type: 'object',
        properties: {
          id:          { type: 'string', format: 'uuid' },
          nombre:      { type: 'string' },
          email:       { type: 'string', format: 'email' },
          rol:         { type: 'string', enum: ['admin', 'operador', 'viewer'] },
          activo:      { type: 'boolean' },
          creado_en:   { type: 'string', format: 'date-time' },
          ultimo_login:{ type: 'string', format: 'date-time' }
        }
      },
      Prediction: {
        type: 'object',
        properties: {
          zone:             { type: 'string' },
          hora:             { type: 'integer', minimum: 0, maximum: 23 },
          dia_semana:       { type: 'integer', minimum: 0, maximum: 6 },
          ocupacion_prevista:{ type: 'number' },
          confianza:        { type: 'string', enum: ['alta', 'media', 'baja'] },
          basado_en_lecturas:{ type: 'integer' }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    // ── Health ──────────────────────────────────────────────
    '/health': {
      get: {
        tags:    ['Sistema'],
        summary: 'Health check',
        description: 'Comprueba el estado del servidor y la conexión a PostgreSQL',
        security: [],
        responses: {
          200: { description: 'Sistema operativo' },
          503: { description: 'Sistema degradado (BD no disponible)' }
        }
      }
    },

    // ── Auth ────────────────────────────────────────────────
    '/api/auth/register': {
      post: {
        tags: ['Autenticación'], summary: 'Registrar usuario', security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['nombre', 'email', 'password'],
            properties: {
              nombre:   { type: 'string', example: 'Admin IoT' },
              email:    { type: 'string', format: 'email' },
              password: { type: 'string', minLength: 6 },
              rol:      { type: 'string', enum: ['admin', 'operador', 'viewer'], default: 'operador' }
            }
          }}}
        },
        responses: {
          201: { description: 'Usuario creado', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          409: { description: 'Email ya registrado' }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Autenticación'], summary: 'Iniciar sesión', security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['email', 'password'],
            properties: {
              email:    { type: 'string', format: 'email', example: 'admin@iot.com' },
              password: { type: 'string', example: 'admin123' }
            }
          }}}
        },
        responses: {
          200: { description: 'Login correcto', content: { 'application/json': { schema: { $ref: '#/components/schemas/AuthResponse' } } } },
          401: { description: 'Credenciales incorrectas' }
        }
      }
    },
    '/api/auth/refresh': {
      post: {
        tags: ['Autenticación'], summary: 'Renovar access token', security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['refresh_token'],
            properties: { refresh_token: { type: 'string' } }
          }}}
        },
        responses: {
          200: { description: 'Nuevo access token generado' },
          401: { description: 'Refresh token inválido o expirado' }
        }
      }
    },
    '/api/auth/logout': {
      post: {
        tags: ['Autenticación'], summary: 'Cerrar sesión actual', security: [],
        requestBody: {
          content: { 'application/json': { schema: {
            type: 'object',
            properties: { refresh_token: { type: 'string' } }
          }}}
        },
        responses: { 200: { description: 'Sesión cerrada' } }
      }
    },
    '/api/auth/logout-all': {
      post: {
        tags: ['Autenticación'], summary: 'Cerrar todas las sesiones',
        responses: { 200: { description: 'Todas las sesiones cerradas' } }
      }
    },
    '/api/auth/me': {
      get: {
        tags: ['Autenticación'], summary: 'Perfil del usuario autenticado',
        responses: {
          200: { description: 'Perfil del usuario', content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } } }
        }
      }
    },
    '/api/auth/password': {
      put: {
        tags: ['Autenticación'], summary: 'Cambiar contraseña',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['password_actual', 'password_nueva'],
            properties: {
              password_actual: { type: 'string' },
              password_nueva:  { type: 'string', minLength: 6 }
            }
          }}}
        },
        responses: { 200: { description: 'Contraseña actualizada' } }
      }
    },

    // ── Sensores ────────────────────────────────────────────
    '/api/sensors/data': {
      post: {
        tags: ['Sensores'],
        summary: 'Recibir lectura de sensor (Arduino)',
        description: 'Endpoint llamado por el Arduino. Dispara automáticamente la lógica de decisión energética.',
        security: [{ apiKey: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SensorData' } } }
        },
        responses: {
          201: { description: 'Lectura registrada y decisión energética ejecutada' },
          400: { description: 'Datos inválidos' },
          401: { description: 'API Key requerida (en producción)' }
        }
      }
    },
    '/api/sensors': {
      get: {
        tags: ['Sensores'], summary: 'Listar dispositivos registrados',
        responses: { 200: { description: 'Lista de sensores con last_seen y total de lecturas' } }
      }
    },
    '/api/sensors/{deviceId}': {
      get: {
        tags: ['Sensores'], summary: 'Estado de un sensor',
        parameters: [{ name: 'deviceId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Última lectura y total de registros' }, 404: { description: 'Sensor no encontrado' } }
      }
    },

    // ── Ocupación ───────────────────────────────────────────
    '/api/occupancy/current': {
      get: {
        tags: ['Ocupación'], summary: 'Ocupación actual por zona',
        parameters: [{ name: 'zone', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Suma de personas y estado de movimiento por zona' } }
      }
    },
    '/api/occupancy/by-zone': {
      get: {
        tags: ['Ocupación'], summary: 'Resumen completo por zona',
        description: 'Ocupación actual + estadísticas del día + estado energético de cada zona',
        responses: { 200: { description: 'Vista consolidada de todas las zonas' } }
      }
    },
    '/api/occupancy/by-hour': {
      get: {
        tags: ['Ocupación'], summary: 'Patrón horario de ocupación',
        description: 'Media de personas por hora del día (0-23). Útil para ver cuándo hay más actividad.',
        parameters: [
          { name: 'zone', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to',   in: 'query', schema: { type: 'string', format: 'date-time' } }
        ],
        responses: { 200: { description: 'Ocupación media agrupada por hora' } }
      }
    },
    '/api/occupancy/history': {
      get: {
        tags: ['Ocupación'], summary: 'Historial paginado',
        parameters: [
          { name: 'zone',      in: 'query', schema: { type: 'string' } },
          { name: 'device_id', in: 'query', schema: { type: 'string' } },
          { name: 'from',      in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to',        in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'limit',     in: 'query', schema: { type: 'integer', default: 100 } },
          { name: 'offset',    in: 'query', schema: { type: 'integer', default: 0 } }
        ],
        responses: { 200: { description: 'Lecturas históricas con paginación' } }
      }
    },
    '/api/occupancy/stats': {
      get: {
        tags: ['Ocupación'], summary: 'Estadísticas agregadas por zona',
        parameters: [
          { name: 'zone', in: 'query', schema: { type: 'string' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to',   in: 'query', schema: { type: 'string', format: 'date-time' } }
        ],
        responses: { 200: { description: 'Total lecturas, media, máximo, movimiento por zona' } }
      }
    },
    '/api/occupancy/annual': {
      get: {
        tags: ['Ocupación'], summary: 'Historial anual (activo + archivo)',
        description: 'Consulta sensor_data + sensor_data_archive. Agrupa por día para análisis de tendencias anuales.',
        parameters: [
          { name: 'zone', in: 'query', schema: { type: 'string' } },
          { name: 'year', in: 'query', schema: { type: 'integer', example: 2026 } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date-time' } },
          { name: 'to',   in: 'query', schema: { type: 'string', format: 'date-time' } }
        ],
        responses: { 200: { description: 'Datos diarios + años disponibles en el historial' } }
      }
    },

    // ── Predicción IA ───────────────────────────────────────
    '/api/occupancy/predict': {
      get: {
        tags: ['Predicción IA'],
        summary: 'Predecir ocupación futura',
        description: 'Analiza el historial y predice la ocupación esperada por zona y hora del día usando regresión estadística sobre datos reales.',
        parameters: [
          { name: 'zone',       in: 'query', required: true, schema: { type: 'string' } },
          { name: 'hora',       in: 'query', schema: { type: 'integer', minimum: 0, maximum: 23 } },
          { name: 'dia_semana', in: 'query', schema: { type: 'integer', minimum: 0, maximum: 6, description: '0=Domingo, 1=Lunes...' } }
        ],
        responses: {
          200: { description: 'Predicción de ocupación', content: { 'application/json': { schema: { $ref: '#/components/schemas/Prediction' } } } },
          400: { description: 'Parámetros inválidos' },
          404: { description: 'Sin datos históricos suficientes para predecir' }
        }
      }
    },

    // ── Energía ─────────────────────────────────────────────
    '/api/energy/actions': {
      post: {
        tags: ['Energía'], summary: 'Ejecutar acción energética',
        description: 'Solo admin y operador. También se ejecuta automáticamente al recibir datos de sensores.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/EnergyAction' } } }
        },
        responses: {
          200: { description: 'Acción ejecutada y emitida por SSE' },
          403: { description: 'Rol insuficiente' }
        }
      }
    },
    '/api/energy/status': {
      get: {
        tags: ['Energía'], summary: 'Estado actual de sistemas energéticos',
        parameters: [{ name: 'zone', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Estado (on/off/valor) de iluminación, clima y ventilación por zona' } }
      }
    },
    '/api/energy/consumption': {
      get: {
        tags: ['Energía'], summary: 'Historial de consumo',
        parameters: [
          { name: 'zone',  in: 'query', schema: { type: 'string' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 50 } }
        ],
        responses: { 200: { description: 'Acciones agrupadas por zona y tipo de dispositivo' } }
      }
    },

    // ── Zonas ───────────────────────────────────────────────
    '/api/zones': {
      get:  { tags: ['Zonas'], summary: 'Listar zonas', responses: { 200: { description: 'Lista de zonas' } } },
      post: {
        tags: ['Zonas'], summary: 'Crear zona [admin]',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Zone' } } }
        },
        responses: { 201: { description: 'Zona creada' }, 409: { description: 'Nombre duplicado' } }
      }
    },
    '/api/zones/{id}': {
      get:    { tags: ['Zonas'], summary: 'Obtener zona', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Zona' }, 404: { description: 'No encontrada' } } },
      put:    { tags: ['Zonas'], summary: 'Actualizar zona [admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Zona actualizada' } } },
      delete: { tags: ['Zonas'], summary: 'Desactivar zona [admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Zona desactivada' } } }
    },

    // ── Dispositivos ────────────────────────────────────────
    '/api/devices': {
      get: { tags: ['Dispositivos'], summary: 'Listar dispositivos', parameters: [{ name: 'zone', in: 'query', schema: { type: 'string' } }, { name: 'active', in: 'query', schema: { type: 'boolean' } }], responses: { 200: { description: 'Lista de sensores/dispositivos' } } }
    },
    '/api/devices/{deviceId}': {
      get:    { tags: ['Dispositivos'], summary: 'Obtener dispositivo', parameters: [{ name: 'deviceId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Dispositivo' } } },
      put:    { tags: ['Dispositivos'], summary: 'Actualizar dispositivo [admin/operador]', parameters: [{ name: 'deviceId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Dispositivo actualizado' } } },
      delete: { tags: ['Dispositivos'], summary: 'Desactivar dispositivo [admin]', parameters: [{ name: 'deviceId', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Dispositivo desactivado' } } }
    },

    // ── Usuarios ────────────────────────────────────────────
    '/api/users': {
      get: { tags: ['Usuarios'], summary: 'Listar usuarios [admin]', parameters: [{ name: 'rol', in: 'query', schema: { type: 'string' } }, { name: 'activo', in: 'query', schema: { type: 'boolean' } }], responses: { 200: { description: 'Lista de usuarios' } } }
    },
    '/api/users/{id}': {
      get:    { tags: ['Usuarios'], summary: 'Obtener usuario [admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Usuario' } } },
      put:    { tags: ['Usuarios'], summary: 'Actualizar usuario [admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Usuario actualizado' } } },
      delete: { tags: ['Usuarios'], summary: 'Desactivar usuario [admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Usuario desactivado' } } }
    },
    '/api/users/{id}/reset-password': {
      post: { tags: ['Usuarios'], summary: 'Resetear contraseña [admin]', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }], responses: { 200: { description: 'Contraseña reseteada' } } }
    },

    // ── SSE ─────────────────────────────────────────────────
    '/api/sse/events': {
      get: {
        tags: ['Tiempo Real (SSE)'],
        summary: 'Stream de eventos en tiempo real',
        description: `Conexión Server-Sent Events. El cliente recibe eventos automáticamente sin polling.

**Eventos emitidos:**
- \`connected\` — confirmación de conexión
- \`sensor_data\` — nueva lectura de sensor
- \`energy_action\` — acción energética ejecutada
- \`occupancy_update\` — cambio de ocupación con acciones tomadas
- \`ping\` — keepalive cada 30 segundos

**Uso en JavaScript:**
\`\`\`js
const es = new EventSource('/api/sse/events?zone=oficina-a', {
  headers: { Authorization: 'Bearer <token>' }
});
es.addEventListener('sensor_data', e => console.log(JSON.parse(e.data)));
\`\`\``,
        parameters: [{ name: 'zone', in: 'query', description: 'Filtrar por zona (opcional)', schema: { type: 'string' } }],
        responses: {
          200: { description: 'Stream SSE activo', content: { 'text/event-stream': {} } },
          401: { description: 'Token requerido' }
        }
      }
    }
  },

  tags: [
    { name: 'Sistema',          description: 'Health check y estado del servidor' },
    { name: 'Autenticación',    description: 'Login, registro, tokens JWT' },
    { name: 'Sensores',         description: 'Recepción y consulta de datos de sensores Arduino' },
    { name: 'Ocupación',        description: 'Monitorización de ocupación por zona' },
    { name: 'Predicción IA',    description: 'Predicción de ocupación basada en historial' },
    { name: 'Energía',          description: 'Control de iluminación, climatización y ventilación' },
    { name: 'Zonas',            description: 'Gestión de zonas del espacio de trabajo' },
    { name: 'Dispositivos',     description: 'Gestión de sensores y dispositivos IoT' },
    { name: 'Usuarios',         description: 'Gestión de usuarios y roles (solo admin)' },
    { name: 'Tiempo Real (SSE)', description: 'Stream de eventos en tiempo real' }
  ]
};

/**
 * Registrar rutas de documentación en la app Hono
 */
const registerDocs = (app) => {
  // Spec JSON
  app.get('/api/docs/spec', (c) => c.json(openApiSpec));

  // Swagger UI
  app.get('/api/docs', swaggerUI({ url: '/api/docs/spec' }));

  console.log('[Docs] Swagger UI disponible en /api/docs');
};

module.exports = { registerDocs, openApiSpec };
