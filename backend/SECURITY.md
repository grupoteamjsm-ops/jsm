# Seguridad y Privacidad del Sistema IoT

## 10.1 Introducción

El sistema gestiona datos de ocupación de espacios físicos. Aunque no se emplean datos personales directos ni sistemas de captura de imagen, se han implementado medidas de seguridad en todas las capas del sistema y se documentan las recomendaciones para el despliegue en producción.

---

## 10.2 Privacidad de los Datos

Uno de los pilares del proyecto es el respeto a la privacidad de los usuarios.

### Medidas implementadas

| Medida | Estado |
|--------|--------|
| Sin cámaras ni reconocimiento facial | ✅ Por diseño |
| Datos no identificables (conteo, movimiento, zona) | ✅ Implementado |
| Sin almacenamiento de datos personales de ocupantes | ✅ Implementado |
| Minimización de datos (solo lo necesario) | ✅ Implementado |
| Datos agregados por zona, sin identificación individual | ✅ Implementado |

### Datos recogidos

```json
{
  "device_id":    "sensor-001",
  "people_count": 3,
  "movement":     true,
  "zone":         "oficina-a",
  "timestamp":    "2026-04-21T10:00:00Z"
}
```

Ninguno de estos campos identifica a personas individuales.

### Alineación con RGPD

- **Minimización de datos**: solo se recogen los datos estrictamente necesarios
- **Limitación de finalidad**: uso exclusivo para eficiencia energética y análisis de ocupación
- **Transparencia**: el sistema debe informar a los usuarios del espacio de su existencia

---

## 10.3 Seguridad en la Comunicación

### Implementado

