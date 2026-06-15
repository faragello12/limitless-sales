const path = require('path');
require('dotenv').config();

const DATABASE_URL = process.env.DATABASE_URL;
const isPostgres = Boolean(DATABASE_URL);

let db = null;
let ready = Promise.resolve();

const postgresSchema = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'sales',
  avatar_color TEXT DEFAULT '#6366f1',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  industry TEXT,
  status TEXT DEFAULT 'lead',
  source TEXT,
  assigned_to INTEGER NOT NULL,
  estimated_value REAL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS client_briefs (
  id SERIAL PRIMARY KEY,
  client_id INTEGER UNIQUE NOT NULL,
  budget TEXT,
  goals TEXT,
  target_audience TEXT,
  services_interested TEXT,
  current_challenges TEXT,
  competitors TEXT,
  preferences TEXT,
  internal_notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS calls (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  call_date TIMESTAMP NOT NULL,
  duration INTEGER DEFAULT 0,
  call_type TEXT DEFAULT 'outbound',
  outcome TEXT DEFAULT 'connected',
  subject TEXT,
  notes TEXT,
  next_follow_up DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS meetings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  meeting_date TIMESTAMP NOT NULL,
  duration INTEGER DEFAULT 60,
  location TEXT,
  meeting_type TEXT DEFAULT 'in-person',
  status TEXT DEFAULT 'scheduled',
  attendees TEXT,
  agenda TEXT,
  mom TEXT,
  decisions TEXT,
  action_items TEXT,
  next_meeting DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  client_id INTEGER,
  category TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS activities (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_clients_assigned ON clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_calls_user ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_client ON calls(client_id);
CREATE INDEX IF NOT EXISTS idx_meetings_user ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
`;

const sqliteSchema = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'sales',
  avatar_color TEXT DEFAULT '#6366f1',
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  industry TEXT,
  status TEXT DEFAULT 'lead',
  source TEXT,
  assigned_to INTEGER NOT NULL,
  estimated_value REAL DEFAULT 0,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS client_briefs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER UNIQUE NOT NULL,
  budget TEXT,
  goals TEXT,
  target_audience TEXT,
  services_interested TEXT,
  current_challenges TEXT,
  competitors TEXT,
  preferences TEXT,
  internal_notes TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS calls (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  call_date DATETIME NOT NULL,
  duration INTEGER DEFAULT 0,
  call_type TEXT DEFAULT 'outbound',
  outcome TEXT DEFAULT 'connected',
  subject TEXT,
  notes TEXT,
  next_follow_up DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  meeting_date DATETIME NOT NULL,
  duration INTEGER DEFAULT 60,
  location TEXT,
  meeting_type TEXT DEFAULT 'in-person',
  status TEXT DEFAULT 'scheduled',
  attendees TEXT,
  agenda TEXT,
  mom TEXT,
  decisions TEXT,
  action_items TEXT,
  next_meeting DATE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'pending',
  client_id INTEGER,
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

CREATE TABLE IF NOT EXISTS activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_clients_assigned ON clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_calls_user ON calls(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_client ON calls(client_id);
CREATE INDEX IF NOT EXISTS idx_meetings_user ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
`;

const toPostgres = (sql) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

if (isPostgres) {
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  ready = pool.query(postgresSchema).catch((err) => {
    console.error('Postgres schema init failed:', err);
    throw err;
  });

  db = {
    isPostgres: true,
    isSqlite: false,
    ready,
    prepare: (sql) => {
      const pgSql = toPostgres(sql);
      return {
        all: async (params = []) => (await pool.query(pgSql, params)).rows,
        get: async (params = []) => (await pool.query(pgSql, params)).rows[0] || null,
        run: async (params = []) => {
          let finalSql = pgSql;
          if (/^\s*INSERT\s+/i.test(sql) && !/RETURNING\s+/i.test(sql)) {
            finalSql = finalSql.replace(/;?\s*$/, ' RETURNING id');
          }
          const res = await pool.query(finalSql, params);
          return { rowCount: res.rowCount, rows: res.rows, lastInsertRowid: res.rows[0]?.id };
        }
      };
    },
    all: async (sql, params = []) => (await pool.query(toPostgres(sql), params)).rows,
    get: async (sql, params = []) => {
      const res = await pool.query(toPostgres(sql), params);
      return res.rows[0] || null;
    },
    run: async (sql, params = []) => {
      let finalSql = toPostgres(sql);
      if (/^\s*INSERT\s+/i.test(sql) && !/RETURNING\s+/i.test(sql)) {
        finalSql = finalSql.replace(/;?\s*$/, ' RETURNING id');
      }
      const res = await pool.query(finalSql, params);
      return { rowCount: res.rowCount, rows: res.rows, lastInsertRowid: res.rows[0]?.id };
    },
    exec: async (sql) => {
      await pool.query(sql);
    }
  };
} else {
  let Database;
  try {
    Database = require('better-sqlite3');
  } catch (err) {
    throw new Error('better-sqlite3 is required for local SQLite mode. Either install the optional dependency or set DATABASE_URL for Postgres.');
  }

  const isVercel = process.env.VERCEL === '1' || Boolean(process.env.VERCEL_URL);
  const dbPath = isVercel ? path.join('/tmp', 'limitless.db') : path.join(__dirname, 'limitless.db');
  const sqlite = new Database(dbPath);
  sqlite.pragma('foreign_keys = ON');
  sqlite.exec(sqliteSchema);

  db = {
    isPostgres: false,
    isSqlite: true,
    ready,
    prepare: (sql) => sqlite.prepare(sql),
    all: (sql, params = []) => sqlite.prepare(sql).all(params),
    get: (sql, params = []) => sqlite.prepare(sql).get(params),
    run: (sql, params = []) => sqlite.prepare(sql).run(params),
    exec: (sql) => sqlite.exec(sql)
  };
}

module.exports = db;
