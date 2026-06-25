// =============================================================================
// Routes /api/social — exploitent NEO4J (graphe) : suivre un utilisateur,
// "amis d'amis", et recommandations collaboratives par parcours de relations.
// C'est le coeur de la vocation graphe.
// =============================================================================
const express = require('express');
const neo4j = require('../db/neo4j');
const router = express.Router();

// GET /api/social/:userId/following — qui l'utilisateur suit-il.
router.get('/:userId/following', async (req, res) => {
  try {
    const rows = await neo4j.run(
      `MATCH (u:User {id: $id})-[:FOLLOWS]->(f:User)
       RETURN f.id AS id, f.username AS username ORDER BY f.username`,
      { id: Number(req.params.userId) }
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/social/:userId/suggestions — "amis d'amis" : utilisateurs suivis
// par les gens que je suis, mais que je ne suis pas encore. Parcours à 2 sauts.
router.get('/:userId/suggestions', async (req, res) => {
  try {
    const rows = await neo4j.run(
      `MATCH (me:User {id: $id})-[:FOLLOWS]->(:User)-[:FOLLOWS]->(fof:User)
       WHERE fof <> me AND NOT (me)-[:FOLLOWS]->(fof)
       RETURN fof.id AS id, fof.username AS username, count(*) AS mutual
       ORDER BY mutual DESC, fof.username`,
      { id: Number(req.params.userId) }
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/social/:userId/recommendations — recommandations collaboratives :
// "les jeux bien notés par les joueurs qui ont aimé les mêmes jeux que moi,
//  et que je n'ai pas encore notés". Le type de requête où le graphe brille.
router.get('/:userId/recommendations', async (req, res) => {
  try {
    const rows = await neo4j.run(
      `MATCH (me:User {id: $id})-[:RATED]->(g:Game)<-[:RATED]-(other:User)
       MATCH (other)-[r:RATED]->(reco:Game)
       WHERE r.rating >= 4.5 AND NOT (me)-[:RATED]->(reco)
       RETURN reco.id AS id, reco.title AS title,
              round(avg(r.rating), 2) AS score, count(*) AS endorsements
       ORDER BY endorsements DESC, score DESC
       LIMIT 10`,
      { id: Number(req.params.userId) }
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/social/game/:gameId/similar — jeux similaires (relation SIMILAR_TO
// + jeux partageant un genre). Parcours de relations sur le graphe de jeux.
router.get('/game/:gameId/similar', async (req, res) => {
  try {
    const rows = await neo4j.run(
      `MATCH (g:Game {id: $gameId})
       OPTIONAL MATCH (g)-[:SIMILAR_TO]->(s:Game)
       WITH g, collect(DISTINCT {id: s.id, title: s.title, via: 'editorial'}) AS direct
       MATCH (g)-[:HAS_GENRE]->(gen:Genre)<-[:HAS_GENRE]-(other:Game)
       WHERE other <> g
       WITH direct, other, count(gen) AS sharedGenres
       ORDER BY sharedGenres DESC LIMIT 5
       RETURN direct, collect({id: other.id, title: other.title, sharedGenres: sharedGenres}) AS byGenre`,
      { gameId: req.params.gameId }
    );
    res.json(rows[0] || { direct: [], byGenre: [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/social/follow — créer une relation FOLLOWS.
router.post('/follow', async (req, res) => {
  const { followerId, followeeId } = req.body;
  if (!followerId || !followeeId) return res.status(400).json({ error: 'followerId et followeeId requis' });
  try {
    await neo4j.run(
      `MATCH (a:User {id: $a}), (b:User {id: $b})
       MERGE (a)-[:FOLLOWS]->(b)`,
      { a: Number(followerId), b: Number(followeeId) }
    );
    res.status(201).json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
