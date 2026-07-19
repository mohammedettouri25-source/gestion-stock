const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Vercel serverless environment is read-only except for /tmp.
// We must copy the template database to /tmp to allow write operations (like sync, orders, stock adjustments).
const srcDbPath = path.join(__dirname, 'database.sqlite');
const destDbPath = '/tmp/database.sqlite';

// If running locally, we can just use the local file.
const isVercel = process.env.VERCEL || process.env.NODE_ENV === 'production';
const dbPath = isVercel ? destDbPath : srcDbPath;

if (isVercel) {
  try {
    // If the database doesn't exist in /tmp, copy it from the bundled source.
    if (!fs.existsSync(destDbPath)) {
      console.log(`Copying database from ${srcDbPath} to ${destDbPath}...`);
      
      // Make sure the bundled file exists.
      if (!fs.existsSync(srcDbPath)) {
        // Fallback: check backend directory
        const fallbackSrc = path.join(__dirname, '../backend/database/database.sqlite');
        if (fs.existsSync(fallbackSrc)) {
          fs.copyFileSync(fallbackSrc, destDbPath);
        } else {
          throw new Error('Source database file not found!');
        }
      } else {
        fs.copyFileSync(srcDbPath, destDbPath);
      }
      
      // Set write permissions
      fs.chmodSync(destDbPath, 0o666);
      console.log('Database copied successfully.');
    }
  } catch (error) {
    console.error('Failed to setup SQLite database in /tmp:', error);
  }
}

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
