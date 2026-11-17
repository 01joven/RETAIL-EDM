import app from './app.js';
import { config } from './config/env.js';
import { pool } from './config/db.js';

const server = app.listen(config.port, () => {
  console.log(`Retail POS API listening on port ${config.port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; closing server`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
