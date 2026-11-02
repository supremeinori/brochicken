# Tahapan Implementasi CRM Bro Chicken (Berdasarkan SRS v1.2)

Dokumen ini merupakan panduan teknis pelaksanaan pengembangan aplikasi CRM Bro Chicken untuk tahap P11–P12 sesuai dengan dokumen **Software Requirements Specification (SRS) v1.2** dan rancangan 13 layar antarmuka di FigCraft.

---

## 1. Arsitektur & Teknologi

* **Frontend:** HTML5, CSS3 murni (Modern Design Tokens), Vanilla JavaScript (Modular ES6).
* **Backend:** Node.js & Express.js.
* **Database:** SQLite lokal (`brochicken_crm.sqlite`) menggunakan engine sinkron bawaan Node.js (`node:sqlite`).
* **Keamanan & Sesi:** Hash kata sandi dengan `bcryptjs`, manajemen sesi dengan `express-session` + `cookie-parser` (`HttpOnly`, `SameSite: 'lax'`).
* **Format Waktu & Lokalisasi:** Timestamp disimpan dalam format ISO 8601 UTC, disajikan dalam antarmuka dengan zona waktu Indonesia Barat (`Asia/Jakarta`).

---

## 2. Rincian Tahapan Implementasi

### TAHAP 1: Inisialisasi Proyek & Database Engine
1. Membuat `.gitignore` untuk mengecualikan `node_modules/`, file database SQLite, temporary files, dan log.
2. Inisialisasi `package.json` dengan dependensi: `express`, `bcryptjs`, `express-session`, `cookie-parser`.
3. Membangun modul database `src/db/database.js`:
   * Mengaktifkan `PRAGMA foreign_keys = ON;` dan `PRAGMA journal_mode = WAL;`.
   * Membuat 4 tabel utama:
     - `users` (id, name, username, password_hash, role: OWNER/ADMIN, is_active, created_at, updated_at).
     - `customers` (id, customer_code: CUS-YYYY-NNNN, name, phone, source: DIRECT/GOFOOD/GRABFOOD/OTHER, joined_at, notes, status: ACTIVE/ARCHIVED, created_at, updated_at).
     - `complaints` (id, ticket_code: TCK-YYYY-NNNN, customer_id, category, description, priority: LOW/MEDIUM/HIGH, status: NEW/IN_PROGRESS/RESOLVED, assigned_to, created_by, created_at, sla_due_at, first_response_at, resolved_at).
     - `complaint_activities` (id, complaint_id, user_id, activity_type, description, created_at).
   * Membuat 5 index pencarian wajib:
     - `idx_customers_name`
     - `idx_customers_status`
     - `idx_complaints_status_created`
     - `idx_complaints_assigned_to`
     - `idx_activities_complaint_created`
   * Fungsi generator ID berurutan per tahun: `getNextCustomerCode()` (`CUS-YYYY-NNNN`) dan `getNextTicketCode()` (`TCK-YYYY-NNNN`).
   * Fungsi normalisasi nomor WhatsApp: awalan `62`, menghapus format awalan `0` atau `+62`, dan hanya angka.

### TAHAP 2: Seeding Data Awal Simulasi
1. Akun Pengguna Default (kata sandi: `password123`):
   * **1 Owner:** `haji_rahmat` (Haji Rahmat / Pemilik)
   * **3 Admin:** `budi_santoso`, `rina_sari`, `doni_pratama`
2. Data Pelanggan Simulasi:
   * Minimal 21 data pelanggan realistis mencakup berbagai kanal pesanan (`DIRECT`, `GOFOOD`, `GRABFOOD`, `OTHER`) dengan nomor telepon valid dan catatan preferensi.
3. Data Tiket & Log Aktivitas Awal:
   * Tiket berstatus `Baru` (sisa SLA 15 menit).
   * Tiket berstatus `Diproses` (lewat batas SLA 8 menit).
   * Tiket berstatus `Diproses` (sisa SLA 35 menit).
   * Tiket berstatus `Selesai` (tepat waktu).
   * Tiket berstatus `Selesai` (terlambat SLA).
   * Rekam jejak kronologis pada `complaint_activities`.

### TAHAP 3: Backend REST API & Aturan Bisnis
1. Middleware Autentikasi & RBAC (`src/middleware/auth.js`):
   * `requireAuth`: Memvalidasi sesi aktif pengguna.
   * `requireOwner`: Memproteksi endpoint khusus Owner (HTTP 403 jika diakses Admin).
2. Endpoint API:
   * `/api/auth`: Login, Logout, Info profil sesi saat ini.
   * `/api/customers`: CRUD pelanggan, pencarian, filter sumber & status, arsip, aktifkan kembali.
   * `/api/complaints`: Buat tiket, alur status `Baru ➔ Diproses ➔ Selesai`, pergantian PIC, penambahan catatan tindak lanjut.
   * `/api/templates`: 4 template statis WhatsApp bawaan dan injeksi variabel `{nama}` & `{ticket_id}`.
   * `/api/dashboard`: Agregasi metrik KPI operasional dan 5 tiket terbaru.
   * `/api/reports`: Analitik SLA, distribusi kategori keluhan, performa PIC, dan ekspor CSV.
   * `/api/admin`: Manajemen akun staf Admin (khusus Owner) dengan validasi blokir penonaktifan jika masih memegang tiket aktif.
   * `/api/settings`: Unduh backup database `brochicken_crm.sqlite` dan ganti sandi Owner.

### TAHAP 4: Frontend Vanilla JS & Desain FigCraft
1. Layout terpadu menggunakan palet F&B Bro Chicken: Oranye `#EA580C`, Abu-abu gelap `#0F172A`, Background `#F1F5F9`.
2. Aset logo ayam jago Bro Chicken terpasang konsisten.
3. Modul antarmuka lengkap (Dashboard, Pelanggan, Tiket, WhatsApp Web Launcher, Laporan, Kelola Admin, Pengaturan).

### TAHAP 5: Pengujian 15 Kriteria Penerimaan SRS
1. Memverifikasi seluruh 15 butir pengujian Bagian 7 SRS v1.2 secara menyeluruh.

---

## 3. Kredensial Default Demo

| Role | Nama | Username | Password Default |
| --- | --- | --- | --- |
| **Owner** | Haji Rahmat | `owner` | `12345678` |
| **Admin 1** | Budi Santoso | `admin` | `12345678` |
| **Admin 2** | Rina Sari | `rina_sari` | `12345678` |
| **Admin 3** | Doni Pratama | `doni_pratama` | `12345678` |
