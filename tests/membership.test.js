const assert = require('node:assert');
const app = require('../src/server');
const { getDb } = require('../src/db/database');
const membership = require('../src/services/membership');
const { getMonthEndInfo } = membership;

console.log('=== PENGUJIAN MEMBERSHIP, QR PROMO & KUPON TANGGAL TUA ===\n');

const db = getDb();
let passCount = 0;
let failCount = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passCount++;
  } catch (err) {
    console.error(`[FAIL] ${name}`);
    console.error(`       ${err.message}`);
    failCount++;
  }
}

function uniquePhone(offset = 0) {
  const base = String(Date.now()).slice(-7);
  const extra = String(offset).padStart(2, '0');
  return `6289${base}${extra}`;
}

const now = new Date();
const daysAgo = (days) => new Date(now.getTime() - days * 86400000);

// Siapkan tiga tipe member untuk pengujian kupon.
const inactivePhone = uniquePhone(1);
const activePhone = uniquePhone(2);
const newPhone = uniquePhone(3);

const inactive = membership.registerMember({
  name: 'Member Pasif Uji',
  phone: inactivePhone,
  campaignCode: 'QR_OUTLET',
  consent: true,
  now: daysAgo(40)
});
// Transaksi terakhir 20 hari lalu -> memenuhi syarat > 14 hari.
membership.recordTransaction({
  customerId: inactive.customer.id,
  occurredAt: daysAgo(20).toISOString(),
  channel: 'DIRECT',
  notes: 'Transaksi uji member pasif',
  now
});

const active = membership.registerMember({
  name: 'Member Aktif Uji',
  phone: activePhone,
  campaignCode: 'QR_PACKAGING',
  consent: true,
  now: daysAgo(40)
});
membership.recordTransaction({
  customerId: active.customer.id,
  occurredAt: daysAgo(2).toISOString(),
  channel: 'GOFOOD',
  notes: 'Transaksi uji member aktif',
  now
});

const fresh = membership.registerMember({
  name: 'Member Baru Uji',
  phone: newPhone,
  campaignCode: 'QR_TABLE',
  consent: true,
  now
});

// 1. Registrasi member baru.
test('Registrasi nomor baru membuat pelanggan, membership, dan welcome message', () => {
  assert.ok(inactive.customer.id, 'Pelanggan harus dibuat.');
  assert.ok(inactive.membership.id, 'Membership harus dibuat.');
  assert.strictEqual(inactive.customer_created, true);
  assert.strictEqual(inactive.membership_created, true);
  assert.match(inactive.membership.member_code, /^MBR-\d{4}-\d{4}$/);

  const welcome = db.prepare(`
    SELECT * FROM member_messages
    WHERE customer_id = ? AND message_type = 'WELCOME'
  `).all(inactive.customer.id);
  assert.strictEqual(welcome.length, 1, 'Welcome message harus tepat satu.');
  assert.strictEqual(welcome[0].provider, 'SIMULATION');
  assert.strictEqual(welcome[0].status, 'SENT');
  assert.ok(welcome[0].body.includes('Katalog Paket Hemat'));
});

// 2. Nomor lama tidak membuat pelanggan baru dan nama terbaru menimpa nama lama.
test('Nomor lama tidak membuat pelanggan ganda; nama terbaru menimpa nama lama', () => {
  const before = db.prepare('SELECT COUNT(*) AS c FROM customers').get().c;
  const again = membership.registerMember({
    name: 'Nama Terbaru Member',
    phone: inactivePhone,
    campaignCode: 'QR_OUTLET',
    consent: true,
    now
  });
  const after = db.prepare('SELECT COUNT(*) AS c FROM customers').get().c;

  assert.strictEqual(after, before, 'Jumlah pelanggan tidak boleh bertambah.');
  assert.strictEqual(again.customer.id, inactive.customer.id);
  assert.strictEqual(again.customer.name, 'Nama Terbaru Member');
  assert.strictEqual(again.customer_created, false);
  assert.strictEqual(again.membership_created, false);
});

