-- =============================================================================
-- GameShelf — Jeu de données PostgreSQL
-- Les game_id correspondent EXACTEMENT aux _id des fiches dans MongoDB
-- (voir seeds/mongo/01-seed-games.js) afin que les bases soient cohérentes.
-- Les mots de passe sont des hash bcrypt de "password" (démo uniquement).
-- =============================================================================

INSERT INTO users (id, username, email, password_hash, bio) VALUES
  (1, 'alice',  'alice@gameshelf.dev',  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'RPG enjoyer et complétionniste.'),
  (2, 'bob',    'bob@gameshelf.dev',    '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Speedrunner du dimanche.'),
  (3, 'carol',  'carol@gameshelf.dev',  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Indie games surtout.'),
  (4, 'dave',   'dave@gameshelf.dev',   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Je joue à tout.'),
  (5, 'erin',   'erin@gameshelf.dev',   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Narrative-driven only.');
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users));

-- Reviews (rating sur 5, pas de demi-étoile en dessous de 0.5)
INSERT INTO reviews (user_id, game_id, game_title, rating, body, liked) VALUES
  (1, '650000000000000000000001', 'The Witcher 3: Wild Hunt', 5.0, 'Une quête secondaire meilleure que la plupart des jeux entiers.', TRUE),
  (1, '650000000000000000000002', 'Elden Ring', 4.5, 'Liberté totale, parfois cryptique.', TRUE),
  (1, '650000000000000000000009', 'Baldur''s Gate 3', 5.0, 'Le CRPG ultime.', TRUE),
  (2, '650000000000000000000002', 'Elden Ring', 5.0, 'Chef-d''oeuvre FromSoftware.', TRUE),
  (2, '650000000000000000000005', 'Hollow Knight', 4.5, 'Metroidvania parfait.', TRUE),
  (2, '650000000000000000000007', 'Celeste', 5.0, 'Difficile et bienveillant à la fois.', TRUE),
  (3, '650000000000000000000003', 'Hades', 5.0, 'Le meilleur roguelite, point.', TRUE),
  (3, '650000000000000000000004', 'Stardew Valley', 4.5, 'Cozy à l''infini.', TRUE),
  (3, '650000000000000000000007', 'Celeste', 5.0, 'Pixel-perfect.', TRUE),
  (3, '650000000000000000000005', 'Hollow Knight', 4.0, 'Un peu long sur la fin.', FALSE),
  (4, '650000000000000000000001', 'The Witcher 3: Wild Hunt', 4.0, 'Combat un peu mou mais le reste est top.', FALSE),
  (4, '650000000000000000000006', 'Red Dead Redemption 2', 5.0, 'Le western interactif.', TRUE),
  (4, '65000000000000000000000b', 'Cyberpunk 2077', 4.0, 'Bien meilleur depuis les patchs.', TRUE),
  (5, '650000000000000000000008', 'Disco Elysium', 5.0, 'Écriture sublime.', TRUE),
  (5, '650000000000000000000009', 'Baldur''s Gate 3', 4.5, 'Acte 3 un peu lourd.', TRUE),
  (5, '650000000000000000000006', 'Red Dead Redemption 2', 4.5, 'Lent mais magistral.', TRUE);

-- Statuts de jeu
INSERT INTO user_game_status (user_id, game_id, game_title, status, hours_played) VALUES
  (1, '650000000000000000000001', 'The Witcher 3: Wild Hunt', 'played',   180),
  (1, '650000000000000000000002', 'Elden Ring',                'playing',   95),
  (1, '650000000000000000000009', 'Baldur''s Gate 3',          'played',   120),
  (1, '65000000000000000000000a', 'The Legend of Zelda: Breath of the Wild', 'backlog', 0),
  (2, '650000000000000000000002', 'Elden Ring',                'played',   140),
  (2, '650000000000000000000005', 'Hollow Knight',             'played',    40),
  (2, '650000000000000000000007', 'Celeste',                   'played',    25),
  (3, '650000000000000000000003', 'Hades',                     'played',    90),
  (3, '650000000000000000000004', 'Stardew Valley',            'playing',  210),
  (4, '650000000000000000000006', 'Red Dead Redemption 2',     'played',   110),
  (4, '65000000000000000000000b', 'Cyberpunk 2077',            'playing',   60),
  (4, '65000000000000000000000c', 'Portal 2',                  'backlog',    0),
  (5, '650000000000000000000008', 'Disco Elysium',             'played',    35),
  (5, '650000000000000000000009', 'Baldur''s Gate 3',          'abandoned', 50);

-- Listes + éléments
INSERT INTO lists (id, user_id, name, description, is_public) VALUES
  (1, 1, 'Mes RPG cultes',        'Les RPG qui m''ont marqué.',           TRUE),
  (2, 3, 'Pépites indé',          'Petits studios, grands jeux.',         TRUE),
  (3, 5, 'À jouer pour l''histoire', 'Narration avant tout.',             TRUE);
SELECT setval('lists_id_seq', (SELECT MAX(id) FROM lists));

INSERT INTO list_items (list_id, game_id, game_title, position) VALUES
  (1, '650000000000000000000001', 'The Witcher 3: Wild Hunt', 1),
  (1, '650000000000000000000009', 'Baldur''s Gate 3',          2),
  (1, '650000000000000000000002', 'Elden Ring',                3),
  (2, '650000000000000000000003', 'Hades',                     1),
  (2, '650000000000000000000007', 'Celeste',                   2),
  (2, '650000000000000000000005', 'Hollow Knight',             3),
  (2, '650000000000000000000004', 'Stardew Valley',            4),
  (3, '650000000000000000000008', 'Disco Elysium',             1),
  (3, '650000000000000000000001', 'The Witcher 3: Wild Hunt', 2);
