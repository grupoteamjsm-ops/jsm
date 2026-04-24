const { query } = require('../config/database');

// ============================================================
// Configuración de umbrales y tiempos
// ============================================================
const CONFIG = {
  umbrales: {
    alto:  5,   // >= 5 personas → nivel alto
    medio: 2,   // >= 2 personas → nivel medio
    bajo:  1    // >= 1 persona  → nivel bajo
                // 0 personas    → vacío
  },
  minutosParaApagar: parseInt(process.env.SENSOR_TIMEOUT_MINUTES) || 15
};

// ============================================================
// Helpers
// ============================================================

/**
 * Determina el nivel de ocupación
 */
const nivelOcupacion = (peopleCount) => {
  if (peopleCount >= CONFIG.umbrales.alto)  return 'alto';
  if (peopleCount >= CONFIG.umbrales.medio) return 'medio';
  if (peopleCount >= CONFIG.umbrales.bajo)  return 'bajo';
  return 'vacio';
};

/**
 * Tabla de acciones por nivel de ocupación
 * { device_type: { nivel: { action, value } } }
 */
const TABLA_ACCIONES = {
  lighting: {
    alto:  { action: 'adjust', value: 100 },
    medio: { action: 'adjust', value: 75  },
    bajo:  { action: 'adjust', value: 50  },
    vacio: { action: 'turn_off', value: 0 }
  },
  climate: {
    alto:  { action: 'adjust', value: 100 },
    medio: { action: 'adjust', value: 75  },
    bajo:  { action: 'adjust', value: 50  },
    vacio: { action: 'turn_off', value: 0 }
  },
  ventilation: {
    alto:  { action: 'adjust', value: 100 },
    medio: { action: 'adjust', value: 60  },
    bajo:  { action: 'adjust', value: 30  },
    vacio: { action: 'turn_off', value: 0 }
  }
};

// ============================================================
// Lógica principal de decisión
// ============================================================

/**
 * Evalúa los datos de un sensor y genera las acciones energéticas
 * necesarias para la zona. Persiste las acciones en la BD.
 *
 * @param {string}  zone        - Zona del espacio
 * @param {number}  peopleCount - Número de personas detectadas
 * @param {boolean} movement    - Detección de movimiento
 * @returns {Array} acciones ejecutadas
 */
const procesarDecision = async (zone, peopleCount, movement) => {
  const nivel = nivelOcupacion(peopleCount);
  const acciones = [];

  // Si no hay personas pero sí movimiento, tratar como nivel bajo
  const nivelEfectivo = (nivel === 'vacio' && movement) ? 'bajo' : nivel;

  for (const deviceType of ['lighting', 'climate', 'ventilation']) {
    const { action, value } = TABLA_ACCIONES[deviceType][nivelEfectivo];

    // Comprobar el estado actual para evitar acciones redundantes
    let estadoActual = null;
    try {
      const res = await query(
        'SELECT status, value FROM energy_system_status WHERE zone = $1 AND device_type = $2',
        [zone, deviceType]
      );
      estadoActual = res.rows[0] || null;
    } catch { /* sin BD, continuar */ }

    // Si ya está en el estado deseado, no hacer nada
    if (estadoActual) {
      const yaApagado  = action === 'turn_off' && estadoActual.status === 'off';
      const mismoValor = action === 'adjust'   && estadoActual.status === 'on' && estadoActual.value === value;
      if (yaApagado || mismoValor) continue;
    }

    const razon = `Ocupación ${nivelEfectivo} (${peopleCount} personas${movement ? ', movimiento' : ''})`;

    // Persistir acción
    try {
      const newStatus = action === 'turn_off' ? 'off' : 'on';
      const newValue  = action === 'turn_off' ? 0 : value;

      await query(
        `INSERT INTO energy_actions (zone, action, device_type, value, reason)
         VALUES ($1, $2, $3, $4, $5)`,
        [zone, action, deviceType, newValue, razon]
      );

      await query(
        `INSERT INTO energy_system_status (zone, device_type, status, value, updated_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (zone, device_type) DO UPDATE
           SET status = EXCLUDED.status, value = EXCLUDED.value, updated_at = NOW()`,
        [zone, deviceType, newStatus, newValue]
      );
    } catch { /* sin BD, solo registrar */ }

    acciones.push({ zone, device_type: deviceType, action, value, razon });
    console.log(`[Decision] ${zone} | ${deviceType} → ${action} (${value}%) | ${razon}`);
  }

  return acciones;
};

/**
 * Comprueba zonas sin actividad reciente y apaga sus sistemas
 * Llamar periódicamente (ej. cada minuto)
 */
const apagadoAutomatico = async () => {
  try {
    const limite = new Date(Date.now() - CONFIG.minutosParaApagar * 60 * 1000).toISOString();

    // Zonas con sistemas encendidos pero sin lecturas recientes
    const result = await query(
      `SELECT DISTINCT ess.zone
       FROM energy_system_status ess
       WHERE ess.status = 'on'
         AND NOT EXISTS (
           SELECT 1 FROM sensor_data sd
           WHERE sd.zone = ess.zone
             AND sd.timestamp > $1
         )`,
      [limite]
    );

    for (const row of result.rows) {
      console.log(`[Decision] Apagado automático en zona: ${row.zone} (sin actividad ${CONFIG.minutosParaApagar} min)`);
      await procesarDecision(row.zone, 0, false);
    }
  } catch (error) {
    console.error('[Decision] Error en apagado automático:', error.message);
  }
};

// ============================================================
// Exports
// ============================================================
module.exports = {
  procesarDecision,
  apagadoAutomatico,
  nivelOcupacion,
  CONFIG
};
