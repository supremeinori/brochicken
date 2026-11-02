const express = require('express');
const path = require('node:path');
const fs = require('node:fs');
const bcrypt = require('bcryptjs');
const { getDb, DB_PATH } = require('../db/database');
const { requireOwner } = require('../middleware/auth');

const router = express.Router();
router.use(requireOwner);

// GET /api/settings/info
router.get('/info', (req, res) => {
  res.json({
    success: true,
    data: {
      outlet_name: 'Bro Chicken - Cabang Margonda',
      hotline: '0812-9988-7766',
      address: 'Jl. Margonda Raya No. 128, Depok, Jawa Barat',
      sla_minutes: 60,
      sla_policy: 'Target waktu respons keluhan pelanggan ditetapkan tetap 60 menit kalender.',
      numbering_policy: 'CUS-YYYY-NNNN untuk pelanggan, TCK-YYYY-NNNN untuk tiket.',
      database_type: 'SQLite Lokal (brochicken_crm.sqlite)'
    }
  });
});

// POST /api/settings/change-password
router.post('/change-password', (req, res) => {
  const { current_password, new_password } = req.body;

  if (!current_password || !new_password) {
    return res.status(400).json({ success: false, error: 'Kata sandi saat ini dan kata sandi baru wajib diisi.' });
  }

  if (new_password.length < 6) {
    return res.status(400).json({ success: false, error: 'Kata sandi baru minimal 6 karakter.' });
  }

  const db = getDb();
  const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.user.id);

  if (!owner) {
    return res.status(404).json({ success: false, error: 'Pengguna tidak ditemukan.' });
  }

  const isMatch = bcrypt.compareSync(current_password, owner.password_hash);
  if (!isMatch) {
    return res.status(400).json({ success: false, error: 'Kata sandi saat ini tidak sesuai.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const newHash = bcrypt.hashSync(new_password, salt);
  const now = new Date().toISOString();

  db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newHash, now, owner.id);

  res.json({
    success: true,
    message: 'Kata sandi akun Pemilik berhasil diperbarui.'
  });
});

// GET /api/settings/backup
router.get('/backup', (req, res) => {
  if (!fs.existsSync(DB_PATH)) {
    return res.status(404).json({ success: false, error: 'File database tidak ditemukan.' });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `brochicken_crm_backup_${timestamp}.sqlite`;

  res.setHeader('Content-Type', 'application/x-sqlite3');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const fileStream = fs.createReadStream(DB_PATH);
  fileStream.pipe(res);
});

module.exports = router;
