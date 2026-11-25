// Tracked migration runner.  Usage:
//   npm run migrate              apply every migration not yet recorded in schema_migrations
//   npm run migrate -- --baseline-through=004
//                                record migrations up to and including 004 as already applied WITHOUT running
//                                them, then apply the rest. Use once on a database you already set up by hand.
// It also converts any table that is not utf8mb4, so ₹ and other non-ASCII text are stored correctly.
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../migrations');
const through = (process.argv.find((a) => a.startsWith('--baseline-through=')) || '').split('=')[1];   // e.g. 004
if (process.argv.includes('--baseline')) { console.error('Use --baseline-through=004 (the last migration you already applied by hand).'); process.exit(1); }
const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost', user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, multipleStatements: true, charset: 'utf8mb4',
});
try {
  await conn.query('CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(190) PRIMARY KEY, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) DEFAULT CHARSET=utf8mb4');
  const [done] = await conn.query('SELECT name FROM schema_migrations');
  const applied = new Set(done.map((r) => r.name));
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  for (const f of files) {
    if (applied.has(f)) { console.log('skip     ', f); continue; }
    if (through && parseInt(f, 10) <= parseInt(through, 10)) { await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [f]); console.log('baseline ', f); continue; }
    try { await conn.query(fs.readFileSync(path.join(dir, f), 'utf8')); }
    catch (e) { console.error(`FAILED   ${f}: ${e.code} ${e.sqlMessage || e.message}\nFix the cause (or, if it was already applied by hand, use --baseline-through=<its number>) and re-run.`); process.exit(1); }
    await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [f]);
    console.log('applied  ', f);
  }
  const [bad] = await conn.query("SELECT TABLE_NAME t FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_TYPE='BASE TABLE' AND TABLE_COLLATION NOT LIKE 'utf8mb4%'");
  for (const { t } of bad) { await conn.query(`ALTER TABLE \`${t}\` CONVERT TO CHARACTER SET utf8mb4`); console.log('utf8mb4  ', t); }
  console.log('Database is up to date.');
} finally { await conn.end(); }
