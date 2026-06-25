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

// Attend que Postgres soit RÉELLEMENT prêt.
// Indispensable au 1er démarrage : pendant l'init (schéma + seed), Postgres
// lance un serveur temporaire puis redémarre. Le healthcheck pg_isready peut
// passer "healthy" sur ce serveur transitoire, si bien qu'une connexion unique
// tombe pile sur la bascule et échoue (ENOTFOUND / ECONNREFUSED / ECONNRESET).
// On réessaie donc avec un court délai au lieu de mourir à la première erreur.
async function waitForReady(retries = 15, delayMs = 2000) {
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query('SELECT 1');
      console.log('[postgres] connecté');
      return;
    } catch (err) {
      console.log(`[postgres] indisponible (${err.code || err.message}), tentative ${i}/${retries}, nouvel essai dans ${delayMs}ms`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('[postgres] connexion impossible après plusieurs tentatives');
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  waitForReady,
};
