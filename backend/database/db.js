const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './database/neurovia.db';

// ── OPEN / CREATE DATABASE ─────────────────────────────────
const db = new Database(path.resolve(DB_PATH), {
  verbose: process.env.NODE_ENV === 'development' ? console.log : null
});

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── CREATE ALL TABLES ──────────────────────────────────────
function initDatabase() {

  // 1. TECHNICIAN REGISTRATIONS
  db.exec(`
    CREATE TABLE IF NOT EXISTS technicians (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name   TEXT NOT NULL,
      phone       TEXT NOT NULL,
      email       TEXT,
      city        TEXT NOT NULL,
      expertise   TEXT NOT NULL,
      experience  TEXT,
      about       TEXT,
      status      TEXT DEFAULT 'pending',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. CONSUMER BOOKINGS
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      issue_desc      TEXT NOT NULL,
      service_type    TEXT NOT NULL,
      customer_name   TEXT,
      customer_phone  TEXT,
      customer_email  TEXT,
      city            TEXT,
      status          TEXT DEFAULT 'new',
      assigned_to     INTEGER REFERENCES technicians(id),
      notes           TEXT,
      created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. NADT WAITLIST
  db.exec(`
    CREATE TABLE IF NOT EXISTS waitlist (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      email       TEXT NOT NULL UNIQUE,
      company     TEXT,
      role        TEXT,
      devices     INTEGER,
      source      TEXT DEFAULT 'website',
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. BLOG POSTS (CMS)
  db.exec(`
    CREATE TABLE IF NOT EXISTS blog_posts (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      slug          TEXT NOT NULL UNIQUE,
      category      TEXT NOT NULL,
      excerpt       TEXT,
      content       TEXT NOT NULL,
      author        TEXT DEFAULT 'Neurovia Team',
      read_time     TEXT,
      published     INTEGER DEFAULT 0,
      featured      INTEGER DEFAULT 0,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
      published_at  DATETIME
    )
  `);

  // 5. ADMIN USERS
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      name          TEXT DEFAULT 'Admin',
      last_login    DATETIME,
      created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // ── SEED ADMIN USER ──────────────────────────────────────
  const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@neurovia.in';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeThisPassword123!';

  const existingAdmin = db.prepare(
    'SELECT id FROM admin_users WHERE email = ?'
  ).get(adminEmail);

  if (!existingAdmin) {
    const hash = bcrypt.hashSync(adminPassword, 12);
    db.prepare(
      'INSERT INTO admin_users (email, password_hash, name) VALUES (?, ?, ?)'
    ).run(adminEmail, hash, 'Neurovia Admin');
    console.log(`✅ Admin user created: ${adminEmail}`);
  }

  console.log('✅ Database initialized successfully');
}

// Run on import
initDatabase();

module.exports = db;
