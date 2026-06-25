// Connexion MongoDB (driver officiel).
const { MongoClient } = require('mongodb');

const url = process.env.MONGO_URL || 'mongodb://gameshelf:gameshelf@localhost:27017/gameshelf?authSource=admin';
const dbName = process.env.MONGO_DB || 'gameshelf';

const client = new MongoClient(url);
let db = null;

async function connect() {
  if (db) return db;
  await client.connect();
  db = client.db(dbName);
  console.log('[mongo] connecté à', dbName);
  return db;
}

function getDb() {
  if (!db) throw new Error('MongoDB non initialisé — appelez connect() au démarrage.');
  return db;
}

module.exports = { connect, getDb, client };
