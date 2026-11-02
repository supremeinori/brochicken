const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');
const { requireOwner } = require('../middleware/auth');

const router = express.Router();
router.use(requireOwner);

// GET /api/admin/users
router.get('/users', (req, res) => {
  const db = getDb();
  const users = db.prepare(`
    SELECT
      u.id, u.name, u.username, u.role, u.is_active, u.created_at, u.updated_at,
      (SELECT COUNT(*) FROM complaints WHERE assigned_to = u.id AND status IN ('NEW', 'IN_PROGRESS')) as active_tickets_count
    FROM users u
    ORDER BY
      CASE u.role WHEN 'OWNER' THEN 1 ELSE 2 END,
      u.id ASC
  `).all();

  res.json({
    success: true,
    data: users
  });
});

// POST /api/admin/users - Create Admin
router.post('/users', (req, res) => {
  const { name, username, password } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Nama Admin wajib diisi.' });
  }

  if (!username || !username.trim()) {
    return res.status(400).json({ success: false, error: 'Username wajib diisi.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  if (cleanUsername.length < 3) {
    return res.status(400).json({ success: false, error: 'Username minimal 3 karakter.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, error: 'Password minimal 6 karakter.' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(cleanUsername);
  if (existing) {
    return res.status(400).json({ success: false, error: 'Username sudah digunakan oleh akun lain.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);
  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, 'ADMIN', 1, ?, ?)
  `).run(name.trim(), cleanUsername, passwordHash, now, now);

  const newUser = db.prepare('SELECT id, name, username, role, is_active, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({
    success: true,
    message: `Akun Admin ${newUser.name} berhasil dibuat.`,
    data: newUser
  });
});

// PATCH /api/admin/users/:id/status - Toggle active/deactive
router.patch('/users/:id/status', (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) {
    return res.status(400).json({ success: false, error: 'ID Pengguna tidak valid.' });
  }

  const { is_active } = req.body;
  if (is_active !== 0 && is_active !== 1) {
    return res.status(400).json({ success: false, error: 'Nilai status tidak valid.' });
  }

  const db = getDb();
  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!targetUser) {
    return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
  }

  // FR-08.09: Melarang penonaktifan satu-satunya akun Owner
  if (targetUser.role === 'OWNER') {
    return res.status(400).json({ success: false, error: 'Akun Pemilik (Owner) tidak dapat dinonaktifkan.' });
  }

  // FR-08.13: Menolak penonaktifan Admin yang masih menjadi PIC tiket berstatus Baru atau Diproses
  if (is_active === 0) {
    const activeTickets = db.prepare(`
      SELECT COUNT(*) as count
      FROM complaints
      WHERE assigned_to = ? AND status IN ('NEW', 'IN_PROGRESS')
    `).get(targetId).count;

    if (activeTickets > 0) {
      return res.status(400).json({
        success: false,
        error: `Admin ${targetUser.name} masih memegang ${activeTickets} tiket aktif (Baru/Diproses). Alihkan penanggung jawab tiket terlebih dahulu sebelum menonaktifkan akun.`
      });
    }
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?').run(is_active, now, targetId);

  res.json({
    success: true,
    message: is_active === 1
      ? `Akun Admin ${targetUser.name} berhasil diaktifkan kembali.`
      : `Akun Admin ${targetUser.name} berhasil dinonaktifkan.`
  });
});

// PATCH /api/admin/users/:id/reset-password - Reset Admin password
router.patch('/users/:id/reset-password', (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) {
    return res.status(400).json({ success: false, error: 'ID Pengguna tidak valid.' });
  }

  const { new_password } = req.body;
  if (!new_password || new_password.length < 6) {
    return res.status(400).json({ success: false, error: 'Kata sandi baru minimal 6 karakter.' });
  }

  const db = getDb();
  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!targetUser) {
    return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(new_password, salt);
  const now = new Date().toISOString();

  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(passwordHash, now, targetId);

  res.json({
    success: true,
    message: `Kata sandi Admin ${targetUser.name} berhasil diatur ulang.`
  });
});

// PATCH /api/admin/users/:id - Update name / username
router.patch('/users/:id', (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (isNaN(targetId)) {
    return res.status(400).json({ success: false, error: 'ID Pengguna tidak valid.' });
  }

  const { name, username } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Nama wajib diisi.' });
  }
  if (!username || !username.trim()) {
    return res.status(400).json({ success: false, error: 'Username wajib diisi.' });
  }

  const cleanUsername = username.trim().toLowerCase();
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(cleanUsername, targetId);
  if (existing) {
    return res.status(400).json({ success: false, error: 'Username sudah digunakan oleh akun lain.' });
  }

  const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(targetId);
  if (!targetUser) {
    return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET name = ?, username = ?, updated_at = ? WHERE id = ?').run(name.trim(), cleanUsername, now, targetId);

  res.json({
    success: true,
    message: 'Data akun berhasil diperbarui.'
  });
});

module.exports = router;
