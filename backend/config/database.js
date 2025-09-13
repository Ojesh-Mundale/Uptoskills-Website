// backend/config/database.js
require('dotenv').config();
const { Pool } = require('pg');

const rawPass = process.env.DB_PASS;
console.log(
  '> DB env loaded: DB_USER=',
  process.env.DB_USER ? '[REDACTED]' : 'missing',
  ' DB_PASS present=',
  rawPass ? 'yes' : 'no',
  ' DB_PASS typeof=',
  typeof rawPass
);

// Force-cast to string and trim to remove stray CR/LF or BOM
const password = rawPass === undefined || rawPass === null ? undefined : String(rawPass).trim();

if (password === undefined) {
  console.warn('WARNING: DB password is undefined. Check .env and ensure DB_PASS is set.');
}

const pool = new Pool({
  user: process.env.DB_USER,
  password: password,
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME,
  // optional: connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function init() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      mentor TEXT NOT NULL,
      students INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  await query(createTableSQL);
}

module.exports = { query, pool, init };
