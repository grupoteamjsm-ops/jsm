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

4 sensores de campo envían sus lecturas a un sensor concentrador, que las agrega y las pasa al Arduino. El Arduino actúa como gateway y envía los datos al backend mediante HTTP POST con cabecera `X-API-Key`.

## Stack

- **Node.js + Express** — servidor REST
- **PostgreSQL + pg** — base de datos
- **JWT (access 15min + refresh 7d)** — autenticación con rotación de tokens
- **bcryptjs** — hash de contraseñas (12 rounds)
- **Helmet + CORS + express-rate-limit + express-validator** — seguridad

---

## Instalación y puesta en marcha

### 1. Clonar el repositorio

```bash
git clone https://github.com/grupoteamjsm-ops/jsm.git
cd jsm
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
# Windows
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

Editar `.env` con los valores correctos (ver sección **Variables de entorno** más abajo).

### 4. Crear la base de datos y las tablas

```bash
# Crear la base de datos en PostgreSQL
psql -U postgres -c "CREATE DATABASE iot_occupancy;"

# Crear todas las tablas
npm run migrate
```

### 5. Arrancar el servidor

```bash
# Desarrollo (auto-reload)
npm run dev

# Producción
npm start
```

Salida esperada:
```
Server running on port 3000
Environment: development
API available at http://localhost:3000/api
PostgreSQL connected at: ...
```

---

## ⚠️ Checklist antes de continuar el desarrollo

Al clonar este repositorio, revisar y completar lo siguiente **antes de añadir nuevas funcionalidades**:

### Base de datos
- [ ] PostgreSQL instalado y corriendo
- [ ] Base de datos `iot_occupancy` creada
- [ ] Tablas creadas con `npm run migrate`
- [ ] Variables `DB_*` correctas en `.env`

### Autenticación
- [ ] `JWT_SECRET` cambiado por un valor aleatorio seguro (mín. 32 caracteres)
- [ ] `JWT_REFRESH_SECRET` cambiado por un valor aleatorio seguro distinto al anterior
- [ ] Crear el primer usuario admin:
  ```bash
  curl -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"nombre":"Admin","email":"admin@tudominio.com","password":"contraseña-segura","rol":"admin"}'
  ```

### Sensores Arduino
- [ ] En desarrollo: `REQUIRE_API_KEY=false` (los sensores pueden enviar sin key)
- [ ] En producción: `REQUIRE_API_KEY=true` y generar una API key por cada Arduino (ver sección **API Keys**)

---

## 🚀 Activar para producción

Cuando se despliegue en un servidor real, completar este checklist **en orden**:

### 1. Variables de entorno de producción

```env
NODE_ENV=production
PORT=3000

# Cambiar por valores aleatorios largos (mín. 32 caracteres)
JWT_SECRET=genera-un-valor-aleatorio-aqui
JWT_REFRESH_SECRET=genera-otro-valor-aleatorio-distinto

# PostgreSQL con usuario de permisos mínimos (no usar postgres)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iot_occupancy
DB_USER=iot_app
DB_PASSWORD=contraseña-segura-de-produccion
DB_SSL=true

# Solo los dominios reales de la app (no usar *)
CORS_ORIGINS=https://tudominio.com,https://app.tudominio.com

