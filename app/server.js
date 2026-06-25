// =============================================================================
// GameShelf — Point d'entrée de l'application Express.
// Se connecte RÉELLEMENT aux 4 bases puis monte les routes qui exploitent
// chacune pour sa vocation. L'app est un simple support de démonstration.
// =============================================================================
const path = require('path');
const express = require('express');

const mongo = require('./db/mongo');
const redis = require('./db/redis');
const neo4j = require('./db/neo4j');
const pg = require('./db/postgres');
const { runSeed } = require('./seed');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes API (une famille par base, voir chaque fichier)
app.use('/api/games',       require('./routes/games'));       // MongoDB (+ Redis cache)
app.use('/api/reviews',     require('./routes/reviews'));     // PostgreSQL
app.use('/api/lists',       require('./routes/lists'));       // PostgreSQL
app.use('/api/social',      require('./routes/social'));      // Neo4j
app.use('/api/leaderboard', require('./routes/leaderboard')); // Redis
app.use('/api/feed',        require('./routes/feed'));        // MongoDB

// Healthcheck : vérifie les 4 connexions d'un coup
app.get('/api/health', async (req, res) => {
  const health = {};
  try { await pg.query('SELECT 1');                 health.postgres = 'ok'; } catch (e) { health.postgres = 'ko: ' + e.message; }
  try { await mongo.getDb().command({ ping: 1 });   health.mongo    = 'ok'; } catch (e) { health.mongo    = 'ko: ' + e.message; }
  try { await redis.client.ping();                  health.redis    = 'ok'; } catch (e) { health.redis    = 'ko: ' + e.message; }
  try { await neo4j.run('RETURN 1');                health.neo4j    = 'ok'; } catch (e) { health.neo4j    = 'ko: ' + e.message; }
  const allOk = Object.values(health).every((v) => v === 'ok');
  res.status(allOk ? 200 : 503).json(health);
});

const PORT = Number(process.env.PORT || 3000);

async function start() {
  // Connexions réelles aux 4 bases avant d'écouter
  await mongo.connect();
  await redis.connect();
  await neo4j.verify();
  await pg.waitForReady();
  console.log('[app] connecté aux 4 bases (postgres, mongo, redis, neo4j)');

  // Peuplement de Neo4j + Redis (Postgres/Mongo sont auto-seedés par Docker)
  if (process.env.RUN_SEED === 'true') {
    try { await runSeed(); } catch (e) { console.error('[app] seed échoué (non bloquant):', e.message); }
  }

  app.listen(PORT, () => console.log(`[app] GameShelf en écoute sur http://localhost:${PORT}`));
}

start().catch((e) => { console.error('[app] démarrage impossible:', e); process.exit(1); });
