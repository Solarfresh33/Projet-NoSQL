// =============================================================================
// Routes /api/leaderboard — exploitent REDIS (sorted sets pour les classements,
// compteurs, et données expirables avec TTL). Lectures O(log N), temps réel.
// =============================================================================
const express = require('express');
const redis = require('../db/redis');
const router = express.Router();

// Helper : transforme un ZRANGE ...WITHSCORES en liste lisible (avec titres).
async function decorate(entries) {
  const out = [];
  for (const { value, score } of entries) {
    const title = await redis.client.hGet('game:title', value);
    out.push({ gameId: value, title: title || value, score });
  }
  return out;
}

// GET /api/leaderboard/top-rated — meilleurs jeux par note moyenne (sorted set).
router.get('/top-rated', async (req, res) => {
  try {
    const limit = Number(req.query.limit || 10);
    // ZRANGE REV : du score le plus haut au plus bas
    const entries = await redis.client.zRangeWithScores('leaderboard:rating', 0, limit - 1, { REV: true });
    res.json(await decorate(entries));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/leaderboard/most-reviewed — jeux les plus reviewés.
router.get('/most-reviewed', async (req, res) => {
  try {
    const entries = await redis.client.zRangeWithScores('leaderboard:reviews', 0, 9, { REV: true });
    res.json(await decorate(entries));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/leaderboard/trending — tendance de la semaine (clé avec TTL).
router.get('/trending', async (req, res) => {
  try {
    const entries = await redis.client.zRangeWithScores('trending:week', 0, 9, { REV: true });
    const ttl = await redis.client.ttl('trending:week'); // secondes restantes
    res.json({ ttlSeconds: ttl, games: await decorate(entries) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/leaderboard/stats — compteurs temps réel.
router.get('/stats', async (req, res) => {
  try {
    const totalReviews = await redis.client.get('stats:reviews:total');
    res.json({ totalReviews: Number(totalReviews || 0) });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
