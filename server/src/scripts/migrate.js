import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { pool } from '../config/db.js';

try {
  const schemaPath = fileURLToPath(new URL('../../sql/schema.sql', import.meta.url));
  const schema = await readFile(schemaPath, 'utf8');
  await pool.query(schema);
  console.log('Database schema applied');
} catch (error) {
  console.error('Database migration failed', error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
