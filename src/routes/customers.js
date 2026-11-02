const express = require('express');
const { getDb, getNextCustomerCode, normalizePhone } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/customers
router.get('/', (req, res) => {
  const db = getDb();
  const search = req.query.search ? req.query.search.trim() : '';
  const source = req.query.source || '';
  const status = req.query.status || '';
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  let whereClauses = [];
  let params = [];

  if (search) {
    whereClauses.push('(name LIKE ? OR phone LIKE ? OR customer_code LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (source && ['DIRECT', 'GOFOOD', 'GRABFOOD', 'OTHER'].includes(source)) {
    whereClauses.push('source = ?');
    params.push(source);
  }

  if (status && ['ACTIVE', 'ARCHIVED'].includes(status)) {
    whereClauses.push('status = ?');
    params.push(status);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM customers ${whereSql}`).get(...params);
  const total = countRow.total;

  const listQuery = `
    SELECT id, customer_code, name, phone, source, joined_at, notes, status, created_at, updated_at
    FROM customers
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `;
  const rows = db.prepare(listQuery).all(...params, limit, offset);

  res.json({
    success: true,
    data: rows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  });
});

// GET /api/customers/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const customerId = parseInt(req.params.id, 10);
  if (isNaN(customerId)) {
    return res.status(400).json({ success: false, error: 'ID Pelanggan tidak valid.' });
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
  if (!customer) {
    return res.status(404).json({ success: false, error: 'Data pelanggan tidak ditemukan.' });
  }

  // Get ticket history
  const complaints = db.prepare(`
    SELECT c.*, u.name as assigned_to_name
    FROM complaints c
    LEFT JOIN users u ON c.assigned_to = u.id
    WHERE c.customer_id = ?
    ORDER BY c.created_at DESC
  `).all(customerId);

  res.json({
    success: true,
    customer,
    complaints
  });
});

// POST /api/customers
router.post('/', (req, res) => {
  const { name, phone, source, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Nama pelanggan wajib diisi.' });
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 15) {
    return res.status(400).json({ success: false, error: 'Nomor WhatsApp tidak valid (contoh: 08123456789 atau 628123456789).' });
  }

  const validSources = ['DIRECT', 'GOFOOD', 'GRABFOOD', 'OTHER'];
  if (!source || !validSources.includes(source)) {
    return res.status(400).json({ success: false, error: 'Sumber pemesanan wajib dipilih (DIRECT, GOFOOD, GRABFOOD, OTHER).' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(normalizedPhone);
  if (existing) {
    return res.status(400).json({ success: false, error: 'Nomor WhatsApp sudah terdaftar pada pelanggan lain.' });
  }

  const customerCode = getNextCustomerCode(db);
  const now = new Date().toISOString();

  const insertStmt = db.prepare(`
    INSERT INTO customers (customer_code, name, phone, source, joined_at, notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?)
  `);

  const result = insertStmt.run(
    customerCode,
    name.trim(),
    normalizedPhone,
    source,
    now,
    notes ? notes.trim() : '',
    now,
    now
  );

  const newCustomer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    success: true,
    message: 'Pelanggan berhasil ditambahkan.',
    data: newCustomer
  });
});

// PUT /api/customers/:id
router.put('/:id', (req, res) => {
  const customerId = parseInt(req.params.id, 10);
  if (isNaN(customerId)) {
    return res.status(400).json({ success: false, error: 'ID Pelanggan tidak valid.' });
  }

  const { name, phone, source, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Nama pelanggan wajib diisi.' });
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone || normalizedPhone.length < 10 || normalizedPhone.length > 15) {
    return res.status(400).json({ success: false, error: 'Nomor WhatsApp tidak valid.' });
  }

  const validSources = ['DIRECT', 'GOFOOD', 'GRABFOOD', 'OTHER'];
  if (!source || !validSources.includes(source)) {
    return res.status(400).json({ success: false, error: 'Sumber pemesanan tidak valid.' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM customers WHERE phone = ? AND id != ?').get(normalizedPhone, customerId);
  if (existing) {
    return res.status(400).json({ success: false, error: 'Nomor WhatsApp sudah digunakan oleh pelanggan lain.' });
  }

  const target = db.prepare('SELECT id FROM customers WHERE id = ?').get(customerId);
  if (!target) {
    return res.status(404).json({ success: false, error: 'Pelanggan tidak ditemukan.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE customers
    SET name = ?, phone = ?, source = ?, notes = ?, updated_at = ?
    WHERE id = ?
  `).run(name.trim(), normalizedPhone, source, notes ? notes.trim() : '', now, customerId);

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);

  res.json({
    success: true,
    message: 'Data pelanggan berhasil diperbarui.',
    data: updated
  });
});

// PATCH /api/customers/:id/archive
router.patch('/:id/archive', (req, res) => {
  const customerId = parseInt(req.params.id, 10);
  if (isNaN(customerId)) {
    return res.status(400).json({ success: false, error: 'ID Pelanggan tidak valid.' });
  }

  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
  if (!customer) {
    return res.status(404).json({ success: false, error: 'Pelanggan tidak ditemukan.' });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE customers SET status = 'ARCHIVED', updated_at = ? WHERE id = ?").run(now, customerId);

  res.json({
    success: true,
    message: `Pelanggan ${customer.name} berhasil diarsipkan.`
  });
});

// PATCH /api/customers/:id/activate
router.patch('/:id/activate', (req, res) => {
  const customerId = parseInt(req.params.id, 10);
  if (isNaN(customerId)) {
    return res.status(400).json({ success: false, error: 'ID Pelanggan tidak valid.' });
  }

  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
  if (!customer) {
    return res.status(404).json({ success: false, error: 'Pelanggan tidak ditemukan.' });
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE customers SET status = 'ACTIVE', updated_at = ? WHERE id = ?").run(now, customerId);

  res.json({
    success: true,
    message: `Pelanggan ${customer.name} berhasil diaktifkan kembali.`
  });
});

module.exports = router;