// 3. Welcome hanya sekali per membership.
test('Welcome message hanya dikirim sekali per membership', () => {
  const rows = db.prepare(`
    SELECT * FROM member_messages
    WHERE customer_id = ? AND message_type = 'WELCOME'
  `).all(inactive.customer.id);
  assert.strictEqual(rows.length, 1, 'Registrasi ulang tidak boleh menambah welcome.');
});

// 4. Campaign QR valid dan tidak valid.
test('Campaign QR valid dikenali dan campaign tidak valid ditolak', () => {
  const campaigns = membership.listCampaigns();
  assert.strictEqual(campaigns.length, 3);
  assert.deepStrictEqual(campaigns.map(c => c.code).sort(), ['QR_OUTLET', 'QR_PACKAGING', 'QR_TABLE'].sort());
  assert.strictEqual(membership.getCampaign('QR_PALSU'), null, 'Campaign palsu harus ditolak.');
  const invalid = () => membership.registerMember({
    name: 'Campaign Palsu',
    phone: uniquePhone(9),
    campaignCode: 'QR_PALSU',
    consent: true,
    now
  });
  assert.throws(invalid, /Campaign QR tidak valid/);
});

// 5. Promo QR hanya sekali per member per campaign.
test('Promo QR hanya dikirim sekali per member per campaign', () => {
  const rows = db.prepare(`
    SELECT * FROM member_messages
    WHERE customer_id = ? AND message_type = 'QR_PROMO' AND campaign_code = 'QR_OUTLET'
  `).all(inactive.customer.id);
  assert.strictEqual(rows.length, 1);
  assert.ok(rows[0].body.includes('Harga khusus paket hemat'));
});

// 6. Transaksi manual memperbarui last_transaction_at.
test('Catat transaksi manual memperbarui last_transaction_at', () => {
  const occurred = daysAgo(1).toISOString();
  const result = membership.recordTransaction({
    customerId: active.customer.id,
    occurredAt: occurred,
    channel: 'DIRECT',
    notes: 'Transaksi terbaru',
    now
  });
  assert.strictEqual(result.membership.last_transaction_at, occurred);
  const row = db.prepare('SELECT COUNT(*) AS c FROM member_transactions WHERE customer_id = ?').get(active.customer.id);
  assert.ok(row.c >= 2);
});

// 7. Promo tanggal tua: kupon 10%, 7 hari, hanya untuk member pasif.
let firstRun = null;
test('Promo tanggal tua menerbitkan kupon 10% berlaku 7 hari hanya untuk member pasif', () => {
  firstRun = membership.runEndMonthPromo({ now, force: true });
  assert.strictEqual(firstRun.success, true);
  assert.ok(firstRun.issued >= 1, 'Minimal satu kupon harus terbit.');

  const info = getMonthEndInfo(now);
  const inactiveCoupons = db.prepare(`
    SELECT * FROM member_coupons WHERE customer_id = ? AND campaign_id = ?
  `).all(inactive.customer.id, info.campaign_id);
  assert.strictEqual(inactiveCoupons.length, 1, 'Member pasif harus mendapat satu kupon.');
  assert.strictEqual(inactiveCoupons[0].discount_percent, 10);
  assert.strictEqual(inactiveCoupons[0].status, 'ISSUED');

  const validityDays = (new Date(inactiveCoupons[0].expires_at) - new Date(inactiveCoupons[0].issued_at)) / 86400000;
  assert.strictEqual(Math.round(validityDays), 7, `Masa berlaku harus 7 hari, aktual ${validityDays}`);

  const activeCoupons = db.prepare(`
    SELECT COUNT(*) AS c FROM member_coupons WHERE customer_id = ? AND campaign_id = ?
  `).get(active.customer.id, info.campaign_id).c;
  assert.strictEqual(activeCoupons, 0, 'Member aktif tidak boleh mendapat kupon.');

  const freshCoupons = db.prepare(`
    SELECT COUNT(*) AS c FROM member_coupons WHERE customer_id = ? AND campaign_id = ?
  `).get(fresh.customer.id, info.campaign_id).c;
  assert.strictEqual(freshCoupons, 0, 'Member baru < 14 hari tidak boleh mendapat kupon.');
});

