// Connexion Redis (client node-redis v4).
const { createClient } = require('redis');

const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
client.on('error', (err) => console.error('[redis] erreur', err.message));

async function connect() {
  if (!client.isOpen) {
    await client.connect();
    console.log('[redis] connecté');
  }
  return client;
}

module.exports = { connect, client };
