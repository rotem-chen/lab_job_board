'use strict';

const { Pool } = require('pg');
const fs = require('fs'); // Added to read the secret file

const secretPath = '/run/secrets/db_password';
//let dbPassword = 'jobboard123'; // Fallback for local execution

// Database configuration
const dbHost = process.env.POSTGRES_HOST || 'postgres';
const dbPort = process.env.POSTGRES_PORT || '5432';
const dbName = process.env.POSTGRES_DB   || 'jobboard';
const dbUser = process.env.POSTGRES_USER || 'postgres';

let dbPassword; 
// Read the password from the secret file
if (fs.existsSync(secretPath)) {
  dbPassword = fs.readFileSync(secretPath, 'utf8').trim();
  console.log('[db] Using password from Docker Secret');
} else if (process.env.POSTGRES_PASSWORD) {
  dbPassword = process.env.POSTGRES_PASSWORD;
  console.log('[db] Using password from environment variable');
} else {
  dbPassword = 'jobboard123';
  console.log('[db] Using local development fallback');
}

// try {
//   if (fs.existsSync(secretPath)) {
//     dbPassword = fs.readFileSync(secretPath, 'utf8').trim();
//   }
// } catch (err) {
//   console.error('Could not read secret file:', err);
// }
// Dynamically construct the database URL
//const DATABASE_URL = `postgresql://postgres:${encodeURIComponent(dbPassword)}@postgres:5432/jobboard`;
// Use DATABASE_URL if explicitly provided.
// Otherwise construct it from the configuration above.
const DATABASE_URL =
  process.env.DATABASE_URL ||
  `postgresql://${encodeURIComponent(dbUser)}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${encodeURIComponent(dbName)}`;


const pool = new Pool({
  // connectionString:
  //   process.env.DATABASE_URL ||
  //   'postgresql://postgres:jobboard123@localhost:5432/jobboard',
  // Use the environment variable if it exists, otherwise use our constructed URL
  connectionString: DATABASE_URL,
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
