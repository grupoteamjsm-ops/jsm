# Guía de Instalación

## Requisitos Previos

### Software Necesario

1. **Node.js** (v18 o superior)
   - Descargar: https://nodejs.org/
   - Verificar: `node --version`

2. **npm** (incluido con Node.js)
   - Verificar: `npm --version`

3. **PostgreSQL** (v14 o superior) — para persistencia de datos
   - Descargar: https://www.postgresql.org/download/
   - O usar un servicio cloud (Supabase, Railway, Render, etc.)
   - Sin PostgreSQL el sistema funciona en **modo memoria** (datos no persistentes)

4. **Git** (opcional)
   - Descargar: https://git-scm.com/

---

## Instalación Paso a Paso

### 1. Obtener el Proyecto

```bash
# Con Git
git clone <url-del-repositorio>
cd iot-occupancy-backend

# O descomprime el ZIP en una carpeta
```

### 2. Instalar Dependencias

```bash
npm install
```

Dependencias instaladas:

| Paquete | Versión | Uso |
|---------|---------|-----|
| express | ^4.18.2 | Framework web |
| cors | ^2.8.5 | Control de acceso |
| dotenv | ^16.4.5 | Variables de entorno |
| uuid | ^9.0.1 | IDs únicos |
| jsonwebtoken | ^9.0.2 | Autenticación JWT |
| bcryptjs | ^2.4.3 | Hash de contraseñas |
| pg | ^8.11.5 | Driver PostgreSQL |
| express-validator | ^7.0.1 | Validación de entradas |
| morgan | ^1.10.0 | Logging HTTP |
| helmet | ^7.1.0 | Seguridad HTTP |
| compression | ^1.7.4 | Compresión gzip |
| nodemon | ^3.1.0 | Auto-reload (dev) |

### 3. Configurar Variables de Entorno

```bash
# Windows
copy .env.example .env

# Linux / macOS
cp .env.example .env
```

Editar `.env` con tus valores:

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=cambia-esto-por-una-clave-segura

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=iot_occupancy
DB_USER=postgres
DB_PASSWORD=tu_password
```

### 4. Configurar PostgreSQL

#### Opción A: PostgreSQL local

1. Instalar PostgreSQL
2. Crear la base de datos:
   ```sql
   CREATE DATABASE iot_occupancy;
   ```
3. Rellenar las variables `DB_*` en `.env`
4. Ejecutar la migración:
   ```bash
   npm run migrate
   ```

#### Opción B: Cadena de conexión completa (cloud)

```env
DATABASE_URL=postgresql://usuario:password@host:5432/iot_occupancy
DB_SSL=true
```

Luego ejecutar:
```bash
npm run migrate
```

#### Opción C: Sin base de datos (modo memoria)

No configures ninguna variable `DB_*` ni `DATABASE_URL`.  
El sistema arrancará en modo memoria — los datos se pierden al reiniciar el servidor.

### 5. Arrancar el Servidor

```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

Salida esperada:
```
Server running on port 3000
Environment: development
API available at http://localhost:3000/api
PostgreSQL connected at: 2026-04-20T12:00:00.000Z   ← si hay DB configurada
```

### 6. Verificar que Funciona

```bash
# Windows PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/health" | ConvertTo-Json

# Linux / macOS
curl http://localhost:3000/health
```

Respuesta esperada:
```json
{
  "status": "ok",
  "message": "IoT Occupancy Backend is running",
  "timestamp": "2026-04-20T12:00:00.000Z"
}
```

---

## Verificar Dependencias Instaladas

```bash
npm list --depth=0
```

---

## Configuración del Arduino

El Arduino debe enviar peticiones HTTP POST a:

```
POST http://<ip-del-servidor>:3000/api/sensors/data
Content-Type: application/json
```

Con este cuerpo JSON:

```json
{
  "device_id":    "sensor-001",
  "people_count": 3,
  "movement":     true,
  "zone":         "office-a"
}
```

El campo `timestamp` es opcional — si no se envía, el backend usa la hora actual del servidor.

### Topología de sensores

```
[Sensor 1]──┐
[Sensor 2]──┤
            ├──► [Concentrador] ──► [Arduino] ──► POST /api/sensors/data
[Sensor 3]──┤
[Sensor 4]──┘
```

Cada sensor tiene su propio `device_id`. El concentrador puede enviar una lectura por sensor o una lectura agregada, según la implementación del firmware.

---

## Comandos de Referencia

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor con auto-reload |
| `npm start` | Servidor en producción |
| `npm run migrate` | Crear tablas en PostgreSQL |
| `npm list --depth=0` | Ver dependencias instaladas |

---

## Solución de Problemas

### "Cannot find module"
```bash
# Reinstalar dependencias
Remove-Item -Recurse -Force node_modules   # Windows
npm install
```

### "Port 3000 is already in use"
Cambiar el puerto en `.env`:
```env
PORT=3001
```

### Error de conexión a PostgreSQL
1. Verificar que el servicio PostgreSQL está corriendo
2. Verificar usuario, contraseña y nombre de base de datos en `.env`
3. Si usas cloud, verificar que `DB_SSL=true`
4. Si no tienes PostgreSQL aún, dejar las variables `DB_*` vacías para usar modo memoria

### "nodemon: command not found"
```bash
npm install -g nodemon
```

---

## Próximos Pasos

1. ✅ Instalación completada
2. 📖 Leer [README.md](README.md) — uso del API
3. 🏗️ Leer [ARCHITECTURE.md](ARCHITECTURE.md) — arquitectura del sistema
4. 🗄️ Configurar PostgreSQL y ejecutar `npm run migrate`
5. 🔧 Programar el Arduino para enviar datos al endpoint `/api/sensors/data`
6. 🧪 Probar el API con `test-api.ps1`

---

## Recursos

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [node-postgres (pg)](https://node-postgres.com/)
- [JWT.io](https://jwt.io/)
