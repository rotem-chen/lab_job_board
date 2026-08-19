'use strict';

const { Pool } = require('pg');
const fs = require('fs'); // Added to read the secret file

const secretPath = '/run/secrets/db_password';
let dbPassword = 'jobboard123'; // Fallback for local execution

// Read the password from the secret file
try {
  if (fs.existsSync(secretPath)) {
    dbPassword = fs.readFileSync(secretPath, 'utf8').trim();
  }
} catch (err) {
  console.error('Could not read secret file:', err);
}
// Dynamically construct the database URL
const DATABASE_URL = `postgresql://postgres:${encodeURIComponent(dbPassword)}@postgres:5432/jobboard`;

const pool = new Pool({
  // connectionString:
  //   process.env.DATABASE_URL ||
  //   'postgresql://postgres:jobboard123@localhost:5432/jobboard',
  // Use the environment variable if it exists, otherwise use our constructed URL
  connectionString: process.env.DATABASE_URL || DATABASE_URL,
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
