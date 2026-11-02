const bcrypt = require('bcryptjs');
const { getDb } = require('./database');

function seedDatabase(db) {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    console.log('[Seed] Database sudah memiliki data pengguna. Melewati seeding.');
    return;
  }

  console.log('[Seed] Memulai proses inisialisasi data simulasi Bro Chicken...');
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('12345678', salt);
  const now = new Date().toISOString();

  // 1. Akun Pengguna (Owner & Admin dengan username: owner & admin, sandi: 12345678)
  const insertUser = db.prepare(`
    INSERT INTO users (name, username, password_hash, role, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run('Haji Rahmat', 'owner', defaultPasswordHash, 'OWNER', 1, now, now);
  insertUser.run('Budi Santoso', 'admin', defaultPasswordHash, 'ADMIN', 1, now, now);
  insertUser.run('Rina Sari', 'rina_sari', defaultPasswordHash, 'ADMIN', 1, now, now);
  insertUser.run('Doni Pratama', 'doni_pratama', defaultPasswordHash, 'ADMIN', 1, now, now);

  const ownerUser = db.prepare("SELECT id FROM users WHERE username = 'owner'").get();
  const budiUser = db.prepare("SELECT id FROM users WHERE username = 'admin'").get();
  const rinaUser = db.prepare("SELECT id FROM users WHERE username = 'rina_sari'").get();
  const doniUser = db.prepare("SELECT id FROM users WHERE username = 'doni_pratama'").get();

  // 2. Data Pelanggan Simulasi (21 Pelanggan)
  const customersData = [
    { code: 'CUS-2026-0001', name: 'Hendra Kusuma', phone: '6281234567890', source: 'GOFOOD', notes: 'Langganan menu Paket Geprek Komplit, suka ekstra sambal bawang pedas level 5.' },
    { code: 'CUS-2026-0002', name: 'Siti Aminah', phone: '6281234567891', source: 'GRABFOOD', notes: 'Sering pesan untuk kantor hari Jumat jam makan siang.' },
    { code: 'CUS-2026-0003', name: 'Dewi Sartika', phone: '6281234567892', source: 'DIRECT', notes: 'Pelanggan tetap outlet Margonda, sering datang bawa keluarga.' },
    { code: 'CUS-2026-0004', name: 'Arif Wijaya', phone: '6281234567893', source: 'DIRECT', notes: 'Pesan ayam potong paha atas crispy tanpa kulit jika ada.' },
    { code: 'CUS-2026-0005', name: 'Maya Indah', phone: '6281234567894', source: 'OTHER', notes: 'Pemesanan via telepon hotline outlet.' },
    { code: 'CUS-2026-0006', name: 'Rizky Fauzi', phone: '6281234567895', source: 'GOFOOD', notes: 'Request sambal matah dipisah selalu.' },
    { code: 'CUS-2026-0007', name: 'Bambang Irawan', phone: '6281234567896', source: 'GRABFOOD', notes: 'Pelanggan setia menu Kulit Crispy Bro.' },
    { code: 'CUS-2026-0008', name: 'Ratna Sulistyo', phone: '6281234567897', source: 'DIRECT', notes: 'Suka nasi uduk Bro Chicken dengan kremesan melimpah.' },
    { code: 'CUS-2026-0009', name: 'Fajar Nugraha', phone: '6281234567898', source: 'GOFOOD', notes: 'Order rutin setiap Senin dan Rabu sore.' },
    { code: 'CUS-2026-0010', name: 'Eka Prasetya', phone: '6281234567899', source: 'GRABFOOD', notes: 'Pesanan box catering ulang tahun mini.' },
    { code: 'CUS-2026-0011', name: 'Dian Permatasari', phone: '6281311223344', source: 'DIRECT', notes: 'Dapat diskon kartu komunitas alumni kampus.' },
    { code: 'CUS-2026-0012', name: 'Gunawan Susanto', phone: '6281311223355', source: 'GOFOOD', notes: 'Pelanggan delivery kos-kosan dekat outlet.' },
    { code: 'CUS-2026-0013', name: 'Tri Wahyuni', phone: '6281311223366', source: 'DIRECT', notes: 'Selalu bayar non-tunai QRIS di kasir.' },
    { code: 'CUS-2026-0014', name: 'Agus Setiawan', phone: '6281311223377', source: 'OTHER', notes: 'Pesanan rombongan jamaah pengajian.' },
    { code: 'CUS-2026-0015', name: 'Indah Puspitasari', phone: '6281311223388', source: 'GRABFOOD', notes: 'Catatan alamat sering harus diinfokan ke kurir.' },
    { code: 'CUS-2026-0016', name: 'Wahyu Hidayat', phone: '6281311223399', source: 'DIRECT', notes: 'Sering bungkus take-away sepulang kantor.' },
    { code: 'CUS-2026-0017', name: 'Lestari Handayani', phone: '6281512345678', source: 'GOFOOD', notes: 'Pencinta sambal korek pedas gurih.' },
    { code: 'CUS-2026-0018', name: 'Dimas Anggoro', phone: '6281512345679', source: 'GRABFOOD', notes: 'Pernah minta ganti potongan dada ke paha bawah.' },
    { code: 'CUS-2026-0019', name: 'Nurul Hasanah', phone: '6281512345680', source: 'DIRECT', notes: 'Langganan menu paket hemat siang hari.' },
    { code: 'CUS-2026-0020', name: 'Ahmad Ridwan', phone: '6281512345681', source: 'OTHER', notes: 'Kontak katering kantor rekanan.' },
    { code: 'CUS-2026-0021', name: 'Yuliana Tan', phone: '6281512345682', source: 'DIRECT', notes: 'Baru mendaftar saat promo pembukaan cabang.', status: 'ARCHIVED' }
  ];

  const insertCustomer = db.prepare(`
    INSERT INTO customers (customer_code, name, phone, source, joined_at, notes, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  customersData.forEach((c, idx) => {
    const joined = new Date(Date.now() - (30 - idx) * 86400000).toISOString();
    insertCustomer.run(
      c.code,
      c.name,
      c.phone,
      c.source,
      joined,
      c.notes,
      c.status || 'ACTIVE',
      joined,
      joined
    );
  });

  // 3. Data Tiket Keluhan & Log Aktivitas
  const insertComplaint = db.prepare(`
    INSERT INTO complaints (
      ticket_code, customer_id, category, description, priority, status,
      assigned_to, created_by, created_at, sla_due_at, first_response_at, resolved_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertActivity = db.prepare(`
    INSERT INTO complaint_activities (complaint_id, user_id, activity_type, description, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  const cust1 = db.prepare("SELECT id FROM customers WHERE customer_code = 'CUS-2026-0001'").get();
  const cust2 = db.prepare("SELECT id FROM customers WHERE customer_code = 'CUS-2026-0002'").get();
  const cust3 = db.prepare("SELECT id FROM customers WHERE customer_code = 'CUS-2026-0003'").get();
  const cust4 = db.prepare("SELECT id FROM customers WHERE customer_code = 'CUS-2026-0004'").get();
  const cust6 = db.prepare("SELECT id FROM customers WHERE customer_code = 'CUS-2026-0006'").get();
  const cust7 = db.prepare("SELECT id FROM customers WHERE customer_code = 'CUS-2026-0007'").get();

  const currentTime = Date.now();

  // Tiket 1: BARU (created 45 menit lalu -> SLA due 15 menit lagi)
  const t1Created = new Date(currentTime - 45 * 60000).toISOString();
  const t1Due = new Date(currentTime + 15 * 60000).toISOString();
  const res1 = insertComplaint.run(
    'TCK-2026-0045',
    cust1.id,
    'FOOD_QUALITY',
    'Ayam geprek bagian paha atas terasa dingin di bagian dalam daging dan sambal bawang tidak gurih seperti biasa.',
    'HIGH',
    'NEW',
    budiUser.id,
    budiUser.id,
    t1Created,
    t1Due,
    null,
    null
  );
  insertActivity.run(res1.lastInsertRowid, budiUser.id, 'CREATED', 'Tiket keluhan dicatat dari laporan WhatsApp pelanggan.', t1Created);

  // Tiket 2: DIPROSES (created 68 menit lalu -> SLA due 8 menit lalu, first responded 28 menit lalu -> terlambat 8 menit)
  const t2Created = new Date(currentTime - 68 * 60000).toISOString();
  const t2Due = new Date(currentTime - 8 * 60000).toISOString();
  const t2Response = new Date(currentTime - 28 * 60000).toISOString();
  const res2 = insertComplaint.run(
    'TCK-2026-0044',
    cust2.id,
    'DELIVERY_DELAY',
    'Pesanan makan siang kantor terlambat lebih dari 45 menit dari estimasi waktu pengantaran via kurir internal.',
    'HIGH',
    'IN_PROGRESS',
    rinaUser.id,
    rinaUser.id,
    t2Created,
    t2Due,
    t2Response,
    null
  );
  insertActivity.run(res2.lastInsertRowid, rinaUser.id, 'CREATED', 'Tiket keluhan dicatat.', t2Created);
  insertActivity.run(res2.lastInsertRowid, rinaUser.id, 'STATUS_CHANGED', 'Status diubah ke Diproses. Mengonfirmasi keberadaan kurir.', t2Response);

  // Tiket 3: DIPROSES (created 25 menit lalu -> SLA due 35 menit lagi)
  const t3Created = new Date(currentTime - 25 * 60000).toISOString();
  const t3Due = new Date(currentTime + 35 * 60000).toISOString();
  const t3Response = new Date(currentTime - 15 * 60000).toISOString();
  const res3 = insertComplaint.run(
    'TCK-2026-0043',
    cust3.id,
    'WRONG_ORDER',
    'Menerima menu ayam bakar manis, padahal memesan paket ayam geprek pedas level 3.',
    'MEDIUM',
    'IN_PROGRESS',
    doniUser.id,
    doniUser.id,
    t3Created,
    t3Due,
    t3Response,
    null
  );
  insertActivity.run(res3.lastInsertRowid, doniUser.id, 'CREATED', 'Tiket keluhan dibuat.', t3Created);
  insertActivity.run(res3.lastInsertRowid, doniUser.id, 'STATUS_CHANGED', 'Status diubah ke Diproses. Mengirim ulang paket pesanan yang sesuai.', t3Response);

  // Tiket 4: SELESAI (kemarin, respons tepat waktu)
  const t4Created = new Date(currentTime - 24 * 3600000).toISOString();
  const t4Due = new Date(currentTime - 24 * 3600000 + 3600000).toISOString();
  const t4Response = new Date(currentTime - 24 * 3600000 + 1200000).toISOString();
  const t4Resolved = new Date(currentTime - 24 * 3600000 + 2400000).toISOString();
  const res4 = insertComplaint.run(
    'TCK-2026-0042',
    cust4.id,
    'SERVICE',
    'Pelayanan kasir outlet dinilai kurang ramah dan tidak menawarkan promo paket hemat.',
    'LOW',
    'RESOLVED',
    budiUser.id,
    budiUser.id,
    t4Created,
    t4Due,
    t4Response,
    t4Resolved
  );
  insertActivity.run(res4.lastInsertRowid, budiUser.id, 'CREATED', 'Tiket keluhan dibuat.', t4Created);
  insertActivity.run(res4.lastInsertRowid, budiUser.id, 'STATUS_CHANGED', 'Status diubah ke Diproses. Pembinaan staf kasir bersangkutan.', t4Response);
  insertActivity.run(res4.lastInsertRowid, budiUser.id, 'STATUS_CHANGED', 'Status diubah ke Selesai. Pelanggan telah dihubungi dan menerima klarifikasi.', t4Resolved);

  // Tiket 5: SELESAI (2 hari lalu, respons tepat waktu)
  const t5Created = new Date(currentTime - 48 * 3600000).toISOString();
  const t5Due = new Date(currentTime - 48 * 3600000 + 3600000).toISOString();
  const t5Response = new Date(currentTime - 48 * 3600000 + 900000).toISOString();
  const t5Resolved = new Date(currentTime - 48 * 3600000 + 1800000).toISOString();
  const res5 = insertComplaint.run(
    'TCK-2026-0041',
    cust6.id,
    'FOOD_QUALITY',
    'Kulit krispi agak alot karena kemasan kotak tertutup terlalu rapat saat pengantaran.',
    'MEDIUM',
    'RESOLVED',
    rinaUser.id,
    rinaUser.id,
    t5Created,
    t5Due,
    t5Response,
    t5Resolved
  );
  insertActivity.run(res5.lastInsertRowid, rinaUser.id, 'CREATED', 'Tiket keluhan dicatat.', t5Created);
  insertActivity.run(res5.lastInsertRowid, rinaUser.id, 'STATUS_CHANGED', 'Status diubah ke Diproses. Memberikan voucher kompensasi.', t5Response);
  insertActivity.run(res5.lastInsertRowid, rinaUser.id, 'STATUS_CHANGED', 'Status diubah ke Selesai.', t5Resolved);

  // Tiket 6: SELESAI (3 hari lalu, respons terlambat >60 menit)
  const t6Created = new Date(currentTime - 72 * 3600000).toISOString();
  const t6Due = new Date(currentTime - 72 * 3600000 + 3600000).toISOString();
  const t6Response = new Date(currentTime - 72 * 3600000 + 4500000).toISOString(); // 75 menit
  const t6Resolved = new Date(currentTime - 72 * 3600000 + 7200000).toISOString();
  const res6 = insertComplaint.run(
    'TCK-2026-0040',
    cust7.id,
    'CLEANLINESS',
    'Meja area dine-in belum dibersihkan saat pelanggan datang.',
    'LOW',
    'RESOLVED',
    doniUser.id,
    doniUser.id,
    t6Created,
    t6Due,
    t6Response,
    t6Resolved
  );
  insertActivity.run(res6.lastInsertRowid, doniUser.id, 'CREATED', 'Tiket keluhan dibuat.', t6Created);
  insertActivity.run(res6.lastInsertRowid, doniUser.id, 'STATUS_CHANGED', 'Status diubah ke Diproses (terlambat karena pergantian shift).', t6Response);
  insertActivity.run(res6.lastInsertRowid, doniUser.id, 'STATUS_CHANGED', 'Status diubah ke Selesai.', t6Resolved);

  console.log('[Seed] Berhasil mengisi:');
  console.log(' - 4 Akun Pengguna:');
  console.log('   * Owner: username "owner", sandi "12345678"');
  console.log('   * Admin: username "admin", sandi "12345678"');
  console.log('   * Admin 2: username "rina_sari", sandi "12345678"');
  console.log('   * Admin 3: username "doni_pratama", sandi "12345678"');
  console.log(' - 21 Data Pelanggan Simulasi');
  console.log(' - 6 Tiket Keluhan & Log Aktivitas Kronologis');
}

if (require.main === module) {
  const db = getDb();
  seedDatabase(db);
}

module.exports = { seedDatabase };
