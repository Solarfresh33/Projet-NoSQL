// =============================================================================
// GameShelf — Seed MongoDB (Document)
// Fiches de jeux : schéma VOLONTAIREMENT hétérogène d'un document à l'autre
// (config PC pour certains, DLC pour d'autres, champs absents ailleurs...).
// C'est exactement ce que le modèle document gère bien et que SQL gérerait mal.
//
// Ce script tourne automatiquement au 1er démarrage du conteneur mongo
// (monté dans /docker-entrypoint-initdb.d). Les _id sont FIXES et partagés
// avec PostgreSQL et Neo4j pour garder la cohérence inter-bases.
// =============================================================================

db = db.getSiblingDB('gameshelf');

// Idempotence : on repart propre si la collection existe déjà
db.games.drop();

db.games.insertMany([
  {
    _id: ObjectId('650000000000000000000001'),
    title: 'The Witcher 3: Wild Hunt',
    slug: 'the-witcher-3-wild-hunt',
    releaseDate: '2015-05-19',
    developer: 'CD Projekt Red',
    publisher: 'CD Projekt',
    genres: ['RPG', 'Open World', 'Action'],
    platforms: ['PC', 'PS4', 'PS5', 'Xbox One', 'Switch'],
    pegi: 18,
    description: 'Un RPG en monde ouvert où chaque choix compte.',
    cover: 'https://images.gameshelf.dev/witcher3.jpg',
    // Champs spécifiques PC
    pcRequirements: { minimum: { cpu: 'Intel Core i5-2500K', ram: '6 GB', gpu: 'GTX 660' } },
    // DLC (n'existe pas pour tous les jeux)
    dlc: [
      { name: 'Hearts of Stone', releaseDate: '2015-10-13' },
      { name: 'Blood and Wine',  releaseDate: '2016-05-31' }
    ],
    tags: ['story-rich', 'mature', 'choices-matter'],
    averageLength: 51
  },
  {
    _id: ObjectId('650000000000000000000002'),
    title: 'Elden Ring',
    slug: 'elden-ring',
    releaseDate: '2022-02-25',
    developer: 'FromSoftware',
    publisher: 'Bandai Namco',
    genres: ['Souls-like', 'Open World', 'Action RPG'],
    platforms: ['PC', 'PS4', 'PS5', 'Xbox One', 'Xbox Series'],
    pegi: 16,
    description: 'Un monde ouvert impitoyable signé FromSoftware et George R. R. Martin.',
    cover: 'https://images.gameshelf.dev/eldenring.jpg',
    dlc: [{ name: 'Shadow of the Erdtree', releaseDate: '2024-06-21' }],
    difficulty: 'Très élevée',           // champ propre aux souls-like
    tags: ['difficult', 'open-world', 'pvp']
  },
  {
    _id: ObjectId('650000000000000000000003'),
    title: 'Hades',
    slug: 'hades',
    releaseDate: '2020-09-17',
    developer: 'Supergiant Games',
    publisher: 'Supergiant Games',
    genres: ['Roguelite', 'Action'],
    platforms: ['PC', 'Switch', 'PS5', 'Xbox Series'],
    pegi: 12,
    description: 'Échappez-vous des Enfers, run après run.',
    cover: 'https://images.gameshelf.dev/hades.jpg',
    // Pas de pcRequirements, pas de DLC : champs simplement absents
    tags: ['roguelite', 'great-soundtrack', 'replayable'],
    runBased: true
  },
  {
    _id: ObjectId('650000000000000000000004'),
    title: 'Stardew Valley',
    slug: 'stardew-valley',
    releaseDate: '2016-02-26',
    developer: 'ConcernedApe',
    publisher: 'ConcernedApe',
    genres: ['Simulation', 'RPG', 'Cozy'],
    platforms: ['PC', 'Switch', 'Mobile', 'PS4', 'Xbox One'],
    pegi: 7,
    description: 'Reprenez la ferme de votre grand-père et bâtissez une nouvelle vie.',
    cover: 'https://images.gameshelf.dev/stardew.jpg',
    multiplayer: { coop: true, maxPlayers: 4 },  // champ propre aux jeux coop
    tags: ['cozy', 'farming', 'relaxing', 'moddable']
  },
  {
    _id: ObjectId('650000000000000000000005'),
    title: 'Hollow Knight',
    slug: 'hollow-knight',
    releaseDate: '2017-02-24',
    developer: 'Team Cherry',
    publisher: 'Team Cherry',
    genres: ['Metroidvania', 'Action', 'Platformer'],
    platforms: ['PC', 'Switch', 'PS4', 'Xbox One'],
    pegi: 7,
    description: 'Explorez un royaume d''insectes en ruine.',
    cover: 'https://images.gameshelf.dev/hollowknight.jpg',
    tags: ['metroidvania', 'atmospheric', 'difficult']
  },
  {
    _id: ObjectId('650000000000000000000006'),
    title: 'Red Dead Redemption 2',
    slug: 'red-dead-redemption-2',
    releaseDate: '2018-10-26',
    developer: 'Rockstar Games',
    publisher: 'Rockstar Games',
    genres: ['Open World', 'Action', 'Adventure'],
    platforms: ['PC', 'PS4', 'Xbox One'],
    pegi: 18,
    description: 'L''Amérique de 1899 vue par les yeux d''Arthur Morgan.',
    cover: 'https://images.gameshelf.dev/rdr2.jpg',
    onlineMode: { name: 'Red Dead Online', active: false },
    tags: ['western', 'story-rich', 'realistic'],
    averageLength: 60
  },
  {
    _id: ObjectId('650000000000000000000007'),
    title: 'Celeste',
    slug: 'celeste',
    releaseDate: '2018-01-25',
    developer: 'Maddy Makes Games',
    publisher: 'Maddy Makes Games',
    genres: ['Platformer', 'Precision'],
    platforms: ['PC', 'Switch', 'PS4', 'Xbox One'],
    pegi: 7,
    description: 'Aidez Madeline à gravir la montagne Celeste.',
    cover: 'https://images.gameshelf.dev/celeste.jpg',
    accessibility: { assistMode: true },  // champ propre à ce jeu
    tags: ['precision-platformer', 'emotional', 'pixel-art']
  },
  {
    _id: ObjectId('650000000000000000000008'),
    title: 'Disco Elysium',
    slug: 'disco-elysium',
    releaseDate: '2019-10-15',
    developer: 'ZA/UM',
    publisher: 'ZA/UM',
    genres: ['RPG', 'Detective', 'Narrative'],
    platforms: ['PC', 'PS4', 'PS5', 'Switch', 'Mac'],
    pegi: 18,
    description: 'Une enquête où votre psyché est votre pire ennemie.',
    cover: 'https://images.gameshelf.dev/disco.jpg',
    voiceActing: 'The Final Cut (intégral)',
    noCombat: true,                       // champ inhabituel mais signifiant
    tags: ['story-rich', 'choices-matter', 'political']
  },
  {
    _id: ObjectId('650000000000000000000009'),
    title: 'Baldur\'s Gate 3',
    slug: 'baldurs-gate-3',
    releaseDate: '2023-08-03',
    developer: 'Larian Studios',
    publisher: 'Larian Studios',
    genres: ['CRPG', 'Turn-Based', 'Fantasy'],
    platforms: ['PC', 'PS5', 'Xbox Series', 'Mac'],
    pegi: 18,
    description: 'Un CRPG basé sur Donjons & Dragons 5e.',
    cover: 'https://images.gameshelf.dev/bg3.jpg',
    multiplayer: { coop: true, maxPlayers: 4 },
    basedOn: 'Dungeons & Dragons 5e',
    tags: ['crpg', 'turn-based', 'choices-matter', 'coop']
  },
  {
    _id: ObjectId('65000000000000000000000a'),
    title: 'The Legend of Zelda: Breath of the Wild',
    slug: 'zelda-breath-of-the-wild',
    releaseDate: '2017-03-03',
    developer: 'Nintendo EPD',
    publisher: 'Nintendo',
    genres: ['Open World', 'Adventure', 'Action'],
    platforms: ['Switch', 'Wii U'],       // exclu Nintendo : pas de PC
    pegi: 12,
    description: 'Explorez Hyrule comme jamais auparavant.',
    cover: 'https://images.gameshelf.dev/botw.jpg',
    tags: ['open-world', 'exploration', 'physics']
  },
  {
    _id: ObjectId('65000000000000000000000b'),
    title: 'Cyberpunk 2077',
    slug: 'cyberpunk-2077',
    releaseDate: '2020-12-10',
    developer: 'CD Projekt Red',
    publisher: 'CD Projekt',
    genres: ['RPG', 'Open World', 'FPS'],
    platforms: ['PC', 'PS4', 'PS5', 'Xbox One', 'Xbox Series'],
    pegi: 18,
    description: 'Night City, mégalopole de tous les excès.',
    cover: 'https://images.gameshelf.dev/cyberpunk.jpg',
    pcRequirements: { minimum: { cpu: 'Core i7-6700', ram: '12 GB', gpu: 'GTX 1060' } },
    dlc: [{ name: 'Phantom Liberty', releaseDate: '2023-09-26' }],
    launchControversy: true,              // champ "anecdotique" propre au jeu
    tags: ['cyberpunk', 'open-world', 'story-rich']
  },
  {
    _id: ObjectId('65000000000000000000000c'),
    title: 'Portal 2',
    slug: 'portal-2',
    releaseDate: '2011-04-19',
    developer: 'Valve',
    publisher: 'Valve',
    genres: ['Puzzle', 'First-Person'],
    platforms: ['PC', 'PS3', 'Xbox 360', 'Mac', 'Linux'],
    pegi: 12,
    description: 'Le puzzle game culte avec son portal gun.',
    cover: 'https://images.gameshelf.dev/portal2.jpg',
    multiplayer: { coop: true, maxPlayers: 2, separateCampaign: true },
    tags: ['puzzle', 'humor', 'coop']
  }
]);

// Index orientés requêtes : recherche par genre / plateforme / texte
db.games.createIndex({ genres: 1 });
db.games.createIndex({ platforms: 1 });
db.games.createIndex({ title: 'text', description: 'text' });

print('[mongo seed] ' + db.games.countDocuments() + ' jeux insérés.');
