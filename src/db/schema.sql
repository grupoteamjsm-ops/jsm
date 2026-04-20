-- ============================================================
-- IoT Occupancy System - PostgreSQL Schema
-- ============================================================

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Tabla: sensor_data
-- Almacena cada lectura enviada por los sensores Arduino
-- ============================================================
CREATE TABLE IF NOT EXISTS sensor_data (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id    VARCHAR(100) NOT NULL,
    timestamp    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    people_count INTEGER      NOT NULL DEFAULT 0 CHECK (people_count >= 0),
    movement     BOOLEAN      NOT NULL DEFAULT FALSE,
    zone         VARCHAR(100) NOT NULL,
    received_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_sensor_data_device_id  ON sensor_data (device_id);
CREATE INDEX IF NOT EXISTS idx_sensor_data_zone       ON sensor_data (zone);
CREATE INDEX IF NOT EXISTS idx_sensor_data_timestamp  ON sensor_data (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_sensor_data_zone_ts    ON sensor_data (zone, timestamp DESC);

-- ============================================================
-- Tabla: energy_actions
-- Registra cada acción ejecutada sobre sistemas energéticos
-- ============================================================
CREATE TABLE IF NOT EXISTS energy_actions (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone        VARCHAR(100) NOT NULL,
    action      VARCHAR(20)  NOT NULL CHECK (action IN ('turn_on', 'turn_off', 'adjust')),
    device_type VARCHAR(20)  NOT NULL CHECK (device_type IN ('lighting', 'ventilation', 'climate')),
    value       INTEGER      CHECK (value BETWEEN 0 AND 100),
    reason      TEXT,
    executed_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_energy_actions_zone    ON energy_actions (zone);
CREATE INDEX IF NOT EXISTS idx_energy_actions_zone_ts ON energy_actions (zone, executed_at DESC);

-- ============================================================
-- Tabla: energy_system_status
-- Estado actual de cada sistema energético por zona
-- ============================================================
CREATE TABLE IF NOT EXISTS energy_system_status (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone        VARCHAR(100) NOT NULL,
    device_type VARCHAR(20)  NOT NULL CHECK (device_type IN ('lighting', 'ventilation', 'climate')),
    status      VARCHAR(10)  NOT NULL DEFAULT 'off' CHECK (status IN ('on', 'off')),
    value       INTEGER      DEFAULT 0 CHECK (value BETWEEN 0 AND 100),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    UNIQUE (zone, device_type)
);

CREATE INDEX IF NOT EXISTS idx_energy_status_zone ON energy_system_status (zone);

-- ============================================================
-- Tabla: usuarios
-- Gestión de acceso al sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id           UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre       VARCHAR(100) NOT NULL,
    email        VARCHAR(150) UNIQUE NOT NULL,
    password_hash TEXT        NOT NULL,
    rol          VARCHAR(20)  NOT NULL DEFAULT 'operador' CHECK (rol IN ('admin', 'operador', 'viewer')),
    activo       BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    ultimo_login TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios (email);

-- ============================================================
-- Tabla: refresh_tokens
-- Gestión de tokens de refresco para autenticación persistente
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id  UUID        NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revocado    BOOLEAN     NOT NULL DEFAULT FALSE,
    user_agent  TEXT,
    ip          VARCHAR(45)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario ON refresh_tokens (usuario_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash    ON refresh_tokens (token_hash);

-- ============================================================
-- Tabla: zones
-- Catálogo de zonas del espacio de trabajo
-- ============================================================
CREATE TABLE IF NOT EXISTS zones (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    capacity    INTEGER      DEFAULT 0,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Tabla: devices
-- Catálogo de sensores/dispositivos registrados
-- ============================================================
CREATE TABLE IF NOT EXISTS devices (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id   VARCHAR(100) NOT NULL UNIQUE,
    zone        VARCHAR(100),
    description TEXT,
    active      BOOLEAN      NOT NULL DEFAULT TRUE,
    last_seen   TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices (device_id);
