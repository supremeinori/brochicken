# Tahapan Implementasi CRM Bro Chicken (Berdasarkan SRS v1.2)

Dokumen ini merupakan panduan teknis pelaksanaan pengembangan aplikasi CRM Bro Chicken untuk tahap P11–P12 sesuai dengan dokumen **Software Requirements Specification (SRS) v1.2** dan rancangan 13 layar antarmuka di FigCraft.

---

## 1. Arsitektur & Teknologi

* **Frontend:** HTML5, CSS3 murni (Modern Design Tokens sesuai `/antislop-ui`), Vanilla JavaScript (Modular ES6).
* **Backend:** Node.js & Express.js.
* **Database:** SQLite lokal (`brochicken_crm.sqlite`) menggunakan engine sinkron bawaan Node.js (`node:sqlite`).
* **Keamanan & Sesi:** Hash kata sandi dengan `bcryptjs`, manajemen sesi dengan `express-session` + `cookie-parser` (`HttpOnly`, `SameSite: 'lax'`).
* **Format Waktu & Lokalisasi:** Timestamp disimpan dalam format ISO 8601 UTC, disajikan dalam antarmuka dengan zona waktu Indonesia Barat (`Asia/Jakarta`).

---

## 2. Status Penyelesaian Tahapan (P11 & P12 Selesai 100%)

### TAHAP 1: Inisialisasi Proyek & Database Engine (SELESAI)
1. Membuat `.gitignore` untuk mengecualikan `node_modules/`, file database SQLite, temporary files, dan folder `evidence/`.
2. Inisialisasi `package.json` dengan dependensi: `express`, `bcryptjs`, `express-session`, `cookie-parser`, `puppeteer-core`.
3. Membangun modul database `src/db/database.js`:
   * Mengaktifkan `PRAGMA foreign_keys = ON;` dan `PRAGMA journal_mode = WAL;`.
   * Membuat 4 tabel utama: `users`, `customers`, `complaints`, `complaint_activities`.
   * Membuat 5 index pencarian wajib (`idx_customers_name`, `idx_customers_status`, dll).
   * Generator ID berformat `KODE+DDMMYY+NNN`: `getNextCustomerCode()` (`CS+DDMMYY+NNN`), `getNextTicketCode()` (`TK+DDMMYY+NNN`), `getNextMemberCode()` (`MB+DDMMYY+NNN`).
   * Fungsi normalisasi nomor WhatsApp: awalan `62` tanpa simbol/spasi.

### TAHAP 2: Seeding Data Awal Simulasi & Uji CRUD P11 (SELESAI)
1. Akun Pengguna Default:
   * **Owner:** `owner` (Haji Rahmat / Pemilik, kata sandi: `12345678`)
   * **Admin:** `admin` (Budi Santoso, kata sandi: `12345678`)
   * **Admin 2 & 3:** `rina_sari`, `doni_pratama` (kata sandi: `12345678`)
2. Data Pelanggan Simulasi:
   * 21 Data pelanggan realistis Bro Chicken (`DIRECT`, `GOFOOD`, `GRABFOOD`, `OTHER`).
3. Data Tiket & Log Aktivitas Awal:
   * 6 Tiket keluhan mencakup variasi SLA (*Sisa 15 menit*, *Sisa 35 menit*, *Lewat 8 menit*, *Tepat waktu*).
4. **Bukti Pengujian P11:** Tersimpan 9 screenshot asli di `evidence/p11/`:
   * `01-daftar-pelanggan.png` (Daftar pelanggan 20 data awal)
   * `02-form-tambah.png` (Modal form tambah terisi)
   * `03-hasil-tambah.png` (Hasil simpan pelanggan baru)
   * `04-detail-pelanggan.png` (Profil detail & riwayat tiket)
   * `05-form-edit.png` (Modal form edit data)
   * `06-hasil-edit.png` (Hasil simpan edit profil)
   * `07-konfirmasi-hapus.png` (Modal konfirmasi pengarsipan)
   * `08-hasil-hapus.png` (Hasil pengarsipan pada tabel)
   * `09-validasi-form.png` (Uji validasi penolakan nomor WA duplikat)

