// =============================================================================
// GameShelf — Seed Neo4j (Graphe)
// Modèle orienté PARCOURS DE RELATIONS :
//   (:User)-[:FOLLOWS]->(:User)              réseau social
//   (:User)-[:RATED {rating}]->(:Game)       goûts des joueurs
//   (:Game)-[:HAS_GENRE]->(:Genre)           classification
//   (:Game)-[:ON_PLATFORM]->(:Platform)      disponibilité
//   (:Game)-[:SIMILAR_TO]->(:Game)           similarité éditoriale
// Sert aux recommandations ("amis d'amis", "jeux aimés par ceux qui aiment X").
// Les gameId / userId sont les MÊMES que dans PostgreSQL et MongoDB.
// =============================================================================

// Idempotence : on nettoie avant de (re)créer
MATCH (n) DETACH DELETE n;

// Contraintes d'unicité (= index)
CREATE CONSTRAINT user_id  IF NOT EXISTS FOR (u:User)     REQUIRE u.id   IS UNIQUE;
CREATE CONSTRAINT game_id  IF NOT EXISTS FOR (g:Game)     REQUIRE g.id   IS UNIQUE;
CREATE CONSTRAINT genre_nm IF NOT EXISTS FOR (x:Genre)    REQUIRE x.name IS UNIQUE;
CREATE CONSTRAINT plat_nm  IF NOT EXISTS FOR (p:Platform) REQUIRE p.name IS UNIQUE;

// ---------------------------------------------------------------------------
// Utilisateurs
// ---------------------------------------------------------------------------
UNWIND [
  {id: 1, username: 'alice'},
  {id: 2, username: 'bob'},
  {id: 3, username: 'carol'},
  {id: 4, username: 'dave'},
  {id: 5, username: 'erin'}
] AS u
CREATE (:User {id: u.id, username: u.username});

// ---------------------------------------------------------------------------
// Jeux (avec genres + plateformes, créés à la volée)
// ---------------------------------------------------------------------------
UNWIND [
  {id: '650000000000000000000001', title: 'The Witcher 3: Wild Hunt', genres: ['RPG','Open World','Action'],      platforms: ['PC','PS4','PS5','Xbox One','Switch']},
  {id: '650000000000000000000002', title: 'Elden Ring',              genres: ['Souls-like','Open World','Action RPG'], platforms: ['PC','PS4','PS5','Xbox One','Xbox Series']},
  {id: '650000000000000000000003', title: 'Hades',                   genres: ['Roguelite','Action'],               platforms: ['PC','Switch','PS5','Xbox Series']},
  {id: '650000000000000000000004', title: 'Stardew Valley',          genres: ['Simulation','RPG','Cozy'],          platforms: ['PC','Switch','Mobile','PS4','Xbox One']},
  {id: '650000000000000000000005', title: 'Hollow Knight',           genres: ['Metroidvania','Action','Platformer'], platforms: ['PC','Switch','PS4','Xbox One']},
  {id: '650000000000000000000006', title: 'Red Dead Redemption 2',   genres: ['Open World','Action','Adventure'],  platforms: ['PC','PS4','Xbox One']},
  {id: '650000000000000000000007', title: 'Celeste',                 genres: ['Platformer','Precision'],           platforms: ['PC','Switch','PS4','Xbox One']},
  {id: '650000000000000000000008', title: 'Disco Elysium',           genres: ['RPG','Detective','Narrative'],      platforms: ['PC','PS4','PS5','Switch','Mac']},
  {id: '650000000000000000000009', title: "Baldur's Gate 3",         genres: ['CRPG','Turn-Based','Fantasy'],      platforms: ['PC','PS5','Xbox Series','Mac']},
  {id: '65000000000000000000000a', title: 'Zelda: Breath of the Wild', genres: ['Open World','Adventure','Action'], platforms: ['Switch','Wii U']},
  {id: '65000000000000000000000b', title: 'Cyberpunk 2077',          genres: ['RPG','Open World','FPS'],           platforms: ['PC','PS4','PS5','Xbox One','Xbox Series']},
  {id: '65000000000000000000000c', title: 'Portal 2',                genres: ['Puzzle','First-Person'],            platforms: ['PC','PS3','Xbox 360','Mac','Linux']}
] AS g
CREATE (game:Game {id: g.id, title: g.title})
WITH game, g
UNWIND g.genres AS genreName
  MERGE (gen:Genre {name: genreName})
  MERGE (game)-[:HAS_GENRE]->(gen)
