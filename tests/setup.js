/**
 * Setup global para tests
 * Carga variables de entorno de test antes de cada suite
 */
process.env.NODE_ENV       = 'test';
process.env.JWT_SECRET     = 'test-secret-key-for-testing-only';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-testing';
process.env.JWT_EXPIRES_IN = '15m';
process.env.PORT           = '3001';

// Deshabilitar logs en tests
process.env.LOG_LEVEL = 'silent';
