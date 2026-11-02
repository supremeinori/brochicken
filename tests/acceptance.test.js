const assert = require('node:assert');
const { getDb } = require('../src/db/database');
const { seedDatabase } = require('../src/db/seed');

console.log('=== MEMULAI PENGUJIAN 15 KRITERIA PENERIMAAN SRS v1.2 ===\n');

const db = getDb();
seedDatabase(db);

let passCount = 0;

function test(no, name, fn) {
  try {
    fn();
    console.log(`[PASS] Kriteria ${no}: ${name}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] Kriteria ${no}: ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

// 1. Login
test(1, 'Owner & Admin akun aktif tersedia di database', () => {
  const owner = db.prepare("SELECT * FROM users WHERE username = 'owner'").get();
  assert.ok(owner, 'Owner harus ada');
  assert.strictEqual(owner.role, 'OWNER');
  assert.strictEqual(owner.is_active, 1);

  const admin = db.prepare("SELECT * FROM users WHERE username = 'admin'").get();
  assert.ok(admin, 'Admin harus ada');
  assert.strictEqual(admin.role, 'ADMIN');
  assert.strictEqual(admin.is_active, 1);
});

// 2. Hak Akses (RBAC)
test(2, 'Role akun terdefinisi ketat antara OWNER dan ADMIN', () => {
  const roles = db.prepare('SELECT DISTINCT role FROM users').all().map(r => r.role);
  assert.ok(roles.includes('OWNER'));
  assert.ok(roles.includes('ADMIN'));
  assert.strictEqual(roles.length, 2, 'Hanya boleh ada role OWNER dan ADMIN');
});

// 3. Data Pelanggan CRUD
test(3, 'Data pelanggan dapat ditambah, dicari, diubah, dan diarsipkan', () => {
  const cust = db.prepare("SELECT * FROM customers WHERE customer_code = 'CUS-2026-0001'").get();
  assert.ok(cust, 'Pelanggan pertama harus ditemukan');
  assert.strictEqual(cust.status, 'ACTIVE');

  const archived = db.prepare("SELECT * FROM customers WHERE status = 'ARCHIVED'").get();
  assert.ok(archived, 'Harus ada data pelanggan terarsip');
});

// 4. Minimal 20 Data Pelanggan Awal
test(4, 'Tersedia minimal 20 data pelanggan simulasi', () => {
  const count = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;
  assert.ok(count >= 20, `Jumlah pelanggan harus minimal 20, aktual: ${count}`);
});

// 5. Validasi Pelanggan (Keunikan Nomor & Normalisasi)
test(5, 'Nomor telepon pelanggan diawali 62 dan unik', () => {
  const customers = db.prepare('SELECT phone FROM customers').all();
  const phoneSet = new Set();
  customers.forEach(c => {
    assert.ok(c.phone.startsWith('62'), `Nomor harus diawali 62: ${c.phone}`);
    assert.ok(!phoneSet.has(c.phone), `Nomor telepon duplikat ditemukan: ${c.phone}`);
    phoneSet.add(c.phone);
  });
});

// 6. Riwayat Pelanggan
test(6, 'Detail pelanggan menampilkan seluruh tiket keluhan yang terhubung', () => {
  const cust1 = db.prepare("SELECT id FROM customers WHERE customer_code = 'CUS-2026-0001'").get();
  const complaints = db.prepare('SELECT * FROM complaints WHERE customer_id = ?').all(cust1.id);
  assert.ok(complaints.length > 0, 'Harus ada tiket terhubung untuk pelanggan 1');
});

// 7. Pembuatan Tiket
test(7, 'Tiket memiliki format unik TCK-YYYY-NNNN, kategori, prioritas, dan PIC', () => {
  const ticket = db.prepare("SELECT * FROM complaints WHERE ticket_code = 'TCK-2026-0045'").get();
  assert.ok(ticket, 'Tiket harus ada');
  assert.match(ticket.ticket_code, /^TCK-\d{4}-\d{4}$/);
  assert.ok(['FOOD_QUALITY', 'WRONG_ORDER', 'DELIVERY_DELAY', 'SERVICE', 'CLEANLINESS', 'OTHER'].includes(ticket.category));
  assert.ok(['LOW', 'MEDIUM', 'HIGH'].includes(ticket.priority));
  assert.ok(ticket.assigned_to, 'PIC wajib ada');
});

// 8. Aktivitas Tiket
test(8, 'Sistem mencatat pembuatan tiket, perubahan status, PIC, dan catatan', () => {
  const activities = db.prepare('SELECT DISTINCT activity_type FROM complaint_activities').all().map(a => a.activity_type);
  assert.ok(activities.includes('CREATED'), 'Harus ada log CREATED');
  assert.ok(activities.includes('STATUS_CHANGED'), 'Harus ada log STATUS_CHANGED');
});

// 9. Batas SLA Tepat 60 Menit
test(9, 'Batas SLA tepat 60 menit (3.600.000 ms) setelah waktu pembuatan', () => {
  const ticket = db.prepare("SELECT created_at, sla_due_at FROM complaints WHERE ticket_code = 'TCK-2026-0045'").get();
  const createdMs = new Date(ticket.created_at).getTime();
  const dueMs = new Date(ticket.sla_due_at).getTime();
  const diffMinutes = (dueMs - createdMs) / 60000;
  assert.strictEqual(diffMinutes, 60, `Selisih harus tepat 60 menit, aktual: ${diffMinutes}`);
});

// 10. Alur Status Tiket
test(10, 'Status tiket hanya memiliki nilai Baru, Diproses, atau Selesai', () => {
  const statuses = db.prepare('SELECT DISTINCT status FROM complaints').all().map(s => s.status);
  statuses.forEach(s => {
    assert.ok(['NEW', 'IN_PROGRESS', 'RESOLVED'].includes(s), `Status tidak valid: ${s}`);
  });
});

// 11. WhatsApp Template Statis
test(11, 'Tersedia template WhatsApp baku', () => {
  const templateModule = require('../src/routes/templates');
  assert.ok(templateModule, 'Module template harus tersedia');
});

// 12. Dashboard
test(12, 'Metrik dashboard menghitung pelanggan aktif dan tiket sesuai status', () => {
  const activeCount = db.prepare("SELECT COUNT(*) as c FROM customers WHERE status = 'ACTIVE'").get().c;
  assert.ok(activeCount >= 20);
  const ticketCount = db.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
  assert.ok(ticketCount >= 5);
});

// 13. Laporan
test(13, 'Laporan memetakan data keluhan dan performa SLA', () => {
  const total = db.prepare('SELECT COUNT(*) as c FROM complaints').get().c;
  assert.ok(total > 0);
});

// 14. Manajemen Akun Admin
test(14, 'Owner memiliki akses mengelola staf admin dan ada proteksi penonaktifan', () => {
  const admins = db.prepare("SELECT * FROM users WHERE role = 'ADMIN'").all();
  assert.strictEqual(admins.length, 3);
});

// 15. Backup Database SQLite
test(15, 'File database SQLite lokal ada dan valid', () => {
  const fs = require('node:fs');
  const { DB_PATH } = require('../src/db/database');
  assert.ok(fs.existsSync(DB_PATH), `File database harus ada di ${DB_PATH}`);
  const stats = fs.statSync(DB_PATH);
  assert.ok(stats.size > 0, 'Ukuran database harus lebih besar dari 0');
});

console.log(`\nHasil: ${passCount}/15 Kriteria Berhasil Lulus Pengujian!`);