- **Validación de todos los datos de entrada** — express-validator en todos los endpoints
- **Sanitización de inputs** — normalización de emails, tipos estrictos
- **Límite de tamaño del body** — máximo 10KB por petición (previene ataques de payload masivo)
- **Cabeceras HTTP seguras** — Helmet configura automáticamente:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection`
  - `Referrer-Policy`
  - `Content-Security-Policy`

### Para producción

- **HTTPS/TLS obligatorio** — cifra las comunicaciones entre Arduino y backend, previniendo ataques Man-in-the-Middle (MitM)
  - Configurar certificado SSL (Let's Encrypt es gratuito)
  - Activar HSTS en `.env`: `NODE_ENV=production` (ya configurado en server.js)
- **Comunicación Arduino → Backend**: usar HTTPS en el sketch de Arduino

---

## 10.4 Seguridad en el Backend

### Implementado

#### Autenticación y autorización
- **JWT con doble token**: access token (15 min) + refresh token (7 días)
- **Rotación de refresh tokens**: cada uso genera un nuevo token, el anterior queda revocado
- **Roles de usuario**: `admin`, `operador`, `viewer` con permisos diferenciados
- **bcrypt** (12 rounds) para hash de contraseñas — resistente a ataques de fuerza bruta
- **Logout real**: los tokens se revocan en base de datos

#### Autenticación de dispositivos IoT
- **API Keys para Arduino** — cabecera `X-API-Key`
- Las keys se guardan como **hash SHA-256** en BD (nunca en claro)
- Activar en producción: `REQUIRE_API_KEY=true` en `.env`

#### Protección contra ataques

| Ataque | Protección |
|--------|-----------|
| Brute force en login | Rate limit: 10 intentos/15 min por IP |
| DoS / flood general | Rate limit: 200 req/15 min por IP |
| Flood de sensores | Rate limit: 1000 req/min por IP |
| Inyección SQL | Queries parametrizadas (pg driver) |
| XSS | Helmet + validación de inputs |
| CSRF | JWT stateless (no cookies) |
| Payload masivo | Body limit: 10KB |
| Rutas no autenticadas | JWT requerido en todos los endpoints de datos |

#### Gestión de errores controlada
- En producción: mensajes genéricos sin stack trace
- En desarrollo: mensajes detallados para depuración
- Errores de PostgreSQL mapeados a códigos HTTP apropiados
- Nunca se expone información interna en respuestas de error

---

## 10.5 Seguridad en la Base de Datos

### Implementado

- **Queries parametrizadas** — previene inyección SQL en todos los controladores
- **Roles de usuario en la app** — admin/operador/viewer
- **Tokens hasheados** — refresh tokens y API keys guardados como SHA-256
- **Pool de conexiones** — máximo 10 conexiones, timeout configurado

### Para producción

- **Credenciales seguras**: cambiar la contraseña por defecto de PostgreSQL
- **Restricción de acceso**: PostgreSQL solo accesible desde localhost o red privada
- **Roles de BD**: crear un usuario PostgreSQL con permisos mínimos (solo SELECT/INSERT/UPDATE en las tablas necesarias)
  ```sql
  CREATE USER iot_app WITH PASSWORD 'contraseña-segura';
  GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO iot_app;
  ```
- **Backups periódicos**:
  ```bash
  pg_dump -U postgres iot_occupancy > backup_$(date +%Y%m%d).sql
  ```
- **Cifrado en reposo**: activar cifrado del disco del servidor (BitLocker en Windows, LUKS en Linux)

---

## 10.6 Consideraciones Legales (RGPD)

Aunque el sistema no trata datos personales directos, se recomienda:

1. **Informar** a los ocupantes del espacio de la existencia del sistema de monitorización
2. **Documentar** el tratamiento de datos en el registro de actividades de la organización
3. **Revisar** periódicamente que los datos recogidos siguen siendo los mínimos necesarios
4. **Establecer** un período de retención de datos (ej. borrar sensor_data con más de 1 año)

---

## 10.7 Tabla de Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación | Estado |
|--------|-------------|---------|-----------|--------|
| Interceptación de datos | Media | Alto | HTTPS/TLS | ⏳ Producción |
| Acceso no autorizado a API | Alta | Alto | JWT + roles + rate limit | ✅ Implementado |
| Brute force en login | Alta | Alto | Rate limit 10 intentos/15 min | ✅ Implementado |
| Datos erróneos de sensores | Media | Medio | Validación + tipos estrictos | ✅ Implementado |
| Inyección SQL | Baja | Alto | Queries parametrizadas | ✅ Implementado |
| DoS / flood | Media | Alto | Rate limiting por capas | ✅ Implementado |
| Dispositivo Arduino comprometido | Baja | Medio | API Keys (activar en producción) | ⏳ Producción |
| Fallo del sistema | Baja | Medio | Logs + fallback memoria | ✅ Implementado |
| Pérdida de datos | Baja | Alto | Backups periódicos | ⏳ Producción |
| Credenciales expuestas | Baja | Alto | .env en .gitignore | ✅ Implementado |

---

## 10.8 Checklist de Seguridad para Producción

```
[ ] Cambiar JWT_SECRET y JWT_REFRESH_SECRET por valores aleatorios largos
[ ] Cambiar contraseña de PostgreSQL
[ ] Activar HTTPS con certificado SSL
[ ] Poner NODE_ENV=production
[ ] Poner REQUIRE_API_KEY=true y generar API keys para cada Arduino
[ ] Restringir CORS_ORIGINS a los dominios reales de la app
[ ] Crear usuario PostgreSQL con permisos mínimos
[ ] Configurar backups automáticos de la BD
[ ] Revisar logs periódicamente
[ ] Establecer política de retención de datos
```

---

## 10.9 Variables de Entorno Sensibles

Estas variables **nunca** deben subirse a un repositorio:

| Variable | Descripción |
|----------|-------------|
| `JWT_SECRET` | Clave de firma de access tokens |
| `JWT_REFRESH_SECRET` | Clave de firma de refresh tokens |
| `DB_PASSWORD` | Contraseña de PostgreSQL |
| `DATABASE_URL` | Cadena de conexión completa |

El archivo `.env` está incluido en `.gitignore`. Solo se sube `.env.example` con valores de ejemplo.
