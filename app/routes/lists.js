// =============================================================================
// Routes /api/lists — exploitent POSTGRESQL (listes + éléments ordonnés,
// jointures et intégrité référentielle via FK ON DELETE CASCADE).
// =============================================================================
const express = require('express');
const pg = require('../db/postgres');
const router = express.Router();

// GET /api/lists — toutes les listes publiques avec leur auteur + nb d'éléments.
router.get('/', async (req, res) => {
  try {
    const { rows } = await pg.query(
      `SELECT l.id, l.name, l.description, l.created_at,
              u.username AS owner,
              COUNT(li.game_id) AS item_count
       FROM lists l
       JOIN users u ON u.id = l.user_id
       LEFT JOIN list_items li ON li.list_id = l.id
       WHERE l.is_public = TRUE
       GROUP BY l.id, u.username
       ORDER BY l.created_at DESC`
    );
    res.json(rows);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/lists/:id — détail d'une liste avec ses jeux DANS L'ORDRE (position).
router.get('/:id', async (req, res) => {
  try {
    const list = await pg.query(
      `SELECT l.id, l.name, l.description, u.username AS owner
       FROM lists l JOIN users u ON u.id = l.user_id WHERE l.id = $1`,
      [req.params.id]
    );
    if (list.rows.length === 0) return res.status(404).json({ error: 'liste introuvable' });

    const items = await pg.query(
      `SELECT game_id, game_title, position
       FROM list_items WHERE list_id = $1 ORDER BY position ASC`,
      [req.params.id]
    );
    res.json({ ...list.rows[0], items: items.rows });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
