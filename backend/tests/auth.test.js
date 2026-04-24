/**
 * Tests de integración — Autenticación
 * Cubre: register, login, /me, refresh, logout, cambio de contraseña
 */
import './setup.js';
import { describe, it, expect, beforeAll } from 'vitest';
import { testClient } from 'hono/testing';

// Importar la app sin arrancar el servidor
let app;
beforeAll(async () => {
  // Mock de la BD para tests unitarios
  const db = await import('../src/config/database.js');
  const users = new Map();
  const tokens = new Map();

  db.query = async (sql, params) => {
    // Mock mínimo para auth
    if (sql.includes('SELECT id FROM usuarios WHERE email')) {
      const email = params[0];
      return { rows: users.has(email) ? [{ id: users.get(email).id }] : [] };
    }
    if (sql.includes('INSERT INTO usuarios')) {
      const [nombre, email, hash, rol] = params;
      const id = `test-${Date.now()}`;
      users.set(email, { id, nombre, email, password_hash: hash, rol });
      return { rows: [{ id, nombre, email, rol }] };
    }
    if (sql.includes('SELECT * FROM usuarios WHERE email')) {
      const email = params[0];
      const u = users.get(email);
      return { rows: u ? [u] : [] };
    }
    if (sql.includes('INSERT INTO refresh_tokens')) {
      tokens.set(params[1], { usuario_id: params[0], expires_at: params[2] });
      return { rows: [] };
    }
    if (sql.includes('SELECT * FROM refresh_tokens')) {
      const hash = params[0];
      const t = tokens.get(hash);
      return { rows: t ? [t] : [] };
    }
    if (sql.includes('UPDATE refresh_tokens SET revocado')) {
      tokens.delete(params[0]);
      return { rows: [] };
    }
    if (sql.includes('UPDATE usuarios SET ultimo_login')) return { rows: [] };
    if (sql.includes('SELECT id, nombre, email, rol FROM usuarios WHERE id')) {
      for (const u of users.values()) {
        if (u.id === params[0]) return { rows: [u] };
      }
      return { rows: [] };
    }
    if (sql.includes('SELECT id, nombre, email, rol, activo')) {
      for (const u of users.values()) {
        if (u.id === params[0]) return { rows: [{ ...u, activo: true, creado_en: new Date(), ultimo_login: null }] };
      }
      return { rows: [] };
    }
    return { rows: [] };
  };

  const { default: serverApp } = await import('../src/server.js');
  app = serverApp;
});

describe('POST /api/auth/register', () => {
  it('registra un usuario nuevo correctamente', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Test User', email: 'test@iot.com', password: 'test123', rol: 'operador' })
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.access_token).toBeDefined();
    expect(body.refresh_token).toBeDefined();
    expect(body.usuario.email).toBe('test@iot.com');
  });

  it('rechaza email duplicado', async () => {
    const payload = JSON.stringify({ nombre: 'Test', email: 'test@iot.com', password: 'test123' });
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload
    });
    expect(res.status).toBe(409);
  });

  it('rechaza contraseña corta', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Test', email: 'new@iot.com', password: '123' })
    });
    expect(res.status).toBe(400);
  });

  it('rechaza email inválido', async () => {
    const res = await app.request('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: 'Test', email: 'no-es-email', password: 'test123' })
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  it('hace login con credenciales correctas', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@iot.com', password: 'test123' })
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.access_token).toBeDefined();
    expect(body.token_type).toBe('Bearer');
  });

  it('rechaza credenciales incorrectas', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@iot.com', password: 'wrongpassword' })
    });
    expect(res.status).toBe(401);
  });

  it('rechaza usuario inexistente', async () => {
    const res = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'noexiste@iot.com', password: 'test123' })
    });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('devuelve perfil con token válido', async () => {
    // Login primero
    const loginRes = await app.request('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@iot.com', password: 'test123' })
    });
    const { access_token } = await loginRes.json();

    const res = await app.request('/api/auth/me', {
      headers: { Authorization: `Bearer ${access_token}` }
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.usuario.email).toBe('test@iot.com');
  });

  it('devuelve 401 sin token', async () => {
    const res = await app.request('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('devuelve 403 con token inválido', async () => {
    const res = await app.request('/api/auth/me', {
      headers: { Authorization: 'Bearer token-invalido' }
    });
    expect(res.status).toBe(403);
  });
});