# Activar autenticación de dispositivos Arduino
REQUIRE_API_KEY=true
```

### 2. Usuario PostgreSQL con permisos mínimos

```sql
CREATE USER iot_app WITH PASSWORD 'contraseña-segura';
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO iot_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO iot_app;
```

### 3. HTTPS obligatorio

- Obtener certificado SSL (Let's Encrypt es gratuito): https://certbot.eff.org/
- Configurar un proxy inverso (Nginx o Caddy) que termine SSL y reenvíe al puerto 3000
- El HSTS ya está configurado en el código — se activa automáticamente con `NODE_ENV=production`

Ejemplo mínimo con Nginx:
```nginx
server {
    listen 443 ssl;
    server_name tudominio.com;
    ssl_certificate     /etc/letsencrypt/live/tudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tudominio.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 4. Generar API Keys para los Arduino

Cada dispositivo Arduino necesita su propia API key. Generarla e insertarla en la BD:

```bash
# Generar una key aleatoria
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Ejemplo: a3f8c2d1e4b5...

# Insertar en la BD (el hash lo calcula el sistema internamente)
# Por ahora insertar directamente con el hash SHA-256:
node -e "
const crypto = require('crypto');
const key = 'PEGA_AQUI_LA_KEY_GENERADA';
const hash = crypto.createHash('sha256').update(key).digest('hex');
console.log('Hash:', hash);
"
```

```sql
INSERT INTO api_keys (device_id, key_hash, zone, descripcion)
VALUES ('arduino-001', 'HASH_CALCULADO', 'oficina-a', 'Arduino principal');
```

El Arduino debe enviar la key en cada petición:
```cpp
// En el sketch de Arduino
http.addHeader("X-API-Key", "LA_KEY_EN_CLARO");
http.addHeader("Content-Type", "application/json");
```

### 5. Backups automáticos

```bash
# Añadir al cron (Linux) — backup diario a las 2:00
0 2 * * * pg_dump -U iot_app iot_occupancy > /backups/iot_$(date +\%Y\%m\%d).sql
```

### 6. Proceso persistente con PM2

```bash
npm install -g pm2
pm2 start src/server.js --name iot-backend
pm2 save
pm2 startup
```

---

## Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con auto-reload (nodemon) |
| `npm start` | Servidor en producción |
| `npm run migrate` | Crear/actualizar tablas en PostgreSQL |

---

## API Endpoints

Todos los endpoints excepto `/health`, `/api/auth/login`, `/api/auth/register` y `/api/auth/refresh` requieren cabecera:
```
Authorization: Bearer <access_token>
```

### Autenticación
```
POST   /api/auth/register       Crear cuenta
POST   /api/auth/login          Iniciar sesión → devuelve access_token + refresh_token
POST   /api/auth/refresh        Renovar access_token con refresh_token
POST   /api/auth/logout         Cerrar sesión actual
POST   /api/auth/logout-all     Cerrar todas las sesiones
GET    /api/auth/me             Perfil del usuario autenticado
PUT    /api/auth/password       Cambiar contraseña
```

### Sensores (Arduino → Backend)
```
POST   /api/sensors/data        Enviar lectura de sensor  [X-API-Key en producción]
GET    /api/sensors             Listar dispositivos registrados
GET    /api/sensors/:deviceId   Estado de un sensor
```

### Ocupación
```
GET    /api/occupancy/current   Ocupación actual por zona
GET    /api/occupancy/by-zone   Resumen completo: ocupación + estado energético por zona
GET    /api/occupancy/by-hour   Patrón horario de ocupación (media por hora del día)
GET    /api/occupancy/history   Historial paginado  ?zone= &device_id= &from= &to= &limit= &offset=
GET    /api/occupancy/stats     Estadísticas agregadas  ?zone= &from= &to=
```

### Energía
```
POST   /api/energy/actions      Ejecutar acción  [solo admin y operador]
GET    /api/energy/status       Estado actual de sistemas (luces, clima, ventilación)
GET    /api/energy/consumption  Historial de consumo
```

### Sistema
```
GET    /health                  Health check
```

---

## Esquema de datos del sensor

El Arduino envía este JSON en cada lectura:

```json
{
  "device_id":    "sensor-001",
  "timestamp":    "2026-04-21T10:00:00Z",
  "people_count": 3,
  "movement":     true,
  "zone":         "oficina-a"
}
```

`timestamp` es opcional — si no se envía, el backend usa la hora del servidor.

---

## Lógica de automatización energética

Al recibir cada lectura, el backend decide automáticamente:

| Ocupación | Iluminación | Climatización | Ventilación |
|-----------|-------------|---------------|-------------|
| Alta (≥5) | 100% | 100% | 100% |
| Media (2-4) | 75% | 75% | 60% |
| Baja (1) | 50% | 50% | 30% |
| Vacío (0) | Apagado | Apagado | Apagado |

Los sistemas se apagan automáticamente tras **15 minutos** sin actividad (`SENSOR_TIMEOUT_MINUTES`).

---

## Roles de usuario

| Rol | Permisos |
|-----|---------|
| `admin` | Todo: leer, ejecutar acciones, gestionar usuarios |
| `operador` | Leer datos + ejecutar acciones energéticas |
| `viewer` | Solo lectura de datos |

---

## Variables de entorno

Ver `.env.example` para la lista completa. Las más importantes:

| Variable | Descripción | Producción |
|----------|-------------|-----------|
| `NODE_ENV` | Entorno | `production` |
| `JWT_SECRET` | Clave access token | Valor aleatorio largo |
| `JWT_REFRESH_SECRET` | Clave refresh token | Valor aleatorio distinto |
| `DB_PASSWORD` | Contraseña PostgreSQL | Contraseña segura |
| `CORS_ORIGINS` | Orígenes permitidos | Dominios reales (no `*`) |
| `REQUIRE_API_KEY` | Auth de Arduino | `true` |

---

## Seguridad implementada

Ver [SECURITY.md](SECURITY.md) para la documentación completa (sección 10 del proyecto).

Resumen:
- Rate limiting por capas (auth: 10/15min, sensores: 1000/min, general: 200/15min)
- JWT con rotación de refresh tokens
- bcrypt 12 rounds para contraseñas
- API Keys para dispositivos Arduino (hash SHA-256 en BD)
- Queries parametrizadas (sin inyección SQL)
- Errores sin información interna en producción
- HSTS activado en producción

---

## Documentación adicional

- [ARCHITECTURE.md](ARCHITECTURE.md) — Arquitectura detallada del sistema
- [SECURITY.md](SECURITY.md) — Seguridad y privacidad (sección 10)
- [INSTALLATION.md](INSTALLATION.md) — Guía de instalación paso a paso
- `.env.example` — Todas las variables de entorno disponibles

---

## Próximas mejoras

- [ ] WebSockets para dashboard en tiempo real
- [ ] MQTT para comunicación directa con Arduino
- [ ] Predicción de ocupación con IA
- [ ] Integración con sistemas de reservas de salas
- [ ] Docker + Docker Compose
- [ ] Tests unitarios e integración
- [ ] Swagger / OpenAPI para documentación interactiva del API

## Licencia

ISC
