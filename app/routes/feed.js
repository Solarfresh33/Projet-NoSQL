// =============================================================================
// Routes /api/feed — exploitent MONGODB (collection "activity" au schéma
// hétérogène selon le type d'évènement). Flux d'activité global.
// =============================================================================
const express = require('express');
const mongo = require('../db/mongo');
const router = express.Router();

// GET /api/feed — derniers évènements, tous types confondus.
router.get('/', async (req, res) => {
  try {
    const events = await mongo.getDb()
      .collection('activity')
      .find({})
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit || 20))
      .toArray();
    res.json(events);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/feed/stats — AGRÉGATION Mongo : nombre d'évènements par type.
router.get('/stats', async (req, res) => {
  try {
    const byType = await mongo.getDb().collection('activity').aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]).toArray();
    res.json(byType);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
