/**
 * Validación de variables de entorno al arrancar
 * Si falta alguna variable crítica, el proceso termina con error claro.
 */

const REQUIRED = [
  { key: 'JWT_SECRET',         min: 16, desc: 'Clave secreta para access tokens JWT' },
  { key: 'JWT_REFRESH_SECRET', min: 16, desc: 'Clave secreta para refresh tokens JWT' }
];

// En producción también son obligatorias las credenciales de BD
const REQUIRED_PRODUCTION = [
  { key: 'DB_PASSWORD', min: 1, desc: 'Contraseña de PostgreSQL' }
];

// Variables con valores por defecto aceptables pero que deben revisarse en producción
const WARN_PRODUCTION = [
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

const INSECURE_DEFAULTS = [
  'dev-secret',
  'dev-secret-key-change-in-production',
  'dev-refresh-secret-change-in-production',
  'default-secret-key',
  'default-secret'
];

const validateEnv = () => {
  const errors  = [];
  const warnings = [];
  const isProd  = process.env.NODE_ENV === 'production';

  // Variables siempre requeridas
  for (const { key, min, desc } of REQUIRED) {
    const val = process.env[key];
    if (!val) {
      errors.push(`  ✗ ${key} no está definida — ${desc}`);
    } else if (val.length < min) {
      errors.push(`  ✗ ${key} es demasiado corta (mín. ${min} caracteres) — ${desc}`);
    }
  }

  // Variables requeridas solo en producción
  if (isProd) {
    for (const { key, min, desc } of REQUIRED_PRODUCTION) {
      const val = process.env[key];
      if (!val || val.length < min) {
        errors.push(`  ✗ ${key} es obligatoria en producción — ${desc}`);
      }
    }

    // Advertir si se usan valores por defecto inseguros en producción
    for (const key of WARN_PRODUCTION) {
      const val = process.env[key];
      if (val && INSECURE_DEFAULTS.includes(val)) {
        errors.push(`  ✗ ${key} usa un valor por defecto inseguro en producción`);
      }
    }
  } else {
    // En desarrollo, advertir (no bloquear) si se usan valores inseguros
    for (const key of WARN_PRODUCTION) {
      const val = process.env[key];
      if (val && INSECURE_DEFAULTS.includes(val)) {
        warnings.push(`  ⚠ ${key} usa un valor por defecto — cámbialo antes de ir a producción`);
      }
    }
  }

  // Mostrar advertencias
  if (warnings.length > 0) {
    console.warn('\n[Config] Advertencias de configuración:');
    warnings.forEach(w => console.warn(w));
  }

  // Bloquear si hay errores
  if (errors.length > 0) {
    console.error('\n[Config] ✗ Error de configuración — el servidor no puede arrancar:');
    errors.forEach(e => console.error(e));
    console.error('\n  Revisa el archivo .env (copia .env.example como base)\n');
    process.exit(1);
  }

  console.log('[Config] Variables de entorno validadas correctamente');
};

module.exports = validateEnv;
