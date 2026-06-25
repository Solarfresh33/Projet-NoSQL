// =============================================================================
// GameShelf — Seed MongoDB : flux d'activité (collection "activity")
// Documents HÉTÉROGÈNES selon le type d'évènement (review / status / list).
// Le schéma varie selon "type" : c'est un cas typique où le document gagne
// contre une table SQL rigide. Sert de "journal" alimenté par l'application.
// =============================================================================

db = db.getSiblingDB('gameshelf');
db.activity.drop();

db.activity.insertMany([
  {
    type: 'review',
    userId: 1, username: 'alice',
    gameId: '650000000000000000000001', gameTitle: 'The Witcher 3: Wild Hunt',
    rating: 5.0, liked: true,
    excerpt: 'Une quête secondaire meilleure que la plupart des jeux entiers.',
    createdAt: new Date('2026-06-01T10:00:00Z')
  },
  {
    type: 'status_change',
    userId: 1, username: 'alice',
    gameId: '650000000000000000000002', gameTitle: 'Elden Ring',
    from: 'backlog', to: 'playing',          // champs propres au type status_change
    createdAt: new Date('2026-06-02T18:30:00Z')
  },
  {
    type: 'list_add',
    userId: 3, username: 'carol',
    listName: 'Pépites indé',                // champs propres au type list_add
    gameId: '650000000000000000000003', gameTitle: 'Hades',
    createdAt: new Date('2026-06-03T09:15:00Z')
  },
  {
    type: 'review',
    userId: 5, username: 'erin',
    gameId: '650000000000000000000008', gameTitle: 'Disco Elysium',
    rating: 5.0, liked: true,
    excerpt: 'Écriture sublime.',
    createdAt: new Date('2026-06-04T20:45:00Z')
  },
  {
    type: 'follow',                          // type sans gameId du tout
    userId: 2, username: 'bob',
    targetUserId: 1, targetUsername: 'alice',
    createdAt: new Date('2026-06-05T12:00:00Z')
  }
]);

db.activity.createIndex({ createdAt: -1 });
db.activity.createIndex({ userId: 1, createdAt: -1 });

print('[mongo seed] ' + db.activity.countDocuments() + ' évènements d\'activité insérés.');
