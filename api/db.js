const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Vercel serverless environment is read-only except for /tmp.
// We must copy the template database to /tmp to allow write operations (like sync, orders, stock adjustments).
const srcDbPath = path.join(__dirname, 'database.sqlite');
const fallbackSrcDbPath = path.join(__dirname, '../backend/database/database.sqlite');
const destDbPath = '/tmp/database.sqlite';

const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
const dbPath = isVercel ? destDbPath : srcDbPath;

function ensureDatabaseFile() {
  if (!isVercel) {
    return;
  }

  try {
    if (fs.existsSync(destDbPath)) {
      return;
    }

    const candidates = [srcDbPath, fallbackSrcDbPath];
    const sourceDbPath = candidates.find((candidate) => fs.existsSync(candidate));

    if (!sourceDbPath) {
      throw new Error('Source database file not found in api/ or backend/database/.');
    }

    console.log(`Copying database from ${sourceDbPath} to ${destDbPath}...`);
    fs.copyFileSync(sourceDbPath, destDbPath);
    fs.chmodSync(destDbPath, 0o666);
    console.log('Database copied successfully.');
  } catch (error) {
    console.error('Failed to setup SQLite database in /tmp:', error);
  }
}

ensureDatabaseFile();

const db = new Database(dbPath, { verbose: console.log });
// Enable foreign keys
db.pragma('foreign_keys = ON');

// Helper to run queries
module.exports = {
  query(sql, params = []) {
    return db.prepare(sql).all(params);
  },
  queryOne(sql, params = []) {
    return db.prepare(sql).get(params);
  },
  run(sql, params = []) {
    return db.prepare(sql).run(params);
  },
  transaction(fn) {
    return db.transaction(fn);
  },
  db
};
