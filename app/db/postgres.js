// Connexion PostgreSQL via un pool de connexions (pg).
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.POSTGRES_HOST     || 'localhost',
  port:     Number(process.env.POSTGRES_PORT || 5432),
  user:     process.env.POSTGRES_USER     || 'gameshelf',
  password: process.env.POSTGRES_PASSWORD || 'gameshelf',
  database: process.env.POSTGRES_DB       || 'gameshelf',
});

pool.on('error', (err) => console.error('[postgres] erreur pool', err.message));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
