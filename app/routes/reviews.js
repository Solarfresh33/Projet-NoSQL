// =============================================================================
// Routes /api/reviews — exploitent POSTGRESQL (données transactionnelles avec
// intégrité : 1 review par user/jeu, note bornée par CHECK) et synchronisent
// quelques agrégats vers REDIS (classement) + un évènement vers MONGO (feed)
// et NEO4J (relation RATED). Bon exemple de redondance maîtrisée.
// =============================================================================
const express = require('express');
const pg = require('../db/postgres');
const redis = require('../db/redis');
const mongo = require('../db/mongo');
const neo4j = require('../db/neo4j');

const router = express.Router();

// GET /api/reviews/game/:gameId — toutes les reviews d'un jeu (JOINTURE SQL).
router.get('/game/:gameId', async (req, res) => {
  try {
    const { rows } = await pg.query(
      `SELECT r.id, r.rating, r.body, r.liked, r.created_at,
              u.id AS user_id, u.username
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       WHERE r.game_id = $1
       ORDER BY r.created_at DESC`,
      [req.params.gameId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/reviews/user/:userId — flux de reviews d'un utilisateur.
router.get('/user/:userId', async (req, res) => {
  try {
    const { rows } = await pg.query(
      `SELECT id, game_id, game_title, rating, body, liked, created_at
       FROM reviews WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.params.userId]
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/reviews — créer/mettre à jour une review (UPSERT respectant
// la contrainte d'unicité (user_id, game_id)).
router.post('/', async (req, res) => {
  const { userId, gameId, gameTitle, rating, body, liked } = req.body;
  if (!userId || !gameId || !gameTitle || rating == null) {
    return res.status(400).json({ error: 'userId, gameId, gameTitle et rating requis' });
  }

  try {
    // 1) Écriture transactionnelle dans PostgreSQL (source de vérité)
    const { rows } = await pg.query(
      `INSERT INTO reviews (user_id, game_id, game_title, rating, body, liked)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, game_id)
       DO UPDATE SET rating = EXCLUDED.rating, body = EXCLUDED.body,
                     liked = EXCLUDED.liked, created_at = now()
       RETURNING *`,
      [userId, gameId, gameTitle, rating, body || null, !!liked]
    );

    // 2) Recalcule la note moyenne et met à jour le classement REDIS (sorted set)
    const avg = await pg.query(
      `SELECT ROUND(AVG(rating)::numeric, 2) AS avg, COUNT(*) AS n
       FROM reviews WHERE game_id = $1`, [gameId]
    );
    await redis.client.zAdd('leaderboard:rating',  { score: Number(avg.rows[0].avg), value: gameId });
    await redis.client.zAdd('leaderboard:reviews', { score: Number(avg.rows[0].n),   value: gameId });
    await redis.client.hSet('game:title', gameId, gameTitle);
    await redis.client.incr('stats:reviews:total');
    // Invalide le cache de la fiche jeu
    await redis.client.del(`cache:game:${gameId}`);

    // 3) Journalise l'évènement dans MONGO (feed hétérogène)
    await mongo.getDb().collection('activity').insertOne({
      type: 'review', userId, username: req.body.username || `user${userId}`,
      gameId, gameTitle, rating, liked: !!liked,
      excerpt: (body || '').slice(0, 140), createdAt: new Date(),
    });

    // 4) Reflète la note dans NEO4J pour les recommandations (relation RATED)
    await neo4j.run(
      `MATCH (u:User {id: $userId})
       MERGE (g:Game {id: $gameId}) ON CREATE SET g.title = $gameTitle
       MERGE (u)-[rel:RATED]->(g) SET rel.rating = $rating`,
      { userId: Number(userId), gameId, gameTitle, rating: Number(rating) }
    );

    res.status(201).json({ review: rows[0], avgRating: Number(avg.rows[0].avg) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
