const express = require('express');
const { getDb, getNextTicketCode } = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const VALID_CATEGORIES = ['FOOD_QUALITY', 'WRONG_ORDER', 'DELIVERY_DELAY', 'SERVICE', 'CLEANLINESS', 'OTHER'];
const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];

function computeSlaInfo(ticket) {
  const now = Date.now();
  const dueTime = new Date(ticket.sla_due_at).getTime();

  if (ticket.status === 'RESOLVED') {
    const compareTime = ticket.first_response_at ? new Date(ticket.first_response_at).getTime() : new Date(ticket.resolved_at).getTime();
    const isLate = compareTime > dueTime;
    return {
      code: isLate ? 'OVERDUE' : 'COMPLIANT',
      label: isLate ? 'Lewat batas waktu' : 'Tepat waktu',
      badgeClass: isLate ? 'badge-danger' : 'badge-success'
    };
  }

  const diffMs = dueTime - now;
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 0) {
    return {
      code: 'OVERDUE',
      label: `Lewat ${Math.abs(diffMins)} mnt`,
      badgeClass: 'badge-danger',
      minutesRemaining: diffMins
    };
  } else if (diffMins <= 15) {
    return {
      code: 'CRITICAL',
      label: `Sisa ${diffMins} mnt`,
      badgeClass: 'badge-warning',
      minutesRemaining: diffMins
    };
  } else {
    return {
      code: 'ON_TRACK',
      label: `Sisa ${diffMins} mnt`,
      badgeClass: 'badge-info',
      minutesRemaining: diffMins
    };
  }
}

