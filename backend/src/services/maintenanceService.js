const { query } = require('../config/database');

/**
 * Servicio de mantenimiento periódico
 *
 * POLÍTICA DE DATOS:
 * - sensor_data y energy_actions NUNCA se borran — se archivan para análisis histórico anual
 * - Los datos archivados siguen siendo consultables desde sensor_data_archive
 * - Solo se eliminan refresh_tokens expirados/revocados (no son datos de negocio)
 */

const ARCHIVE_DAYS = parseInt(process.env.DATA_RETENTION_DAYS) || 365;

/**
 * Archivar lecturas de sensores más antiguas que ARCHIVE_DAYS
 * Los datos se mueven a sensor_data_archive (no se pierden)
 */
const archivarSensorData = async () => {
  try {
    // Crear tabla de archivo si no existe
    await query(`
      CREATE TABLE IF NOT EXISTS sensor_data_archive
      (LIKE sensor_data INCLUDING ALL)
    `);

    // Mover registros antiguos al archivo
    const moved = await query(`
      WITH moved AS (
        DELETE FROM sensor_data
        WHERE timestamp < NOW() - INTERVAL '${ARCHIVE_DAYS} days'
        RETURNING *
      )
      INSERT INTO sensor_data_archive SELECT * FROM moved
    `);

    const count = moved.rowCount || 0;
    if (count > 0) {
      console.log(`[Maintenance] sensor_data: ${count} registros archivados (>${ARCHIVE_DAYS} días)`);
    }
    return count;
  } catch (error) {
    console.error('[Maintenance] Error archivando sensor_data:', error.message);
    return 0;
  }
};

/**
 * Limpiar refresh_tokens expirados o revocados hace más de 7 días
 * Estos SÍ se borran — no son datos de negocio
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
 * Ejecutar todas las tareas de mantenimiento
 */
const runMaintenance = async () => {
  console.log('[Maintenance] Iniciando mantenimiento periódico...');
  const [archived, tokens] = await Promise.all([
    archivarSensorData(),
    limpiarRefreshTokens()
  ]);
  console.log(`[Maintenance] Completado — archivados: ${archived}, tokens limpiados: ${tokens}`);
};

module.exports = { runMaintenance, archivarSensorData, limpiarRefreshTokens };
