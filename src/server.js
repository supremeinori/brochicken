const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const path = require('node:path');
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

// Fallback to index.html for SPA routes
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ success: false, error: 'Endpoint tidak ditemukan.' });
  }
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`[Bro Chicken CRM] Server aktif berjalan di http://localhost:${PORT}`);
  });
}

module.exports = app;
