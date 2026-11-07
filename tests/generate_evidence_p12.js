const puppeteer = require('puppeteer-core');
const path = require('node:path');
const fs = require('node:fs');
const app = require('../src/server');

const EVIDENCE_DIR = path.join(__dirname, '..', 'evidence', 'p12');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

// Locate Chrome or Edge
let executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
if (!fs.existsSync(executablePath)) {
  executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
}

console.log(`[Evidence P12] Menggunakan browser: ${executablePath}`);

const PORT = 3060;
const server = app.listen(PORT, async () => {
  console.log(`[Evidence P12] Test server berjalan di http://localhost:${PORT}`);
  let browser = null;

  try {
    browser = await puppeteer.launch({
      executablePath,
      headless: 'new',
      defaultViewport: { width: 1440, height: 900 },
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // 1. Login sebagai Owner (owner / 12345678)
    console.log('[Langkah 1] Login sebagai Owner...');
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0' });
    await sleep(500);

    await page.type('#login-username', 'owner');
    await page.type('#login-password', '12345678');
    await page.click('#login-form button[type="submit"]');
    await sleep(1000);

    // 2. Screenshot 1: Dashboard Ringkasan Metrik & Tiket Terbaru
    console.log('[Langkah 2] Mengambil screenshot Dashboard Operasional...');
    const path01 = path.join(EVIDENCE_DIR, '01-dashboard-ringkasan.png');
    await page.screenshot({ path: path01, fullPage: false });
    console.log(` -> Tersimpan: ${path01}`);

    // 3. Screenshot 2: Filter Periode Dashboard (Hari Ini / 7 Hari)
    console.log('[Langkah 3] Mengubah filter periode dashboard...');
    await page.select('.toolbar-left select', '7days');
    await sleep(600);
    const path02 = path.join(EVIDENCE_DIR, '02-dashboard-filter-periode.png');
    await page.screenshot({ path: path02, fullPage: false });
    console.log(` -> Tersimpan: ${path02}`);

    // Kembalikan ke bulan ini
    await page.select('.toolbar-left select', 'this_month');
    await sleep(400);

    // 4. Screenshot 3: Daftar Tiket Keluhan & SLA Countdown
    console.log('[Langkah 4] Membuka menu Keluhan & Tiket...');
    await page.click('a[href="#complaints"]');
    await sleep(800);
    const path03 = path.join(EVIDENCE_DIR, '03-keluhan-daftar-tiket.png');
    await page.screenshot({ path: path03, fullPage: false });
    console.log(` -> Tersimpan: ${path03}`);

    // 5. Screenshot 4: Detail Keluhan & Tindak Lanjut (TCK-2026-0045)
    console.log('[Langkah 5] Membuka detail tiket keluhan TCK-2026-0045...');
    await page.evaluate(() => {
      const rows = document.querySelectorAll('#complaint-tbody tr');
      for (const row of rows) {
        if (row.innerText.includes('TCK-2026-0045')) {
          const btn = row.querySelector('button.btn-secondary');
          if (btn) btn.click();
          break;
        }
      }
    });
    await sleep(800);
    const path04 = path.join(EVIDENCE_DIR, '04-keluhan-detail-tindak-lanjut.png');
    await page.screenshot({ path: path04, fullPage: false });
    console.log(` -> Tersimpan: ${path04}`);

    // 6. Screenshot 5: Studio Template WhatsApp
    console.log('[Langkah 6] Membuka Studio Template WhatsApp...');
    await page.click('a[href="#whatsapp"]');
    await sleep(800);
    const path05 = path.join(EVIDENCE_DIR, '05-whatsapp-template-studio.png');
    await page.screenshot({ path: path05, fullPage: false });
    console.log(` -> Tersimpan: ${path05}`);

    // 7. Screenshot 6: Pengikatan Pelanggan & Pratinjau Pesan WhatsApp
    console.log('[Langkah 7] Mengaitkan pelanggan Hendra Kusuma & tiket ke pratinjau pesan...');
    // Pilih pelanggan pertama (Hendra Kusuma)
    await page.evaluate(() => {
      const select = document.getElementById('wa-customer-select');
      if (select && select.options.length > 1) {
        select.selectedIndex = 1;
        select.dispatchEvent(new Event('change'));
      }
      const ticketInput = document.getElementById('wa-ticket-input');
      if (ticketInput) {
        ticketInput.value = 'TCK-2026-0045';
        ticketInput.dispatchEvent(new Event('input'));
      }
    });
    await sleep(600);
    const path06 = path.join(EVIDENCE_DIR, '06-whatsapp-pratinjau-pesan.png');
    await page.screenshot({ path: path06, fullPage: false });
    console.log(` -> Tersimpan: ${path06}`);

    // 8. Screenshot 7: Laporan & Kepatuhan SLA
    console.log('[Langkah 8] Membuka menu Laporan CRM & SLA...');
    await page.click('a[href="#reports"]');
    await sleep(800);
    const path07 = path.join(EVIDENCE_DIR, '07-laporan-crm-metrik.png');
    await page.screenshot({ path: path07, fullPage: false });
    console.log(` -> Tersimpan: ${path07}`);

    // 9. Screenshot 8: Manajemen Akun Admin (Owner View)
    console.log('[Langkah 9] Membuka menu Kelola Akun Admin (Owner)...');
    await page.click('a[href="#admin"]');
    await sleep(800);
    const path08 = path.join(EVIDENCE_DIR, '08-owner-kelola-admin.png');
    await page.screenshot({ path: path08, fullPage: false });
    console.log(` -> Tersimpan: ${path08}`);

    // 10. Screenshot 9: Proteksi Penonaktifan Admin dengan Tiket Aktif (SOP Bro Chicken)
    console.log('[Langkah 10] Menguji proteksi penonaktifan admin dengan tiket aktif...');
    await page.evaluate(() => {
      const rows = document.querySelectorAll('#admin-tbody tr');
      for (const row of rows) {
        if (row.innerText.includes('budi_santoso') || row.innerText.includes('Budi Santoso')) {
          const deactBtn = row.querySelector('button[style*="color: rgb(185, 28, 28)"], button[style*="color: #B91C1C"], button[style*="color: #DC2626"]');
          if (deactBtn) deactBtn.click();
          break;
        }
      }
    });
    await sleep(600);
    const path09 = path.join(EVIDENCE_DIR, '09-owner-proteksi-nonaktifkan.png');
    await page.screenshot({ path: path09, fullPage: false });
    console.log(` -> Tersimpan: ${path09}`);

    // 11. Screenshot 10: Pengaturan Sistem & Backup Database SQLite
    console.log('[Langkah 11] Membuka menu Pengaturan Sistem (Backup SQLite)...');
    await page.click('a[href="#settings"]');
    await sleep(800);
    const path10 = path.join(EVIDENCE_DIR, '10-owner-pengaturan-backup.png');
    await page.screenshot({ path: path10, fullPage: false });
    console.log(` -> Tersimpan: ${path10}`);

    // 12. Screenshot 11: Hak Akses RBAC Admin (Sidebar tanpa menu Owner)
    console.log('[Langkah 12] Logout dan login sebagai Admin untuk verifikasi RBAC...');
    await page.click('.btn-logout');
    await sleep(800);

    await page.type('#login-username', 'admin');
    await page.type('#login-password', '12345678');
    await page.click('#login-form button[type="submit"]');
    await sleep(1000);

    const path11 = path.join(EVIDENCE_DIR, '11-admin-rbac-sidebar.png');
    await page.screenshot({ path: path11, fullPage: false });
    console.log(` -> Tersimpan: ${path11}`);

    console.log('\n=== SELURUH 11 SCREENSHOT BUKTI P12 BERHASIL DIAMBIL SECARA NYATA ===\n');

  } catch (err) {
    console.error('Error saat proses pengujian P12:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
});
