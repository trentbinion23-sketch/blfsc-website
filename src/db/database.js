const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/blfsc.db');

// Ensure data directory exists
const fs = require('fs');
const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Failed to open database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database.');
});

db.serialize(() => {
  db.run(`PRAGMA journal_mode=WAL`);

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'editor', 'member')),
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      username TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions_store (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expired DATETIME NOT NULL
    )
  `);

  // Seed a default admin account if none exists
  db.get(`SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin'`, [], async (err, row) => {
    if (err) return;
    if (row.cnt === 0) {
      const hash = await bcrypt.hash('Admin@1234!', 12);
      db.run(
        `INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)`,
        ['admin', 'admin@blfsc.local', hash, 'admin'],
        (err) => {
          if (!err) console.log('Default admin seeded: username=admin password=Admin@1234!');
        }
      );
    }
  });
});

module.exports = db;
