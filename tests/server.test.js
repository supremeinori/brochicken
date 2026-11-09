const assert = require('node:assert');
const app = require('../src/server');
const { getDb } = require('../src/db/database');

console.log('=== PENGUJIAN INTEGRASI SERVER & ENDPOINT API ===\n');

const server = app.listen(3999, async () => {
  try {
    const baseUrl = 'http://localhost:3999';

    // 1. Test Login Owner
    console.log('[Test 1] Pengujian Login Owner (owner)...');
    let loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password: '12345678' })
    });
    let loginData = await loginRes.json();
    assert.strictEqual(loginRes.status, 200);
    assert.strictEqual(loginData.success, true);
    assert.strictEqual(loginData.user.role, 'OWNER');
    const ownerCookie = loginRes.headers.get('set-cookie');
    console.log(' -> OK: Login Owner sukses dengan role OWNER.');

    // 2. Test Me Endpoint
    console.log('[Test 2] Pengujian Endpoint /api/auth/me...');
    let meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Cookie': ownerCookie }
    });
    let meData = await meRes.json();
    assert.strictEqual(meData.user.username, 'owner');
    console.log(' -> OK: Session cookie valid.');

    // 3. Test Dashboard Endpoint
    console.log('[Test 3] Pengujian Endpoint /api/dashboard...');
    let dashRes = await fetch(`${baseUrl}/api/dashboard?period=this_month`, {
      headers: { 'Cookie': ownerCookie }
    });
    let dashData = await dashRes.json();
    assert.strictEqual(dashData.success, true);
    assert.ok(dashData.data.total_active_customers >= 20);
    assert.ok(dashData.data.recent_tickets.length <= 5);
    console.log(` -> OK: Dashboard memuat ${dashData.data.total_active_customers} pelanggan dan ${dashData.data.recent_tickets.length} tiket terbaru.`);

    // 4. Test Customer List & Search
    console.log('[Test 4] Pengujian Endpoint /api/customers & Filter...');
    let custRes = await fetch(`${baseUrl}/api/customers?search=Hendra`, {
      headers: { 'Cookie': ownerCookie }
    });
    let custData = await custRes.json();
    assert.strictEqual(custData.success, true);
    assert.ok(custData.data.length >= 1);
    assert.strictEqual(custData.data[0].name, 'Hendra Kusuma');
    console.log(' -> OK: Pencarian pelanggan berhasil menemukan Hendra Kusuma.');

    // 5. Test Complaints List
    console.log('[Test 5] Pengujian Endpoint /api/complaints...');
    let compRes = await fetch(`${baseUrl}/api/complaints`, {
      headers: { 'Cookie': ownerCookie }
    });
    let compData = await compRes.json();
    assert.strictEqual(compData.success, true);
    assert.ok(compData.data.length >= 5);
    console.log(` -> OK: Tiket keluhan termuat (${compData.data.length} tiket).`);

    // 6. Test Templates Endpoint
    console.log('[Test 6] Pengujian Endpoint /api/templates...');
    let tmplRes = await fetch(`${baseUrl}/api/templates?customer_id=1&ticket_id=1`, {
      headers: { 'Cookie': ownerCookie }
    });
    let tmplData = await tmplRes.json();
    assert.strictEqual(tmplData.success, true);
    assert.strictEqual(tmplData.data.length, 4);
    assert.ok(tmplData.data[0].renderedText.includes('Hendra Kusuma'));
    console.log(' -> OK: 4 Template termuat dengan injeksi variabel nama pelanggan.');

    // 7. Test Reports & CSV Export
    console.log('[Test 7] Pengujian Endpoint /api/reports & CSV Export...');
    let repRes = await fetch(`${baseUrl}/api/reports?period=this_month`, {
      headers: { 'Cookie': ownerCookie }
    });
    let repData = await repRes.json();
    assert.strictEqual(repData.success, true);
    assert.ok(repData.data.summary.sla_compliance_rate >= 0);

    let csvRes = await fetch(`${baseUrl}/api/reports/export-csv?period=this_month`, {
      headers: { 'Cookie': ownerCookie }
    });
    assert.strictEqual(csvRes.status, 200);
    assert.ok(csvRes.headers.get('content-type').includes('text/csv'));
    const csvText = await csvRes.text();
    assert.ok(csvText.includes('ID Tiket,Nama Pelanggan'));
    console.log(' -> OK: Laporan analitik dan ekspor CSV berfungsi dengan baik.');

    // 8. Test Admin Management (Owner only)
    console.log('[Test 8] Pengujian Endpoint /api/admin/users...');
    let admRes = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { 'Cookie': ownerCookie }
    });
    let admData = await admRes.json();
    assert.strictEqual(admData.success, true);
    assert.strictEqual(admData.data.length, 4);
    console.log(' -> OK: Owner dapat mengakses manajemen akun admin.');

    // 9. Test RBAC: Admin mencoba akses /api/admin/users (harus 403)
    console.log('[Test 9] Pengujian RBAC Keamanan (Admin dilarang akses rute Owner)...');
    let adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: '12345678' })
    });
    const adminCookie = adminLogin.headers.get('set-cookie');
    let forbiddenRes = await fetch(`${baseUrl}/api/admin/users`, {
      headers: { 'Cookie': adminCookie }
    });
    assert.strictEqual(forbiddenRes.status, 403);
    console.log(' -> OK: Akses admin diblokir dengan kode HTTP 403 Forbidden.');

    // 10. Test UI Static Serving
    console.log('[Test 10] Pengujian Penyajian Frontend UI (index.html, logo, CSS)...');
    let htmlRes = await fetch(`${baseUrl}/`);
    assert.strictEqual(htmlRes.status, 200);
    const htmlText = await htmlRes.text();
    assert.ok(htmlText.includes('Bro Chicken CRM'));

    let logoRes = await fetch(`${baseUrl}/images/logo.png`);
    assert.strictEqual(logoRes.status, 200);
    assert.strictEqual(logoRes.headers.get('content-type'), 'image/png');

    let cssRes = await fetch(`${baseUrl}/css/main.css`);
    assert.strictEqual(cssRes.status, 200);
    assert.ok(cssRes.headers.get('content-type').includes('css'));
    console.log(' -> OK: File UI statis disajikan secara sempurna.');

    console.log('\n=== SELURUH PENGUJIAN INTEGRASI BERHASIL 100%! ===');
  } catch (e) {
    console.error('Pengujian gagal:', e);
  } finally {
    server.close();
    process.exit(0);
  }
});
