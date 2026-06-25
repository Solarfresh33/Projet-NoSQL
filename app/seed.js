// =============================================================================
// Seed applicatif : peuple Neo4j et Redis au démarrage.
//   - PostgreSQL et MongoDB s'auto-peuplent via /docker-entrypoint-initdb.d
//   - Neo4j (community) et Redis n'ont pas ce mécanisme : on les peuple ici,
//     en se basant sur les données déjà présentes dans PostgreSQL/Mongo afin
//     de garder une seule source de vérité par donnée.
// =============================================================================
const fs = require('fs');
const path = require('path');

const pg = require('./db/postgres');
const mongo = require('./db/mongo');
const redis = require('./db/redis');
const neo4j = require('./db/neo4j');

// ---- Neo4j : rejoue le script Cypher de seed (idempotent) ------------------
async function seedNeo4j() {
  const file = path.join(__dirname, '..', 'seeds', 'neo4j', 'seed.cypher');
  // Le fichier de seed peut ne pas être monté dans l'image : on tente plusieurs chemins
  const candidates = [file, path.join(__dirname, 'seeds', 'neo4j', 'seed.cypher')];
  const found = candidates.find((p) => fs.existsSync(p));

  if (!found) {
    console.warn('[seed][neo4j] fichier seed.cypher introuvable, seed du graphe ignoré');
    return;
  }

  const raw = fs.readFileSync(found, 'utf8');
  // Découpe naïve par ";" en fin de ligne, en ignorant les commentaires //
  const statements = raw
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n')
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    await neo4j.run(stmt);
  }
  console.log(`[seed][neo4j] graphe peuplé (${statements.length} requêtes Cypher).`);
}

// ---- Redis : construit les classements et compteurs à partir de Postgres ---
async function seedRedis() {
  const r = redis.client;

  // 1) Sorted set "leaderboard:rating" = note moyenne par jeu (depuis Postgres)
  const avg = await pg.query(`
    SELECT game_id, game_title, ROUND(AVG(rating)::numeric, 2) AS avg_rating, COUNT(*) AS n
    FROM reviews GROUP BY game_id, game_title
  `);
  await r.del('leaderboard:rating');
  await r.del('leaderboard:reviews');
  for (const row of avg.rows) {
    await r.zAdd('leaderboard:rating',  { score: Number(row.avg_rating), value: row.game_id });
    await r.zAdd('leaderboard:reviews', { score: Number(row.n),          value: row.game_id });
    // Cache du titre pour afficher le classement sans retaper Postgres/Mongo
    await r.hSet('game:title', row.game_id, row.game_title);
  }

  // 2) Compteurs de vues (démo) — INCR atomique côté app à chaque visite
  await r.set('stats:reviews:total', String(avg.rows.reduce((s, x) => s + Number(x.n), 0)));

  // 3) Exemple de donnée expirable : "trending" de la semaine avec TTL
  await r.del('trending:week');
  await r.zAdd('trending:week', [
    { score: 42, value: '650000000000000000000002' }, // Elden Ring
    { score: 37, value: '650000000000000000000009' }, // Baldur's Gate 3
    { score: 31, value: '650000000000000000000003' }, // Hades
  ]);
  await r.expire('trending:week', 60 * 60 * 24 * 7); // TTL 7 jours

  console.log(`[seed][redis] classements (${avg.rows.length} jeux) + compteurs + trending (TTL) initialisés.`);
}

async function runSeed() {
  await mongo.connect();
  await redis.connect();
  await neo4j.verify();
  await seedNeo4j();
  await seedRedis();
}

module.exports = { runSeed, seedNeo4j, seedRedis };

// Permet `npm run seed` en autonome
if (require.main === module) {
  runSeed()
    .then(() => { console.log('[seed] terminé.'); process.exit(0); })
    .catch((e) => { console.error('[seed] échec', e); process.exit(1); });
}
