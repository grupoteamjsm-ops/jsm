# IoT Occupancy Backend

Backend para sistema IoT de monitorización de ocupación y optimización energética en espacios de trabajo.

## Descripción

El sistema integra tecnologías IoT con análisis de datos para generar entornos inteligentes. Adquiere datos mediante sensores físicos **sin cámaras**, garantizando la privacidad de los usuarios. A partir de esos datos, procesa la información en tiempo real y genera acciones automáticas sobre iluminación, ventilación y climatización.

## Arquitectura Hardware

```
[Sensor 1]──┐
[Sensor 2]──┤
            ├──► [Concentrador] ──► [Arduino] ──► Backend
[Sensor 3]──┤
[Sensor 4]──┘
```

4 sensores de campo envían sus lecturas a un sensor concentrador, que las agrega y las pasa al Arduino. El Arduino actúa como gateway y envía los datos al backend mediante HTTP POST.

## Características

- ✅ Recepción de datos de 4 sensores vía Arduino
- ✅ Monitorización de ocupación en tiempo real por zona
- ✅ Automatización energética (iluminación, ventilación, climatización)
- ✅ Privacidad garantizada — sin cámaras
- ✅ API RESTful con validación de entradas
- ✅ PostgreSQL como base de datos (con fallback en memoria)
- ✅ Autenticación JWT preparada

## Stack

- **Node.js + Express** — servidor REST
- **PostgreSQL + pg** — base de datos
- **JWT + bcryptjs** — autenticación
- **Helmet + CORS + express-validator** — seguridad

## Instalación Rápida

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar entorno
cp .env.example .env
# Editar .env con tus credenciales de PostgreSQL

# 3. Crear tablas en la base de datos (cuando tengas PostgreSQL)
npm run migrate

# 4. Arrancar en desarrollo
npm run dev
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con auto-reload (nodemon) |
| `npm start` | Servidor en producción |
| `npm run migrate` | Crear tablas en PostgreSQL |

## API Endpoints

### Sensores
```
POST   /api/sensors/data          Recibir lectura de sensor (Arduino)
GET    /api/sensors               Listar dispositivos registrados
GET    /api/sensors/:deviceId     Estado de un sensor
```

### Ocupación
```
GET    /api/occupancy/current     Ocupación actual por zona
GET    /api/occupancy/history     Historial paginado (?zone=&limit=&offset=)
GET    /api/occupancy/stats       Estadísticas por zona
```

### Energía
```
POST   /api/energy/actions        Ejecutar acción energética
GET    /api/energy/status         Estado de sistemas (luces, clima, ventilación)
GET    /api/energy/consumption    Historial de consumo
```

### Sistema
```
GET    /health                    Health check
```

## Esquema de Datos del Sensor

El Arduino envía este JSON en cada lectura:

```json
{
  "device_id":    "sensor-001",
  "timestamp":    "2026-04-20T12:00:00Z",
  "people_count": 3,
  "movement":     true,
  "zone":         "office-a"
}
```

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `device_id` | string | Identificador del sensor |
| `timestamp` | ISO 8601 | Marca temporal (opcional, se usa NOW() si no se envía) |
| `people_count` | integer ≥ 0 | Número de personas detectadas |
| `movement` | boolean | Detección de movimiento |
| `zone` | string | Zona del espacio de trabajo |

## Lógica de Automatización

| Ocupación | Iluminación | Climatización | Ventilación |
|-----------|-------------|---------------|-------------|
| Alta (≥5 personas) | 100% | 100% | 100% |
| Media (2-4) | 75% | 75% | 60% |
| Baja (1) | 50% | 50% | 30% |
| Vacío (0) | Apagado | Apagado | Apagado |

Los sistemas se apagan tras **15 minutos** sin ocupación detectada.

## Configuración

Variables principales en `.env`:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=tu-clave-secreta

# PostgreSQL (rellenar cuando esté disponible)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iot_occupancy
DB_USER=postgres
DB_PASSWORD=
```

Sin configuración de PostgreSQL el sistema funciona en **modo memoria** (datos no persistentes).

## Documentación Adicional

- [ARCHITECTURE.md](ARCHITECTURE.md) — Arquitectura detallada del sistema
- [INSTALLATION.md](INSTALLATION.md) — Guía de instalación paso a paso
- `.env.example` — Todas las variables de entorno disponibles

## Próximas Mejoras

- Integración con IA para predicción de ocupación
- Integración con sistemas de reservas de salas
- Dashboard de visualización en tiempo real (WebSockets)
- MQTT para comunicación directa con Arduino
- Docker + Docker Compose

## Licencia

ISC
