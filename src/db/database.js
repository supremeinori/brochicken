const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');

const DB_PATH = path.join(__dirname, '..', '..', 'brochicken_crm.sqlite');

let dbInstance = null;

function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec('PRAGMA foreign_keys = ON;');
    dbInstance.exec('PRAGMA journal_mode = WAL;');
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN')),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      phone TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL CHECK (source IN ('DIRECT', 'GOFOOD', 'GRABFOOD', 'OTHER')),
      joined_at TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_code TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL REFERENCES customers(id),
      category TEXT NOT NULL CHECK (category IN ('FOOD_QUALITY', 'WRONG_ORDER', 'DELIVERY_DELAY', 'SERVICE', 'CLEANLINESS', 'OTHER')),
      description TEXT NOT NULL,
      priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
      status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),
      assigned_to INTEGER NOT NULL REFERENCES users(id),
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL,
      sla_due_at TEXT NOT NULL,
      first_response_at TEXT NULL,
      resolved_at TEXT NULL
    );

    CREATE TABLE IF NOT EXISTS complaint_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL REFERENCES complaints(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      activity_type TEXT NOT NULL CHECK (activity_type IN ('CREATED', 'STATUS_CHANGED', 'PIC_CHANGED', 'NOTE_ADDED')),
      description TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
    CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
    CREATE INDEX IF NOT EXISTS idx_complaints_status_created ON complaints(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_complaints_assigned_to ON complaints(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_activities_complaint_created ON complaint_activities(complaint_id, created_at);
  `);
}

function getNextCustomerCode(db) {
  const year = new Date().getFullYear();
  const prefix = `CUS-${year}-`;
  const row = db.prepare(
    `SELECT customer_code FROM customers WHERE customer_code LIKE ? ORDER BY customer_code DESC LIMIT 1`
  ).get(`${prefix}%`);

  let nextSeq = 1;
  if (row && row.customer_code) {
    const parts = row.customer_code.split('-');
    if (parts.length === 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num)) nextSeq = num + 1;
    }
  }
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

function getNextTicketCode(db) {
  const year = new Date().getFullYear();
  const prefix = `TCK-${year}-`;
  const row = db.prepare(
    `SELECT ticket_code FROM complaints WHERE ticket_code LIKE ? ORDER BY ticket_code DESC LIMIT 1`
  ).get(`${prefix}%`);

  let nextSeq = 1;
  if (row && row.ticket_code) {
    const parts = row.ticket_code.split('-');
    if (parts.length === 3) {
      const num = parseInt(parts[2], 10);
      if (!isNaN(num)) nextSeq = num + 1;
    }
  }
  return `${prefix}${String(nextSeq).padStart(4, '0')}`;
}

function normalizePhone(input) {
  if (!input) return '';
  let cleaned = String(input).replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.substring(1);
  if (!cleaned.startsWith('62')) cleaned = '62' + cleaned;
  return cleaned;
}

module.exports = {
  DB_PATH,
  getDb,
  getNextCustomerCode,
  getNextTicketCode,
  normalizePhone
};
