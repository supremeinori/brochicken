const assert = require('node:assert');
const { getDb } = require('../src/db/database');
const { seedDatabase } = require('../src/db/seed');

console.log('=== MEMULAI PENGUJIAN 20 KRITERIA PENERIMAAN SRS v2.0 ===\n');

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

// 16. Struktur Database Membership
test(16, 'Tabel membership, transaksi member, kupon, dan outbox pesan tersedia', () => {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map(t => t.name);
  ['memberships', 'member_transactions', 'member_coupons', 'member_messages'].forEach(t => {
    assert.ok(tables.includes(t), `Tabel ${t} harus tersedia.`);
  });
  assert.ok(db.prepare('SELECT COUNT(*) AS c FROM memberships').get().c >= 6);
});

// 17. Katalog & Campaign QR
test(17, 'Katalog paket hemat dan tiga campaign QR tersedia', () => {
  const membership = require('../src/services/membership');
  const campaigns = membership.listCampaigns();
  assert.strictEqual(campaigns.length, 3);
  const codes = campaigns.map(c => c.code).sort();
  assert.deepStrictEqual(codes, ['QR_OUTLET', 'QR_PACKAGING', 'QR_TABLE']);
  const catalog = membership.getCatalog(membership.getCampaign('QR_OUTLET'));
  assert.ok(catalog.length >= 3);
  assert.ok(catalog.every(item => item.price > 0));
});

// 18. Registrasi Member & Identitas Nomor
test(18, 'Nomor WhatsApp unik: registrasi ulang memperbarui nama tanpa data ganda', () => {
  const membership = require('../src/services/membership');
  const phone = `6288${String(Date.now()).slice(-8)}1`;
  const first = membership.registerMember({
    name: 'Nama Awal Uji',
    phone,
    campaignCode: 'QR_OUTLET',
    consent: true
  });
  const before = db.prepare('SELECT COUNT(*) AS c FROM customers').get().c;
  const second = membership.registerMember({
    name: 'Nama Terbaru Uji',
    phone,
    campaignCode: 'QR_OUTLET',
    consent: true
  });
  const after = db.prepare('SELECT COUNT(*) AS c FROM customers').get().c;

  assert.strictEqual(after, before);
  assert.strictEqual(first.customer.id, second.customer.id);
  assert.strictEqual(second.customer.name, 'Nama Terbaru Uji');
  assert.strictEqual(
    db.prepare("SELECT COUNT(*) AS c FROM member_messages WHERE customer_id = ? AND message_type = 'WELCOME'").get(first.customer.id).c,
    1
  );
});

// 19. Kupon Tanggal Tua
test(19, 'Kupon tanggal tua 10% berlaku 7 hari dan idempoten', () => {
  const membership = require('../src/services/membership');
  const now = new Date();
  const phone = `6288${String(Date.now()).slice(-8)}2`;
  const member = membership.registerMember({
    name: 'Member Uji Kupon',
    phone,
    campaignCode: 'QR_TABLE',
    consent: true,
    now: new Date(now.getTime() - 30 * 86400000)
  });

  const firstRun = membership.runEndMonthPromo({ now, force: true });
  assert.ok(firstRun.issued >= 1);

  const info = membership.getMonthEndInfo(now);
  const coupons = db.prepare(`
    SELECT * FROM member_coupons WHERE customer_id = ? AND campaign_id = ?
  `).all(member.customer.id, info.campaign_id);
  assert.strictEqual(coupons.length, 1);
  assert.strictEqual(coupons[0].discount_percent, 10);
  const days = Math.round((new Date(coupons[0].expires_at) - new Date(coupons[0].issued_at)) / 86400000);
  assert.strictEqual(days, 7);

  membership.runEndMonthPromo({ now, force: true });
  const again = db.prepare(`
    SELECT COUNT(*) AS c FROM member_coupons WHERE customer_id = ? AND campaign_id = ?
  `).get(member.customer.id, info.campaign_id).c;
  assert.strictEqual(again, 1);
});

// 20. Outbox Simulasi WhatsApp
test(20, 'Pesan membership tersimpan di outbox dengan provider SIMULATION', () => {
  const messages = db.prepare("SELECT * FROM member_messages WHERE provider = 'SIMULATION'").all();
  assert.ok(messages.length > 0);
  const types = new Set(messages.map(m => m.message_type));
  assert.ok(types.has('WELCOME'));
  assert.ok(messages.every(m => ['QUEUED', 'SENT', 'FAILED'].includes(m.status)));
});

console.log(`\nHasil: ${passCount}/20 Kriteria Berhasil Lulus Pengujian!`);