// GET /api/complaints
router.get('/', (req, res) => {
  const db = getDb();
  const search = req.query.search ? req.query.search.trim() : '';
  const status = req.query.status || '';
  const priority = req.query.priority || '';
  const category = req.query.category || '';
  const assignedTo = req.query.assigned_to ? parseInt(req.query.assigned_to, 10) : null;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const offset = (page - 1) * limit;

  let whereClauses = [];
  let params = [];

  if (search) {
    whereClauses.push('(c.ticket_code LIKE ? OR cust.name LIKE ? OR c.description LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status && ['NEW', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
    whereClauses.push('c.status = ?');
    params.push(status);
  }

  if (priority && VALID_PRIORITIES.includes(priority)) {
    whereClauses.push('c.priority = ?');
    params.push(priority);
  }

  if (category && VALID_CATEGORIES.includes(category)) {
    whereClauses.push('c.category = ?');
    params.push(category);
  }

  if (assignedTo && !isNaN(assignedTo)) {
    whereClauses.push('c.assigned_to = ?');
    params.push(assignedTo);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const countQuery = `
    SELECT COUNT(*) as total
    FROM complaints c
    JOIN customers cust ON c.customer_id = cust.id
    ${whereSql}
  `;
  const countRow = db.prepare(countQuery).get(...params);
  const total = countRow.total;

  const selectQuery = `
    SELECT
      c.id, c.ticket_code, c.customer_id, c.category, c.description, c.priority, c.status,
      c.assigned_to, c.created_by, c.created_at, c.sla_due_at, c.first_response_at, c.resolved_at,
      cust.name as customer_name, cust.phone as customer_phone, cust.customer_code,
      u_assign.name as assigned_to_name,
      u_create.name as created_by_name
    FROM complaints c
    JOIN customers cust ON c.customer_id = cust.id
    LEFT JOIN users u_assign ON c.assigned_to = u_assign.id
    LEFT JOIN users u_create ON c.created_by = u_create.id
    ${whereSql}
    ORDER BY
      CASE c.status
        WHEN 'NEW' THEN 1
        WHEN 'IN_PROGRESS' THEN 2
        WHEN 'RESOLVED' THEN 3
        ELSE 4
      END,
      c.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const rows = db.prepare(selectQuery).all(...params, limit, offset);

  const enrichedRows = rows.map(r => ({
    ...r,
    sla_info: computeSlaInfo(r)
  }));

  res.json({
    success: true,
    data: enrichedRows,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  });
});

// GET /api/complaints/:id
router.get('/:id', (req, res) => {
  const db = getDb();
  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId)) {
    return res.status(400).json({ success: false, error: 'ID Tiket tidak valid.' });
  }

  const selectQuery = `
    SELECT
      c.*,
      cust.name as customer_name, cust.phone as customer_phone, cust.customer_code, cust.source as customer_source,
      u_assign.name as assigned_to_name, u_assign.username as assigned_to_username,
      u_create.name as created_by_name
    FROM complaints c
    JOIN customers cust ON c.customer_id = cust.id
    LEFT JOIN users u_assign ON c.assigned_to = u_assign.id
    LEFT JOIN users u_create ON c.created_by = u_create.id
    WHERE c.id = ?
  `;
  const ticket = db.prepare(selectQuery).get(ticketId);
  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Tiket tidak ditemukan.' });
  }

  const activities = db.prepare(`
    SELECT a.*, u.name as user_name, u.role as user_role
    FROM complaint_activities a
    LEFT JOIN users u ON a.user_id = u.id
    WHERE a.complaint_id = ?
    ORDER BY a.created_at DESC
  `).all(ticketId);

  res.json({
    success: true,
    data: {
      ...ticket,
      sla_info: computeSlaInfo(ticket),
      activities
    }
  });
});

// POST /api/complaints
router.post('/', (req, res) => {
  const { customer_id, category, description, priority, assigned_to } = req.body;

  if (!customer_id) {
    return res.status(400).json({ success: false, error: 'Pelanggan wajib dipilih.' });
  }

  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
  if (!customer) {
    return res.status(404).json({ success: false, error: 'Pelanggan tidak ditemukan.' });
  }
  if (customer.status === 'ARCHIVED') {
    return res.status(400).json({ success: false, error: 'Pelanggan dalam status arsip tidak dapat dibuatkan tiket baru.' });
  }

  if (!category || !VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({ success: false, error: 'Kategori keluhan tidak valid.' });
  }

  if (!description || !description.trim()) {
    return res.status(400).json({ success: false, error: 'Deskripsi keluhan wajib diisi.' });
  }

  if (!priority || !VALID_PRIORITIES.includes(priority)) {
    return res.status(400).json({ success: false, error: 'Tingkat prioritas tidak valid (LOW, MEDIUM, HIGH).' });
  }

  let finalAssignedTo = assigned_to ? parseInt(assigned_to, 10) : null;
  if (!finalAssignedTo) {
    if (req.session.user.role === 'ADMIN') {
      finalAssignedTo = req.session.user.id;
    } else {
      const admin = db.prepare("SELECT id FROM users WHERE role = 'ADMIN' AND is_active = 1 LIMIT 1").get();
      if (!admin) {
        return res.status(400).json({ success: false, error: 'Tidak ada akun Admin aktif untuk penugasan tiket.' });
      }
      finalAssignedTo = admin.id;
    }
  } else {
    const targetUser = db.prepare("SELECT id, role, is_active FROM users WHERE id = ?").get(finalAssignedTo);
    if (!targetUser || targetUser.role !== 'ADMIN' || targetUser.is_active !== 1) {
      return res.status(400).json({ success: false, error: 'Penanggung jawab (PIC) harus akun Admin yang aktif.' });
    }
  }

  const ticketCode = getNextTicketCode(db);
  const now = new Date();
  const createdAt = now.toISOString();
  const slaDueAt = new Date(now.getTime() + 60 * 60000).toISOString();

  const insertStmt = db.prepare(`
    INSERT INTO complaints (
      ticket_code, customer_id, category, description, priority, status,
      assigned_to, created_by, created_at, sla_due_at, first_response_at, resolved_at
    ) VALUES (?, ?, ?, ?, ?, 'NEW', ?, ?, ?, ?, NULL, NULL)
  `);

  const result = insertStmt.run(
    ticketCode,
    customer.id,
    category,
    description.trim(),
    priority,
    finalAssignedTo,
    req.session.user.id,
    createdAt,
    slaDueAt
  );

  const complaintId = result.lastInsertRowid;

  db.prepare(`
    INSERT INTO complaint_activities (complaint_id, user_id, activity_type, description, created_at)
    VALUES (?, ?, 'CREATED', ?, ?)
  `).run(
    complaintId,
    req.session.user.id,
    `Tiket keluhan ${ticketCode} dibuat untuk pelanggan ${customer.name}.`,
    createdAt
  );

  const created = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaintId);

  res.status(201).json({
    success: true,
    message: `Tiket ${ticketCode} berhasil dicatat. Target respons maksimal 60 menit.`,
    data: created
  });
});

// PATCH /api/complaints/:id/status
router.patch('/:id/status', (req, res) => {
  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId)) {
    return res.status(400).json({ success: false, error: 'ID Tiket tidak valid.' });
  }

  const { status, note } = req.body;
  if (!status || !['NEW', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
    return res.status(400).json({ success: false, error: 'Status tiket tidak valid.' });
  }

  const db = getDb();
  const ticket = db.prepare('SELECT * FROM complaints WHERE id = ?').get(ticketId);
  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Tiket tidak ditemukan.' });
  }

  if (ticket.status === 'NEW' && status === 'RESOLVED') {
    return res.status(400).json({
      success: false,
      error: 'Status tidak dapat langsung berpindah dari Baru ke Selesai. Tiket harus Diproses terlebih dahulu.'
    });
  }

  if (ticket.status === 'RESOLVED') {
    return res.status(400).json({
      success: false,
      error: 'Tiket yang telah berstatus Selesai bersifat permanen dan tidak dapat diubah kembali.'
    });
  }

  if (ticket.status === status) {
    return res.status(400).json({
      success: false,
      error: `Tiket sudah berada pada status ${status}.`
    });
  }

  if (ticket.status === 'IN_PROGRESS' && status === 'NEW') {
    return res.status(400).json({
      success: false,
      error: 'Status Diproses tidak dapat dikembalikan ke status Baru.'
    });
  }

  const now = new Date().toISOString();
  let firstResponseAt = ticket.first_response_at;
  let resolvedAt = ticket.resolved_at;

  if (status === 'IN_PROGRESS' && !firstResponseAt) {
    firstResponseAt = now;
  }
  if (status === 'RESOLVED') {
    resolvedAt = now;
  }

  db.prepare(`
    UPDATE complaints
    SET status = ?, first_response_at = ?, resolved_at = ?
    WHERE id = ?
  `).run(status, firstResponseAt, resolvedAt, ticketId);

  const statusLabelMap = {
    NEW: 'Baru',
    IN_PROGRESS: 'Diproses',
    RESOLVED: 'Selesai'
  };

  const activityDesc = note && note.trim()
    ? `Status diubah dari ${statusLabelMap[ticket.status]} ke ${statusLabelMap[status]}. Catatan: ${note.trim()}`
    : `Status diubah dari ${statusLabelMap[ticket.status]} ke ${statusLabelMap[status]}.`;

  db.prepare(`
    INSERT INTO complaint_activities (complaint_id, user_id, activity_type, description, created_at)
    VALUES (?, ?, 'STATUS_CHANGED', ?, ?)
  `).run(ticketId, req.session.user.id, activityDesc, now);

  res.json({
    success: true,
    message: `Status tiket berhasil diubah ke ${statusLabelMap[status]}.`
  });
});

// PATCH /api/complaints/:id/assign
router.patch('/:id/assign', (req, res) => {
  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId)) {
    return res.status(400).json({ success: false, error: 'ID Tiket tidak valid.' });
  }

  const { assigned_to, note } = req.body;
  const newPicId = parseInt(assigned_to, 10);
  if (isNaN(newPicId)) {
    return res.status(400).json({ success: false, error: 'Admin PIC baru wajib dipilih.' });
  }

  const db = getDb();
  const ticket = db.prepare('SELECT * FROM complaints WHERE id = ?').get(ticketId);
  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Tiket tidak ditemukan.' });
  }

  if (ticket.status === 'RESOLVED') {
    return res.status(400).json({ success: false, error: 'Tiket yang telah selesai tidak dapat diganti penanggung jawabnya.' });
  }

  const newAdmin = db.prepare("SELECT id, name, role, is_active FROM users WHERE id = ?").get(newPicId);
  if (!newAdmin || newAdmin.role !== 'ADMIN' || newAdmin.is_active !== 1) {
    return res.status(400).json({ success: false, error: 'Penanggung jawab harus berupa akun Admin yang berstatus aktif.' });
  }

  if (ticket.assigned_to === newPicId) {
    return res.status(400).json({ success: false, error: 'Tiket sudah ditugaskan kepada Admin ini.' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE complaints SET assigned_to = ? WHERE id = ?').run(newPicId, ticketId);

  const activityDesc = note && note.trim()
    ? `Penanggung jawab tiket dialihkan ke ${newAdmin.name}. Catatan: ${note.trim()}`
    : `Penanggung jawab tiket dialihkan ke ${newAdmin.name}.`;

  db.prepare(`
    INSERT INTO complaint_activities (complaint_id, user_id, activity_type, description, created_at)
    VALUES (?, ?, 'PIC_CHANGED', ?, ?)
  `).run(ticketId, req.session.user.id, activityDesc, now);

  res.json({
    success: true,
    message: `Penanggung jawab tiket berhasil dialihkan ke ${newAdmin.name}.`
  });
});

// POST /api/complaints/:id/notes
router.post('/:id/notes', (req, res) => {
  const ticketId = parseInt(req.params.id, 10);
  if (isNaN(ticketId)) {
    return res.status(400).json({ success: false, error: 'ID Tiket tidak valid.' });
  }

  const { description } = req.body;
  if (!description || !description.trim()) {
    return res.status(400).json({ success: false, error: 'Catatan tindak lanjut tidak boleh kosong.' });
  }

  const db = getDb();
  const ticket = db.prepare('SELECT id FROM complaints WHERE id = ?').get(ticketId);
  if (!ticket) {
    return res.status(404).json({ success: false, error: 'Tiket tidak ditemukan.' });
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO complaint_activities (complaint_id, user_id, activity_type, description, created_at)
    VALUES (?, ?, 'NOTE_ADDED', ?, ?)
  `).run(ticketId, req.session.user.id, description.trim(), now);

  res.status(201).json({
    success: true,
    message: 'Catatan tindak lanjut berhasil ditambahkan.'
  });
});

module.exports = router;
