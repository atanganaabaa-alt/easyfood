const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

pool.connect()
  .then((client) => {
    console.log('✅ Connecté à PostgreSQL');
    // On relâche immédiatement le client de test, sinon pool.end() reste bloqué.
    client.release();
  })
  .catch(err => console.error('❌ Erreur connexion PostgreSQL :', err));

module.exports = pool;
