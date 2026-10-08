
import 'dotenv/config';
import { db } from '../api/_lib/db.js';

try {
  const result = await db.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);

  console.log('Tables currently in Aiven:');

  if (result.rows.length === 0) {
    console.log('No tables found.');
  } else {
    console.table(result.rows);
  }
} catch (error) {
  console.error('Database check failed:', error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}