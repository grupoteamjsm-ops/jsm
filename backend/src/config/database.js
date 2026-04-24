const { Pool } = require('pg');

// Configuración del pool: usa DATABASE_URL si está definida, si no usa campos individuales
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    }
  : {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT) || 5432,
      database: process.env.DB_NAME     || 'iot_occupancy',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    };

const pool = new Pool({
  ...poolConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

/**
 * Ejecutar una query con parámetros
 * @param {string} text  - SQL query
 * @param {Array}  params - parámetros de la query
 */
const query = (text, params) => pool.query(text, params);

/**
 * Obtener un cliente del pool (para transacciones)
 */
const getClient = () => pool.connect();

/**
 * Verificar la conexión a la base de datos
 */
const connectDB = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log(`PostgreSQL connected at: ${result.rows[0].now}`);
    return true;
  } catch (error) {
    console.error(`PostgreSQL connection error: ${error.message}`);
    console.log('Running in memory mode (no DB).');
    return false;
  }
};

module.exports = { query, getClient, connectDB, pool };