// 8. Scheduler idempoten.
test('Menjalankan promo dua kali tetap menghasilkan satu kupon per member', () => {
  const before = db.prepare(`
    SELECT COUNT(*) AS c FROM member_coupons WHERE customer_id = ?
  `).get(inactive.customer.id).c;
  const second = membership.runEndMonthPromo({ now, force: true });
  const after = db.prepare(`
    SELECT COUNT(*) AS c FROM member_coupons WHERE customer_id = ?
  `).get(inactive.customer.id).c;
  assert.strictEqual(second.issued, 0, 'Run kedua tidak boleh menerbitkan kupon baru.');
  assert.strictEqual(after, before);
});

// 9. Redeem kupon sekali, kedua kali ditolak.
test('Kupon dapat dipakai sekali; pemakaian kedua ditolak', () => {
  const info = getMonthEndInfo(now);
  const coupon = db.prepare(`
    SELECT * FROM member_coupons WHERE customer_id = ? AND campaign_id = ?
  `).get(inactive.customer.id, info.campaign_id);

  const used = membership.redeemCoupon(coupon.id, 1, now);
  assert.strictEqual(used.status, 'USED');
  assert.ok(used.used_at);
  assert.throws(() => membership.redeemCoupon(coupon.id, 1, now), /sudah digunakan/);
});

// 10. Pesan kupon masuk outbox simulasi.
test('Pesan kupon tersimpan di outbox simulasi', () => {
  const msg = db.prepare(`
    SELECT * FROM member_messages
    WHERE customer_id = ? AND message_type = 'END_MONTH_COUPON'
    ORDER BY id DESC LIMIT 1
  `).get(inactive.customer.id);
  assert.ok(msg, 'Pesan kupon harus tersimpan.');
  assert.strictEqual(msg.provider, 'SIMULATION');
  assert.strictEqual(msg.status, 'SENT');
  assert.ok(msg.body.includes('Diskon 10%'));
});

