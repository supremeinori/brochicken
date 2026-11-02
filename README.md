# Bro Chicken CRM (Customer Relationship Management)

Aplikasi CRM internal berbasis web untuk bisnis ayam goreng **Bro Chicken**, dirancang khusus untuk memusatkan basis data pelanggan, mencatat dan menindaklanjuti keluhan operasional (SLA target 60 menit), serta memfasilitasi komunikasi pelanggan menggunakan template WhatsApp resmi.

Dikembangkan sesuai dokumen spesifikasi **Software Requirements Specification (SRS) Versi 1.2** dan rancangan antarmuka **13 Layar FigCraft**.

---

## 1. Teknologi & Arsitektur

* **Frontend:** HTML5, CSS3 murni (Modern Design Tokens, palet F&B Bro Chicken `#EA580C`), Vanilla JavaScript (Single Page Application responsif).
* **Backend:** Node.js & Express.js.
* **Database:** SQLite lokal (`brochicken_crm.sqlite`) menggunakan engine sinkron bawaan Node.js (`node:sqlite`).
* **Autentikasi & Keamanan:** Hash kata sandi `bcryptjs`, manajemen sesi `express-session` (`HttpOnly`, `SameSite: 'lax'`), dan proteksi RBAC (*Role-Based Access Control*).

---

## 2. Cara Menjalankan Aplikasi

### A. Prasyarat
* Node.js v22.5.0+ (Direkomendasikan Node.js v24 LTS).

### B. Langkah Instalasi & Menjalankan Server
```bash
# 1. Masuk ke direktori proyek
cd c:\MyProjects\crmbrochicken

# 2. Instal dependensi
npm install

# 3. Jalankan server aplikasi
npm start
```
Server akan aktif di: **`http://localhost:3000`**

### C. Menjalankan Pengujian Kriteria Penerimaan SRS
```bash
# Uji 15 Kriteria Penerimaan Sistem (SRS Bagian 7)
npm test

# Uji Integrasi Server & Seluruh Endpoint API
node tests/server.test.js
```

---

## 3. Kredensial Akun Pengujian (Demo)

Sistem telah diinisialisasi otomatis dengan data awal (*auto-seed*):

| Role | Nama Pengguna | Username | Kata Sandi | Hak Akses Utama |
| :--- | :--- | :--- | :--- | :--- |
| **Owner** | Haji Rahmat | `owner` | `12345678` | Dashboard, Pelanggan, Tiket, SLA, Laporan, Manajemen Staf Admin, Unduh Backup SQLite, Ganti Sandi. |
| **Admin 1** | Budi Santoso | `admin` | `12345678` | Dashboard, Pengelolaan Pelanggan, Pencatatan & Update Tiket, Alih PIC, Template WhatsApp, Laporan. |
| **Admin 2** | Rina Sari | `rina_sari` | `12345678` | Operasional tiket & pelanggan. |
| **Admin 3** | Doni Pratama | `doni_pratama` | `12345678` | Operasional tiket & pelanggan. |

---

## 4. Fitur Utama

1. **Dashboard Operasional:** Metrik pelanggan aktif, tiket berjalan, tiket lewat batas SLA (>60 menit), dan tabel 5 tiket keluhan terbaru dengan indikator countdown waktu respons.
2. **Pengelolaan Pelanggan:**
   - Penomoran otomatis format `CUS-YYYY-NNNN`.
   - Pencarian instan (nama, no WA, ID), filter kanal pesanan (`DIRECT`, `GOFOOD`, `GRABFOOD`, `OTHER`), dan filter status aktif/arsip.
   - Normalisasi nomor WhatsApp otomatis dengan awalan `62`.
   - Pengarsipan aman tanpa menghapus data historis tiket keluhan.
3. **Manajemen Keluhan & SLA 60 Menit:**
   - Penomoran otomatis tiket `TCK-YYYY-NNNN`.
   - Alur status berjenjang: `Baru ➔ Diproses ➔ Selesai`.
   - Penandaan batas SLA 60 menit kalender secara akurat (*Sisa waktu*, *Kritis*, *Lewat batas waktu*).
   - Pengalihan penanggung jawab (PIC) ke admin aktif lain dan penambahan catatan tindak lanjut internal.
   - Rekam jejak kronologis pada riwayat aktivitas (*audit log*).
4. **Studio Pesan WhatsApp:**
   - 4 template pesan baku SRS (Sambutan baru, konfirmasi penerimaan, informasi penyelesaian, permintaan ulasan).
   - Injeksi otomatis nama pelanggan dan ID tiket.
   - Tombol salin pesan dan pembuka langsung ke WhatsApp Web / Desktop (`wa.me`).
5. **Laporan & Ekspor CSV:**
   - Filter rentang waktu (Hari Ini, 7 Hari, 30 Hari, Bulan Ini).
   - Analitik kepatuhan SLA dan rata-rata waktu respons.
   - Rekap distribusi keluhan dan performa masing-masing staf PIC.
   - Tombol ekspor file laporan ke format `.csv` ber-BOM UTF-8.
6. **Manajemen Akun Staf Admin (Khusus Owner):**
   - Tambah akun admin baru, reset sandi, dan toggle aktif/nonaktif.
   - **Proteksi SOP:** Sistem menolak penonaktifan admin yang masih memegang tiket aktif (Baru/Diproses).
7. **Pencadangan Database (Khusus Owner):**
   - Tombol langsung untuk mengunduh salinan mentah file `brochicken_crm.sqlite`.
