
import pg from 'pg';

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured');
}

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Aiven requires TLS. Set DATABASE_SSL=false to connect to a local
  // PostgreSQL without SSL (e.g. tests / local dev instances).
  ssl: process.env.DATABASE_SSL === 'false' ? false : { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

db.on('error', (error) => {
  console.error('Unexpected PostgreSQL pool error:', error.message);
});