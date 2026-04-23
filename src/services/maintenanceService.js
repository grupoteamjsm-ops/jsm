const { query } = require('../config/database');

/**
 * Servicio de mantenimiento periódico
 * - Limpia sensor_data antiguos (retención configurable)
 * - Limpia refresh_tokens expirados o revocados
 */

const RETENTION_DAYS = parseInt(process.env.DATA_RETENTION_DAYS) || 90;

/**
 * Borrar lecturas de sensores más antiguas que DATA_RETENTION_DAYS
 */
const limpiarSensorData = async () => {
  try {
    const result = await query(
      `DELETE FROM sensor_data
       WHERE timestamp < NOW() - INTERVAL '${RETENTION_DAYS} days'`,
    );
    const deleted = result.rowCount || 0;
    if (deleted > 0) {
      console.log(`[Maintenance] sensor_data: ${deleted} registros eliminados (>${RETENTION_DAYS} días)`);
    }
    return deleted;
  } catch (error) {
    console.error('[Maintenance] Error limpiando sensor_data:', error.message);
    return 0;
  }
};

/**
 * Borrar refresh_tokens expirados o revocados hace más de 7 días
 */
const limpiarRefreshTokens = async () => {
  try {
    const result = await query(
      `DELETE FROM refresh_tokens
       WHERE revocado = TRUE
          OR expires_at < NOW() - INTERVAL '7 days'`
    );
    const deleted = result.rowCount || 0;
    if (deleted > 0) {
      console.log(`[Maintenance] refresh_tokens: ${deleted} tokens eliminados`);
    }
    return deleted;
  } catch (error) {
    console.error('[Maintenance] Error limpiando refresh_tokens:', error.message);
    return 0;
  }
};

/**
 * Borrar energy_actions más antiguas que DATA_RETENTION_DAYS
 */
const limpiarEnergyActions = async () => {
  try {
    const result = await query(
      `DELETE FROM energy_actions
       WHERE executed_at < NOW() - INTERVAL '${RETENTION_DAYS} days'`
    );
    const deleted = result.rowCount || 0;
    if (deleted > 0) {
      console.log(`[Maintenance] energy_actions: ${deleted} registros eliminados (>${RETENTION_DAYS} días)`);
    }
    return deleted;
  } catch (error) {
    console.error('[Maintenance] Error limpiando energy_actions:', error.message);
    return 0;
  }
};

/**
 * Ejecutar todas las tareas de mantenimiento
 */
const runMaintenance = async () => {
  console.log('[Maintenance] Iniciando limpieza periódica...');
  const [s, t, e] = await Promise.all([
    limpiarSensorData(),
    limpiarRefreshTokens(),
    limpiarEnergyActions()
  ]);
  console.log(`[Maintenance] Completado — sensor_data: ${s}, tokens: ${t}, energy_actions: ${e}`);
};

module.exports = { runMaintenance, limpiarSensorData, limpiarRefreshTokens, limpiarEnergyActions };
