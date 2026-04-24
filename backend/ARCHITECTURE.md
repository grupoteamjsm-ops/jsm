# Arquitectura del Sistema IoT

## Visión General

Sistema IoT distribuido para monitorización de ocupación en espacios de trabajo y optimización del consumo energético. Garantiza la privacidad de los usuarios mediante sensores no intrusivos (sin cámaras).

---

## Arquitectura Hardware

### Topología de Sensores

```
  [Sensor 1]──┐
  [Sensor 2]──┤
              ├──► [Sensor Concentrador] ──► [Arduino] ──► Backend (HTTP/JSON)
  [Sensor 3]──┤
  [Sensor 4]──┘
```

- **4 sensores de campo**: detectan movimiento y cuentan personas en distintas zonas.
- **Sensor concentrador**: recoge las lecturas de los 4 sensores y las agrega antes de enviarlas al Arduino.
- **Arduino**: actúa como gateway IoT. Recibe los datos del concentrador y los envía al backend mediante peticiones HTTP POST.

### Tipos de Sensores

| Sensor | Función | Dato generado |
|--------|---------|---------------|
| Movimiento (x4) | Detectar presencia | `movement: boolean` |
| Conteo de personas (x4) | Contar entradas/salidas | `people_count: integer` |

### Flujo Hardware → Backend

```
Sensor detecta → Concentrador agrega → Arduino envía POST /api/sensors/data → Backend procesa → PostgreSQL
```

---

## Stack Tecnológico

### Core
- **Node.js** (v18+): Runtime de JavaScript
- **Express**: Framework web REST
- **PostgreSQL**: Base de datos relacional
- **pg** (node-postgres): Driver de PostgreSQL

### Seguridad
- **Helmet**: Cabeceras HTTP seguras
- **CORS**: Control de acceso entre orígenes
- **JWT (jsonwebtoken)**: Autenticación basada en tokens
- **bcryptjs**: Hash de contraseñas
- **express-validator**: Validación y saneamiento de entradas

### Utilidades
- **dotenv**: Variables de entorno
- **uuid**: Identificadores únicos (UUIDs v4)
- **morgan**: Logging de peticiones HTTP
- **compression**: Compresión gzip de respuestas

### Desarrollo
- **nodemon**: Reinicio automático en desarrollo

---

## Arquitectura de Capas (Backend)

```
┌──────────────────────────────────────────────────┐
│              Hardware / Arduino                  │
│  [Sensor 1-4] → [Concentrador] → [Arduino]       │
└──────────────────────┬───────────────────────────┘
                       │  HTTP POST /api/sensors/data
                       │  (JSON)
┌──────────────────────▼───────────────────────────┐
│                   API REST                        │
│                                                   │
│  ┌─────────────────────────────────────────────┐ │
│  │  Middleware                                  │ │
│  │  Helmet · CORS · Morgan · Compression        │ │
│  │  express-validator · JWT auth                │ │
│  └──────────────────┬──────────────────────────┘ │
│  ┌──────────────────▼──────────────────────────┐ │
│  │  Rutas (Routes)                              │ │
│  │  /api/sensors · /api/occupancy · /api/energy │ │
│  └──────────────────┬──────────────────────────┘ │
│  ┌──────────────────▼──────────────────────────┐ │
│  │  Controladores (Controllers)                 │ │
│  │  sensorController · occupancyController      │ │
│  │  energyController                            │ │
│  └──────────────────┬──────────────────────────┘ │
│  ┌──────────────────▼──────────────────────────┐ │
│  │  Servicios (Services)                        │ │
│  │  decisionService → lógica de automatización  │ │
│  └──────────────────┬──────────────────────────┘ │
└─────────────────────┼────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────┐
│              PostgreSQL                           │
│  sensor_data · energy_actions                    │
│  energy_system_status · zones · devices          │
└──────────────────────────────────────────────────┘
```

---

## Estructura de Directorios

```
src/
├── config/
│   └── database.js          # Pool de conexiones PostgreSQL + fallback memoria
├── db/
│   ├── schema.sql            # DDL: creación de tablas e índices
│   └── migrate.js            # Script de migración (npm run migrate)
├── controllers/
│   ├── sensorController.js   # Recibir y consultar datos de sensores
│   ├── occupancyController.js# Ocupación actual, historial, estadísticas
│   └── energyController.js   # Acciones energéticas, estado, consumo
├── middleware/
│   ├── auth.js               # Autenticación JWT
│   └── validator.js          # Validación de entradas
├── models/
│   └── sensorModel.js        # Validación y normalización de datos
├── routes/
│   ├── sensorRoutes.js
│   ├── occupancyRoutes.js
│   └── energyRoutes.js
├── services/
│   └── decisionService.js    # Lógica de automatización energética
├── utils/
│   └── logger.js             # Logger centralizado
└── server.js                 # Punto de entrada
```

