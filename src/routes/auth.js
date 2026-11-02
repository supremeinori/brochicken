const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/database');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, error: 'Username dan kata sandi wajib diisi.' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim().toLowerCase());

  if (!user) {
    return res.status(401).json({ success: false, error: 'Username atau kata sandi tidak sesuai.' });
  }

  if (user.is_active !== 1) {
    return res.status(403).json({ success: false, error: 'Akun Anda dinonaktifkan. Silakan hubungi Pemilik.' });
  }

  const isMatch = bcrypt.compareSync(password, user.password_hash);
  if (!isMatch) {
    return res.status(401).json({ success: false, error: 'Username atau kata sandi tidak sesuai.' });
  }

  req.session.user = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role
  };

  res.json({
    success: true,
    user: req.session.user,
    message: `Selamat datang, ${user.name}`
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ success: false, error: 'Gagal keluar sesi.' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Berhasil keluar.' });
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ success: false, error: 'Belum login.' });
  }
  const db = getDb();
  const user = db.prepare('SELECT id, name, username, role, is_active FROM users WHERE id = ?').get(req.session.user.id);
  if (!user || user.is_active !== 1) {
    req.session.destroy();
    return res.status(401).json({ success: false, error: 'Akun tidak valid atau telah dinonaktifkan.' });
  }
  res.json({ success: true, user });
});

module.exports = router;
