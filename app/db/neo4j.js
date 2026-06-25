// Connexion Neo4j (driver Bolt officiel).
const neo4j = require('neo4j-driver');

const driver = neo4j.driver(
  process.env.NEO4J_URL || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'gameshelf123'
  )
);

async function verify() {
  await driver.getServerInfo();
  console.log('[neo4j] connecté');
}

// Helper : exécute une requête Cypher et renvoie des objets JS simples.
async function run(cypher, params = {}) {
  const session = driver.session();
  try {
    const res = await session.run(cypher, params);
    return res.records.map((r) => r.toObject());
  } finally {
    await session.close();
  }
}

module.exports = { driver, run, verify };