---

## Flujo de Datos Completo

### 1. Recepción de datos del sensor
```
Arduino → POST /api/sensors/data
        → Validación (express-validator)
        → sensorController.receiveSensorData()
        → INSERT sensor_data (PostgreSQL)
        → UPSERT devices (last_seen)
        → 201 Created
```

### 2. Procesamiento y toma de decisiones
```
Datos almacenados
→ decisionService.generateEnergyActions(zone, people_count, movement)
→ Evalúa umbrales: High (≥5), Medium (2-4), Low (1), Empty (0)
→ Genera acciones para: lighting · ventilation · climate
```

### 3. Ejecución de acción energética
```
POST /api/energy/actions
→ energyController.executeEnergyAction()
→ INSERT energy_actions
→ UPSERT energy_system_status
→ Orden enviada al sistema físico
```

---

## Endpoints API

### Sensores
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/sensors/data` | Recibir lectura de sensor |
| GET | `/api/sensors` | Listar todos los dispositivos |
| GET | `/api/sensors/:deviceId` | Estado de un sensor concreto |

### Ocupación
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/occupancy/current` | Ocupación actual por zona |
| GET | `/api/occupancy/history` | Historial paginado |
| GET | `/api/occupancy/stats` | Estadísticas agregadas por zona |

### Energía
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/energy/actions` | Ejecutar acción energética |
| GET | `/api/energy/status` | Estado actual de sistemas |
| GET | `/api/energy/consumption` | Historial de consumo |

### Sistema
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Health check del servidor |

---

## Esquema de Base de Datos (PostgreSQL)

```
sensor_data
  id · device_id · timestamp · people_count · movement · zone · received_at

energy_actions
  id · zone · action · device_type · value · reason · executed_at

energy_system_status
  id · zone · device_type · status · value · updated_at
  UNIQUE (zone, device_type)

zones
  id · name · description · capacity · active · created_at

devices
  id · device_id · zone · description · active · last_seen · created_at
```

> Las tablas se crean ejecutando `npm run migrate` una vez configurada la conexión a PostgreSQL.

---

## Toma de Decisiones Energéticas

El `decisionService` evalúa cada lectura y genera acciones automáticas:

| Ocupación | Iluminación | Climatización | Ventilación |
|-----------|-------------|---------------|-------------|
| Alta (≥5) | 100% | 100% | 100% |
| Media (2-4) | 75% | 75% | 60% |
| Baja (1) | 50% | 50% | 30% |
| Vacío (0) | Apagado | Apagado | Apagado |

Delay de apagado: **15 minutos** sin ocupación antes de apagar sistemas.

---

## Seguridad

### Implementada
- Helmet (cabeceras HTTP seguras)
- CORS
- Validación estricta de entradas (express-validator)
- JWT preparado para autenticación de clientes
- Compresión de respuestas

### Pendiente / Futuro
- Rate limiting por IP y por device_id
- API keys para autenticar los Arduino
- Auditoría de acciones en base de datos
- HTTPS en producción

---

## Privacidad

- ✅ Sin cámaras ni reconocimiento facial
- ✅ Solo conteo numérico de personas
- ✅ Detección de movimiento binaria (sí/no)
- ✅ Datos agregados por zona, sin identificación individual
- ✅ Cumple con el principio de minimización de datos

---

## Escalabilidad

### Estado actual
- Fallback en memoria si PostgreSQL no está disponible
- Arquitectura modular y desacoplada
- Pool de conexiones configurado (máx. 10)

### Mejoras futuras
- Redis para caché de ocupación en tiempo real
- Message Queue (RabbitMQ / MQTT) para ingesta masiva de sensores
- WebSockets para dashboard en tiempo real
- Clustering de Node.js
- Contenedores Docker + Docker Compose

---

## Variables de Entorno

Ver `.env.example` para la lista completa.

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `PORT` | Puerto del servidor | No (default: 3000) |
| `NODE_ENV` | Entorno de ejecución | No (default: development) |
| `DATABASE_URL` | Cadena de conexión PostgreSQL completa | No* |
| `DB_HOST` | Host de PostgreSQL | No* |
| `DB_PORT` | Puerto de PostgreSQL | No (default: 5432) |
| `DB_NAME` | Nombre de la base de datos | No* |
| `DB_USER` | Usuario de PostgreSQL | No* |
| `DB_PASSWORD` | Contraseña de PostgreSQL | No* |
| `DB_SSL` | Activar SSL (`true`/`false`) | No (default: false) |
| `JWT_SECRET` | Clave secreta para JWT | Sí |
| `JWT_EXPIRES_IN` | Expiración del token | No (default: 24h) |
| `SENSOR_TIMEOUT_MINUTES` | Minutos sin datos para considerar sensor inactivo | No (default: 15) |

*Sin configuración de DB el sistema funciona en modo memoria.
