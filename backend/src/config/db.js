const { Pool } = require('pg');
require('dotenv').config();

// Pool manages multiple DB connections efficiently
// instead of opening a new connection per query
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('Database error:', err.message);
});

module.exports = pool;