### TAHAP 3: Backend REST API & Aturan Bisnis Lanjutan (SELESAI)
1. Middleware Autentikasi & RBAC (`src/middleware/auth.js`):
   * `requireAuth`: Memvalidasi sesi aktif pengguna.
   * `requireOwner`: Memproteksi endpoint khusus Owner (HTTP 403 jika diakses Admin).
2. Endpoint API Lengkap:
   * `/api/auth`: Login, Logout, Info profil sesi saat ini.
   * `/api/customers`: CRUD pelanggan, pencarian, filter sumber & status, arsip, aktifkan kembali.
   * `/api/complaints`: Buat tiket, alur status `Baru ➔ Diproses ➔ Selesai`, pergantian PIC, penambahan catatan tindak lanjut, kalkulasi countdown SLA 60 menit kalender.
   * `/api/templates`: 4 template statis WhatsApp bawaan dan injeksi variabel `{nama}` & `#{ticket_id}`.
   * `/api/dashboard`: Agregasi metrik KPI operasional dan 5 tiket terbaru.
   * `/api/reports`: Analitik SLA, distribusi kategori keluhan, performa PIC, dan ekspor CSV.
   * `/api/admin`: Manajemen akun staf Admin (khusus Owner) dengan proteksi penolakan nonaktif jika masih memegang tiket aktif.
   * `/api/settings`: Unduh backup database `brochicken_crm.sqlite` dan ganti sandi Owner.

### TAHAP 4: Frontend Vanilla JS & Desain FigCraft (SELESAI)
1. Layout terpadu menggunakan palet F&B Bro Chicken: Oranye `#EA580C`, Abu-abu gelap `#0F172A`, Background `#F1F5F9`.
2. Logo resmi kepala ayam jago Bro Chicken terpasang konsisten.
3. Seluruh modul antarmuka aktif mengonsumsi API (Dashboard, Pelanggan, Tiket, Studio WhatsApp, Laporan, Kelola Admin, Pengaturan).

### TAHAP 5: Pengujian Kriteria Penerimaan & Bukti P12 (SELESAI)
1. **Uji 15 Kriteria Penerimaan SRS (`npm test`):** 15/15 LULUS.
2. **Uji Integrasi Server & API (`node tests/server.test.js`):** 10/10 LULUS.
3. **Bukti Pengujian P12:** Tersimpan 11 screenshot asli di `evidence/p12/`:
   * `01-dashboard-ringkasan.png` (Ringkasan KPI operasional & 5 tiket terbaru)
   * `02-dashboard-filter-periode.png` (Filter periode dashboard responsif)
   * `03-keluhan-daftar-tiket.png` (Tabel tiket keluhan & countdown batas SLA)
   * `04-keluhan-detail-tindak-lanjut.png` (Detail keluhan, timeline aktivitas, form status)
   * `05-whatsapp-template-studio.png` (Studio template WhatsApp 4 pesan baku)
   * `06-whatsapp-pratinjau-pesan.png` (Pengikatan pelanggan & pratinjau dinamis)
   * `07-laporan-crm-metrik.png` (Laporan CRM, kepatuhan SLA %, distribusi kategori & PIC)
   * `08-owner-kelola-admin.png` (Tabel akun staf admin khusus Owner)
   * `09-owner-proteksi-nonaktifkan.png` (Proteksi SOP larangan menonaktifkan admin dengan tiket aktif)
   * `10-owner-pengaturan-backup.png` (Pengaturan outlet & tombol unduh backup SQLite)
   * `11-admin-rbac-sidebar.png` (Sidebar admin dengan proteksi RBAC menu Owner)

---

## 3. Kredensial Default Demo

| Role | Nama | Username | Password Default | Hak Akses |
| --- | --- | --- | --- | --- |
| **Owner** | Haji Rahmat | `owner` | `12345678` | Akses penuh seluruh sistem, kelola admin, unduh backup database, ganti sandi. |
| **Admin 1** | Budi Santoso | `admin` | `12345678` | Operasional pelanggan, tiket keluhan, studio WhatsApp, laporan CRM. |
| **Admin 2** | Rina Sari | `rina_sari` | `12345678` | Operasional pelanggan & tiket keluhan. |
| **Admin 3** | Doni Pratama | `doni_pratama` | `12345678` | Operasional pelanggan & tiket keluhan. |
