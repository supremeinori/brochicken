const puppeteer = require('puppeteer-core');
const path = require('node:path');
const fs = require('node:fs');
const app = require('../src/server');

const EVIDENCE_DIR = path.join(__dirname, '..', 'evidence', 'p11');
if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

// Locate Chrome or Edge
let executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
if (!fs.existsSync(executablePath)) {
  executablePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
}

console.log(`[Evidence] Menggunakan browser: ${executablePath}`);

const PORT = 3050;
const server = app.listen(PORT, async () => {
  console.log(`[Evidence] Test server berjalan di http://localhost:${PORT}`);
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

    // 1. Buka Halaman Login & Masuk sebagai Admin
    console.log('[Langkah 1] Membuka halaman login dan login sebagai admin...');
    await page.goto(`http://localhost:${PORT}`, { waitUntil: 'networkidle0' });
    await sleep(500);

    await page.type('#login-username', 'admin');
    await page.type('#login-password', '12345678');
    await page.click('#login-form button[type="submit"]');
    await sleep(1000);

    // 2. Buka Menu Daftar Pelanggan
    console.log('[Langkah 2] Membuka menu Daftar Pelanggan (20 data awal)...');
    await page.click('a[href="#customers"]');
    await sleep(800);

    // Screenshot 1: 01-daftar-pelanggan.png
    const path01 = path.join(EVIDENCE_DIR, '01-daftar-pelanggan.png');
    await page.screenshot({ path: path01, fullPage: false });
    console.log(` -> Tersimpan: ${path01}`);

    // 3. Buka Form Tambah Pelanggan & Isi Data Baru
    console.log('[Langkah 3] Membuka formulir tambah pelanggan baru...');
    await page.click('.toolbar-right button');
    await sleep(600);

    await page.type('#add-cust-name', 'Rian Pratama');
    await page.type('#add-cust-phone', '081298765432');
    await page.select('#add-cust-source', 'GOFOOD');
    await page.type('#add-cust-notes', 'Langganan menu Paket Geprek Sambal Bawang pedas level 3, pesan setiap jam makan siang.');
    await sleep(500);

    // Screenshot 2: 02-form-tambah.png
    const path02 = path.join(EVIDENCE_DIR, '02-form-tambah.png');
    await page.screenshot({ path: path02, fullPage: false });
    console.log(` -> Tersimpan: ${path02}`);

    // 4. Submit Tambah Pelanggan & Lihat Hasil di Tabel
    console.log('[Langkah 4] Menyimpan pelanggan baru dan menampilkan hasil...');
    await page.click('.modal-footer button.btn-primary');
    await sleep(800);

    // Screenshot 3: 03-hasil-tambah.png
    const path03 = path.join(EVIDENCE_DIR, '03-hasil-tambah.png');
    await page.screenshot({ path: path03, fullPage: false });
    console.log(` -> Tersimpan: ${path03}`);

    // 5. Buka Detail Pelanggan yang Baru Ditambahkan
    console.log('[Langkah 5] Membuka halaman detail profil pelanggan baru...');
    // Klik tombol Detail pada baris pertama (pelanggan baru Rian Pratama yang berada di urutan teratas)
    await page.evaluate(() => {
      const rows = document.querySelectorAll('#customer-tbody tr');
      for (const row of rows) {
        if (row.innerText.includes('Rian Pratama')) {
          const detailBtn = row.querySelector('button.btn-secondary');
          if (detailBtn) detailBtn.click();
          break;
        }
      }
    });
    await sleep(800);

    // Screenshot 4: 04-detail-pelanggan.png
    const path04 = path.join(EVIDENCE_DIR, '04-detail-pelanggan.png');
    await page.screenshot({ path: path04, fullPage: false });
    console.log(` -> Tersimpan: ${path04}`);

    // 6. Buka Form Edit Data Pelanggan
    console.log('[Langkah 6] Membuka form ubah data pelanggan...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const b of buttons) {
        if (b.innerText.includes('Ubah Profil')) {
          b.click();
          break;
        }
      }
    });
    await sleep(600);

    // Ubah catatan preferensi
    await page.evaluate(() => {
      const notesEl = document.getElementById('edit-cust-notes');
      if (notesEl) {
        notesEl.value = 'Langganan Paket Geprek Sambal Bawang level 5. Minta ekstra kremesan renyah.';
      }
    });
    await sleep(500);

    // Screenshot 5: 05-form-edit.png
    const path05 = path.join(EVIDENCE_DIR, '05-form-edit.png');
    await page.screenshot({ path: path05, fullPage: false });
    console.log(` -> Tersimpan: ${path05}`);

    // 7. Simpan Perubahan & Ambil Hasil Edit
    console.log('[Langkah 7] Menyimpan perubahan data profil...');
    await page.click('.modal-footer button.btn-primary');
    await sleep(800);

    // Screenshot 6: 06-hasil-edit.png
    const path06 = path.join(EVIDENCE_DIR, '06-hasil-edit.png');
    await page.screenshot({ path: path06, fullPage: false });
    console.log(` -> Tersimpan: ${path06}`);

    // 8. Buka Konfirmasi Hapus / Arsipkan Pelanggan
    console.log('[Langkah 8] Membuka dialog konfirmasi pengarsipan pelanggan...');
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      for (const b of buttons) {
        if (b.innerText.includes('Arsipkan')) {
          b.click();
          break;
        }
      }
    });
    await sleep(600);

    // Screenshot 7: 07-konfirmasi-hapus.png
    const path07 = path.join(EVIDENCE_DIR, '07-konfirmasi-hapus.png');
    await page.screenshot({ path: path07, fullPage: false });
    console.log(` -> Tersimpan: ${path07}`);

    // 9. Konfirmasi Arsipkan & Tampilkan Hasil
    console.log('[Langkah 9] Mengonfirmasi pengarsipan pelanggan...');
    await page.click('.modal-footer button.btn-danger');
    await sleep(800);

    // Kembali ke daftar pelanggan
    await page.click('a[href="#customers"]');
    await sleep(800);

    // Screenshot 8: 08-hasil-hapus.png
    const path08 = path.join(EVIDENCE_DIR, '08-hasil-hapus.png');
    await page.screenshot({ path: path08, fullPage: false });
    console.log(` -> Tersimpan: ${path08}`);

    // 10. Uji Validasi Form Tambah (Nomor HP Duplikat)
    console.log('[Langkah 10] Menguji validasi form (nomor telepon duplikat)...');
    await page.click('.toolbar-right button');
    await sleep(600);

    await page.type('#add-cust-name', 'Pelanggan Uji Validasi');
    // Masukkan nomor telepon Hendra Kusuma yang sudah terdaftar
    await page.type('#add-cust-phone', '081234567890');
    await page.select('#add-cust-source', 'DIRECT');
    await page.type('#add-cust-notes', 'Uji validasi penolakan nomor telepon kembar');
    await sleep(400);

    // Submit form yang memicu validasi error
    await page.click('.modal-footer button.btn-primary');
    await sleep(600);

    // Screenshot 9: 09-validasi-form.png (menampilkan toast error validasi)
    const path09 = path.join(EVIDENCE_DIR, '09-validasi-form.png');
    await page.screenshot({ path: path09, fullPage: false });
    console.log(` -> Tersimpan: ${path09}`);

    console.log('\n=== SELURUH 9 SCREENSHOT BUKTI P11 BERHASIL DIAMBIL SECARA NYATA ===\n');

  } catch (err) {
    console.error('Error saat proses pengujian:', err);
  } finally {
    if (browser) await browser.close();
    server.close();
    process.exit(0);
  }
});
