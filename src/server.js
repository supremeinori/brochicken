const path = require('node:path');
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(path.resolve(__dirname, '../.env'));
  }
} catch (e) {
  // .env file opsional jika env sudah diset dari sistem
}

const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { getDb } = require('./db/database');
const { seedDatabase } = require('./db/seed');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const complaintRoutes = require('./routes/complaints');
const templateRoutes = require('./routes/templates');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const adminRoutes = require('./routes/admin');
const settingsRoutes = require('./routes/settings');
const simulationRoutes = require('./routes/simulation');
const membershipRoutes = require('./routes/membership');
const { startScheduler } = require('./services/membershipScheduler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(session({
  name: 'brochicken.sid',
  secret: 'bro-chicken-secret-session-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Inisialisasi DB & Data Awal
const db = getDb();
seedDatabase(db);

// Static files
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/membership', membershipRoutes);

// Rute Publik Registrasi Member (Tanpa Login)
app.get('/daftar-member', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'daftar-member.html'));
});

// Rute Publik Khusus Simulasi WhatsApp Pelanggan (Tanpa Login)
app.get('/simulasi', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'simulasi.html'));
});
app.get('/chat-pelanggan', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'simulasi.html'));
});

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'Endpoint tidak ditemukan.' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

if (require.main === module) {
  startScheduler();
  app.listen(PORT, () => {
    console.log(`[Bro Chicken CRM] Server aktif berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;
