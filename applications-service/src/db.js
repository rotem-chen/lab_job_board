'use strict';
'use strict';

const { Pool } = require('pg');
const fs = require('fs');

// ─── 1. RESOLVE PASSWORD (Hierarchy: File -> Env Var -> Local Default) ───
let dbPassword = 'jobboard123'; // Lowest priority: Local execution fallback

// Check if a specific file path was provided (useful for custom K8s mount paths)
const secretPath = process.env.DB_PASSWORD_FILE || '/run/secrets/db_password';

if (fs.existsSync(secretPath)) {
  // Highest priority: Docker Secrets or Kubernetes mounted secrets
  try {
    dbPassword = fs.readFileSync(secretPath, 'utf8').trim();
    console.log('[db] Using password from secret file');
  } catch (err) {
    console.error('[db] Could not read secret file:', err);
  }
} else if (process.env.DB_PASSWORD) {
  // Medium priority: Standard environment variables
  dbPassword = process.env.DB_PASSWORD;
  console.log('[db] Using password from environment variable');
} else {
  console.log('[db] Using fallback local password');
}

// ─── 2. RESOLVE CONNECTION SETTINGS ───────────────────────────────────────
// When running locally, it defaults to 'localhost'.
// In Docker/K8s, we will pass these in via environment variables.
const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'postgres';
const dbName = process.env.DB_NAME || 'jobboard';
const dbPort = process.env.DB_PORT || 5432;

// ─── 3. INITIALIZE POOL ───────────────────────────────────────────────────
const pool = new Pool({
  host: dbHost,
  user: dbUser,
  password: dbPassword,
  database: dbName,
  port: dbPort,
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
