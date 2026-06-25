// =============================================================================
// Routes /api/games — exploitent MONGODB (fiches au schéma variable)
// et REDIS (cache des fiches + compteur de vues temps réel).
// =============================================================================
const express = require('express');
const { ObjectId } = require('mongodb');
const mongo = require('../db/mongo');
const redis = require('../db/redis');

const router = express.Router();

// GET /api/games — liste des jeux, filtrage optionnel par genre/plateforme.
// Démontre une requête Mongo avec filtre sur tableaux ($in / égalité tableau).
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.genre)    filter.genres = req.query.genre;       // match dans le tableau
    if (req.query.platform) filter.platforms = req.query.platform;
    if (req.query.q)        filter.$text = { $search: req.query.q }; // index texte

    const games = await mongo.getDb()
      .collection('games')
      .find(filter, { projection: { description: 0 } })
      .limit(50)
      .toArray();

    res.json(games);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/games/stats/by-genre — AGRÉGATION Mongo : nb de jeux + genres éclatés.
router.get('/stats/by-genre', async (req, res) => {
  try {
    const stats = await mongo.getDb().collection('games').aggregate([
      { $unwind: '$genres' },
      { $group: { _id: '$genres', count: { $sum: 1 }, games: { $push: '$title' } } },
      { $sort: { count: -1 } },
    ]).toArray();
    res.json(stats);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/games/:id — fiche détaillée d'un jeu.
// Démontre le CACHE REDIS (lecture cache -> sinon Mongo -> on remplit le cache
// avec TTL) + un COMPTEUR DE VUES temps réel via INCR.
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) return res.status(400).json({ error: 'id invalide' });

  try {
    // Compteur de vues temps réel (atomique, sans toucher la base "lourde")
    const views = await redis.client.incr(`game:views:${id}`);

    // 1) Tente le cache Redis
    const cacheKey = `cache:game:${id}`;
    const cached = await redis.client.get(cacheKey);
    if (cached) {
      return res.json({ source: 'redis-cache', views, game: JSON.parse(cached) });
    }

    // 2) Sinon, va chercher dans Mongo
    const game = await mongo.getDb().collection('games').findOne({ _id: new ObjectId(id) });
    if (!game) return res.status(404).json({ error: 'jeu introuvable' });

    // 3) Remplit le cache avec un TTL de 1h
    await redis.client.set(cacheKey, JSON.stringify(game), { EX: 3600 });

    res.json({ source: 'mongo', views, game });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
