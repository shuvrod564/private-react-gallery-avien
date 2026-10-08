
import 'dotenv/config';
import { db } from '../api/_lib/db.js';

try {
  const result = await db.query(`
    SELECT current_database() AS database,
           version() AS version
  `);

  console.log('Aiven connection successful');
  console.log(result.rows[0]);
} catch (error) {
  console.error('Aiven connection failed:', error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}