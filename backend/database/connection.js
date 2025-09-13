// backend/config/database.js
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  password: String(process.env.DB_PASS), // force password as string
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
});

pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});

async function query(text, params) {
  return pool.query(text, params);
}

async function init() {
  const createProjectsTable = `
    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      mentor TEXT NOT NULL,
      students INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  const createMentorReviewsTable = `
    CREATE TABLE IF NOT EXISTS mentor_reviews (
      id SERIAL PRIMARY KEY,
      mentor TEXT NOT NULL,
      feedback TEXT NOT NULL,
      rating NUMERIC(3,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `;

  // Create both tables (idempotent)
  await query(createProjectsTable);
  await query(createMentorReviewsTable);
}

module.exports = { query, pool, init };