WITH game, g
UNWIND g.platforms AS platName
  MERGE (p:Platform {name: platName})
  MERGE (game)-[:ON_PLATFORM]->(p);

// ---------------------------------------------------------------------------
// Réseau social : qui suit qui
// ---------------------------------------------------------------------------
UNWIND [
  {a: 2, b: 1}, {a: 3, b: 1}, {a: 4, b: 1},   // alice suivie par bob, carol, dave
  {a: 1, b: 3}, {a: 5, b: 3},                  // carol suivie par alice, erin
  {a: 1, b: 5}, {a: 3, b: 5},                  // erin suivie par alice, carol
  {a: 2, b: 4}                                 // dave suivi par bob
] AS f
MATCH (a:User {id: f.a}), (b:User {id: f.b})
CREATE (a)-[:FOLLOWS]->(b);

// ---------------------------------------------------------------------------
// Notes des joueurs (alimente les recommandations collaboratives)
// ---------------------------------------------------------------------------
UNWIND [
  {u: 1, g: '650000000000000000000001', r: 5.0},
  {u: 1, g: '650000000000000000000002', r: 4.5},
  {u: 1, g: '650000000000000000000009', r: 5.0},
  {u: 2, g: '650000000000000000000002', r: 5.0},
  {u: 2, g: '650000000000000000000005', r: 4.5},
  {u: 2, g: '650000000000000000000007', r: 5.0},
  {u: 3, g: '650000000000000000000003', r: 5.0},
  {u: 3, g: '650000000000000000000004', r: 4.5},
  {u: 3, g: '650000000000000000000007', r: 5.0},
  {u: 3, g: '650000000000000000000005', r: 4.0},
  {u: 4, g: '650000000000000000000001', r: 4.0},
  {u: 4, g: '650000000000000000000006', r: 5.0},
  {u: 4, g: '65000000000000000000000b', r: 4.0},
  {u: 5, g: '650000000000000000000008', r: 5.0},
  {u: 5, g: '650000000000000000000009', r: 4.5},
  {u: 5, g: '650000000000000000000006', r: 4.5}
] AS rt
MATCH (u:User {id: rt.u}), (g:Game {id: rt.g})
CREATE (u)-[:RATED {rating: rt.r}]->(g);

// ---------------------------------------------------------------------------
// Similarité éditoriale explicite entre jeux (relation symétrique simulée)
// ---------------------------------------------------------------------------
UNWIND [
  {a: '650000000000000000000001', b: '650000000000000000000009'}, // Witcher 3 ~ BG3
  {a: '650000000000000000000001', b: '65000000000000000000000b'}, // Witcher 3 ~ Cyberpunk (même studio)
  {a: '650000000000000000000002', b: '650000000000000000000005'}, // Elden Ring ~ Hollow Knight (difficulté)
  {a: '650000000000000000000005', b: '650000000000000000000007'}, // Hollow Knight ~ Celeste (platformer)
  {a: '650000000000000000000003', b: '650000000000000000000007'}  // Hades ~ Celeste (indé précision)
] AS s
MATCH (a:Game {id: s.a}), (b:Game {id: s.b})
CREATE (a)-[:SIMILAR_TO]->(b)
CREATE (b)-[:SIMILAR_TO]->(a);

// Petit récap dans les logs
MATCH (u:User)   WITH count(u) AS users
MATCH (g:Game)   WITH users, count(g) AS games
RETURN users, games;