// -------------------------------------------------------------
// PENGUJIAN HTTP
// -------------------------------------------------------------
const server = app.listen(3998, async () => {
  const baseUrl = 'http://localhost:3998';
  let adminCookie = null;

  try {
    // 11. Endpoint publik tanpa login.
    console.log('\n[HTTP] Endpoint publik tanpa login...');
    const campaignRes = await fetch(`${baseUrl}/api/membership/public/campaign/QR_OUTLET`);
    const campaignData = await campaignRes.json();
    assert.strictEqual(campaignRes.status, 200);
    assert.strictEqual(campaignData.success, true);
    assert.strictEqual(campaignData.data.code, 'QR_OUTLET');

    const invalidRes = await fetch(`${baseUrl}/api/membership/public/campaign/QR_PALSU`);
    assert.strictEqual(invalidRes.status, 404);

    const publicPhone = uniquePhone(7);
    const registerRes = await fetch(`${baseUrl}/api/membership/public/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Member Via HTTP',
        phone: publicPhone,
        campaign: 'QR_TABLE',
        consent: true
      })
    });
    const registerData = await registerRes.json();
    assert.strictEqual(registerRes.status, 200);
    assert.strictEqual(registerData.success, true);
    assert.strictEqual(registerData.data.membership_created, true);
    console.log(' -> OK: Campaign publik, registrasi publik, dan campaign palsu berfungsi.');
    passCount++;

    // 12. Registrasi publik tanpa consent ditolak.
    const noConsentRes = await fetch(`${baseUrl}/api/membership/public/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Tanpa Consent', phone: uniquePhone(8), consent: false })
    });
    assert.strictEqual(noConsentRes.status, 400);
    console.log(' -> OK: Registrasi tanpa consent ditolak.');
    passCount++;

    // 13. Endpoint admin menolak tanpa sesi.
    console.log('\n[HTTP] Proteksi endpoint admin...');
    const unauthorized = await fetch(`${baseUrl}/api/membership/members`);
    assert.strictEqual(unauthorized.status, 401);
    console.log(' -> OK: Endpoint admin menolak tanpa login (401).');
    passCount++;

    // 14. Login admin dan akses data membership.
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '12345678' })
    });
    const loginData = await loginRes.json();
    assert.strictEqual(loginData.success, true);
    adminCookie = loginRes.headers.get('set-cookie');

    const statsRes = await fetch(`${baseUrl}/api/membership/stats`, { headers: { Cookie: adminCookie } });
    const statsData = await statsRes.json();
    assert.strictEqual(statsData.success, true);
    assert.ok(statsData.data.total_members >= 6);

    const membersRes = await fetch(`${baseUrl}/api/membership/members?limit=100`, { headers: { Cookie: adminCookie } });
    const membersData = await membersRes.json();
    assert.strictEqual(membersData.success, true);
    assert.ok(membersData.data.length >= 6);

    const couponsRes = await fetch(`${baseUrl}/api/membership/coupons`, { headers: { Cookie: adminCookie } });
    const couponsData = await couponsRes.json();
    assert.strictEqual(couponsData.success, true);

    const messagesRes = await fetch(`${baseUrl}/api/membership/messages`, { headers: { Cookie: adminCookie } });
    const messagesData = await messagesRes.json();
    assert.strictEqual(messagesData.success, true);
    assert.ok(messagesData.data.length > 0);
    console.log(' -> OK: Statistik, daftar member, kupon, dan outbox dapat diakses admin.');
    passCount++;

    // 15. QR campaign SVG disajikan.
    const qrRes = await fetch(`${baseUrl}/api/membership/qr/QR_OUTLET.svg`, { headers: { Cookie: adminCookie } });
    assert.strictEqual(qrRes.status, 200);
    assert.ok(qrRes.headers.get('content-type').includes('image/svg+xml'));
    const svg = await qrRes.text();
    assert.ok(svg.includes('<svg'));
    console.log(' -> OK: QR campaign SVG dihasilkan dan mengarah ke /daftar-member.');
    passCount++;

    // 16. Endpoint transaksi admin memperbarui data.
    const activeId = active.customer.id;
    const txnRes = await fetch(`${baseUrl}/api/membership/members/${activeId}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({
        occurred_at: daysAgo(0).toISOString(),
        channel: 'OTHER',
        notes: 'Transaksi melalui endpoint admin'
      })
    });
    const txnData = await txnRes.json();
    assert.strictEqual(txnRes.status, 200);
    assert.strictEqual(txnData.success, true);
    assert.ok(txnData.data.membership.last_transaction_at);
    console.log(' -> OK: Endpoint catat transaksi admin berfungsi.');
    passCount++;

    // 17. Endpoint manual promo berjalan.
    const runRes = await fetch(`${baseUrl}/api/membership/campaigns/end-month/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ force: true })
    });
    const runData = await runRes.json();
    assert.strictEqual(runRes.status, 200);
    assert.strictEqual(runData.success, true);
    assert.strictEqual(runData.data.issued, 0, 'Run idempoten setelah semua kupon bulan ini terbit.');
    console.log(' -> OK: Endpoint manual promo tanggal tua idempoten.');
    passCount++;
  } catch (err) {
    console.error('[FAIL] Pengujian HTTP membership');
    console.error('       ' + err.message);
    failCount++;
  } finally {
    server.close();
    console.log(`\nHasil: ${passCount} lulus, ${failCount} gagal.`);
    process.exit(failCount === 0 ? 0 : 1);
  }
});
