const { Pool } = require('pg');
const fs = require('fs');

const connectionString = process.env.DATABASE_URL || 'postgres://saferoute:saferoute@localhost:5432/saferoute';
const pool = new Pool({ connectionString });

async function runMigrations() {
  const sql = fs.readFileSync(__dirname + '/migrations/init.sql', 'utf8');
  // split on ; with simple approach
  const statements = sql.split(/;\s*\n/).map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await pool.query(stmt);
  }
}

module.exports = { pool, runMigrations };
