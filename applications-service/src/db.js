'use strict';

const { Pool } = require('pg');
const fs = require('fs');

function buildConnectionString() {
  const passwordFile = process.env.POSTGRES_PASSWORD_FILE;
  if (passwordFile) {
    const dbPassword = fs.readFileSync(passwordFile, 'utf8').trim();
    const dbUser = process.env.POSTGRES_USER || 'postgres';
    const dbHost = process.env.POSTGRES_HOST || 'postgres';
    const dbPort = process.env.POSTGRES_PORT || '5432';
    const dbName = process.env.POSTGRES_DB || 'jobboard';
    return   `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${encodeURIComponent(dbName)}`;
  }
  return process.env.DATABASE_URL || 'postgresql://postgres:jobboard123@localhost:5432/jobboard';
}

const pool = new Pool({
  connectionString: buildConnectionString(),
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS applications (
      id              UUID         PRIMARY KEY,
      job_id          VARCHAR(255) NOT NULL,
      applicant_name  VARCHAR(200) NOT NULL,
      applicant_email VARCHAR(200) NOT NULL,
      cover_letter    TEXT,
      status          VARCHAR(50)  DEFAULT 'pending'
                      CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
      created_at      TIMESTAMP    DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id)
  `);

  console.log('[db] Applications table ready');
}

module.exports = { pool, initDB };
