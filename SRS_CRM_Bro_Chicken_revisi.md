# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

# CRM BRO CHICKEN

| Informasi | Ketetapan |
| --- | --- |
| Nama Sistem | Bro Chicken Customer Relationship Management (CRM) |
| Jenis Sistem | Website CRM internal dengan halaman publik simulasi |
| Versi Dokumen | 2.1 |
| Status | Dokumen implementasi aktual (as-is) |
| Studi Kasus | Bro Chicken |
| Tahap Pengembangan | P11–P14 |
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js dan Express.js |
| Database | SQLite melalui modul bawaan `node:sqlite` |
| Pengguna | Owner, Admin, pelanggan publik, dan member publik tanpa login |

## Riwayat Revisi

| Versi | Perubahan |
| --- | --- |
| 1.0 | Rancangan awal kebutuhan CRM Bro Chicken. |
| 1.1 | Menghapus tabel database message_templates; template WhatsApp ditetapkan sebagai konfigurasi statis aplikasi. |
| 1.2 | Menetapkan scope, fitur, hak akses, alur status, SLA, struktur data, dan pembagian P11–P12 secara final. Menghapus fitur loyalitas dan promosi dari scope sistem. |
| 2.0 | Menambahkan Membership & Promo: registrasi mandiri melalui QR campaign, welcome message dan katalog paket hemat, log transaksi manual tanpa POS, serta kupon tanggal tua 10% yang berlaku 7 hari. Pengiriman WhatsApp ditetapkan sebagai simulasi dengan outbox dan SSE. Menambahkan FR-09, empat tabel membership, tahap P13, dan lima kriteria penerimaan baru. |
| 2.1 | Menyesuaikan dokumen dengan implementasi aktual. Mengubah format ID menjadi `CS`/`TK`/`MB` + `DDMMYY` + `NNN`. Menambahkan kotak masuk WhatsApp admin berbasis tabel `simulation_messages`, AI Triage Gemini dengan fallback rule-based, pembuatan tiket otomatis, balasan admin real-time, halaman publik `/simulasi` dan `/chat-pelanggan`, halaman `/daftar-member`, seluruh endpoint simulasi, event SSE, index baru, tahap P14, dan empat kriteria penerimaan baru sehingga total menjadi 24. |

## Daftar Isi

Pendahuluan

Pengguna dan Hak Akses

Kebutuhan Fungsional

Kebutuhan Nonfungsional

Rancangan Database

Tahap Implementasi

Kriteria Penerimaan Sistem

Batasan Sistem

Ketentuan Teknis dan Operasional

Penutup

## 1. Pendahuluan

### 1.1 Tujuan Dokumen

Dokumen Software Requirements Specification (SRS) ini menetapkan kebutuhan fungsional, kebutuhan nonfungsional, hak akses, rancangan data, batasan, dan kriteria penerimaan CRM Bro Chicken. Dokumen ini menggambarkan sistem yang benar-benar diimplementasikan pada repositori, bukan hanya rencana awal. Seluruh fitur yang tersedia di antarmuka, endpoint API, layanan, dan skema database dicatat di dokumen ini.

### 1.2 Tujuan Sistem

CRM Bro Chicken adalah aplikasi website yang memusatkan data pelanggan, tiket keluhan, pemantauan SLA, laporan layanan pelanggan, program membership, dan simulasi percakapan WhatsApp. Sistem digunakan oleh Owner dan Admin untuk operasional harian. Pelanggan dan calon member dapat membuka dua halaman publik tanpa login.

Tujuan sistem:

Memusatkan data pelanggan dalam satu database SQLite.

Menyediakan pencarian, penyaringan, pengurutan, dan pengelolaan data pelanggan.

Mencatat setiap keluhan sebagai tiket yang dapat dilacak beserta riwayat aktivitasnya.

Menetapkan Admin sebagai penanggung jawab tiket dan memantau batas respons 60 menit.

Menstandarkan komunikasi pelanggan melalui empat template WhatsApp statis.

Menyediakan dashboard operasional dan laporan kinerja layanan pelanggan.

Menyelenggarakan membership dengan registrasi publik, katalog paket hemat, QR campaign, dan kupon tanggal tua.

Menyediakan kotak masuk WhatsApp admin untuk membaca, menandai, dan membalas percakapan pelanggan.

Menjalankan AI Triage atas pesan pelanggan untuk menentukan jenis pesan, kategori, prioritas, sentimen, ringkasan masalah, dan balasan otomatis.

Membuat tiket CRM secara otomatis saat AI Triage mendeteksi keluhan.

Menyimpan seluruh percakapan simulasi agar tetap tersedia setelah halaman dimuat ulang.

Mendorong pesan baru ke browser admin dan pelanggan melalui Server-Sent Events (SSE).

### 1.3 Ruang Lingkup yang Ditetapkan

Sistem memiliki sebelas area fungsi berikut:

Login, sesi, dan pembatasan hak akses Owner/Admin.

Dashboard CRM.

Pengelolaan data pelanggan.

Pengelolaan tiket keluhan dan riwayat aktivitas.

Pemantauan SLA keluhan.

Template komunikasi WhatsApp bawaan.

Laporan CRM, kinerja PIC, dan ekspor CSV.

Manajemen akun Admin dan pengaturan akun Owner.

Membership, QR campaign, katalog paket hemat, log transaksi manual, kupon tanggal tua, dan outbox pesan simulasi.

Kotak masuk WhatsApp admin dan halaman simulasi pelanggan.

AI Triage Gemini dengan fallback rule-based, pembuatan tiket otomatis, dan balasan admin real-time.

Sistem bukan aplikasi Point of Sale (POS). Sistem tidak mencatat pembayaran, penjualan, stok, atau transaksi pesanan secara lengkap. Log transaksi member hanya mencatat tanggal, kanal, dan catatan aktivitas untuk menentukan member pasif. Tidak ada nominal harga, pembayaran, atau pengurangan stok di dalam log tersebut.

### 1.4 Istilah dan Definisi

| Istilah | Definisi |
| --- | --- |
| CRM | Customer Relationship Management, yaitu sistem untuk mengelola hubungan dan interaksi dengan pelanggan. |
| Owner | Pemilik Bro Chicken yang memantau data CRM, mengelola akun Admin, dan mengunduh backup. |
| Admin | Pengguna yang menjalankan operasional pelanggan, tiket, membership, dan kotak masuk WhatsApp. |
| Customer ID | Kode unik pelanggan dengan format `CS` + `DDMMYY` + `NNN`, contoh `CS091126001`. |
| Ticket ID | Kode unik tiket dengan format `TK` + `DDMMYY` + `NNN`, contoh `TK091126001`. |
| Member ID | Kode unik membership dengan format `MB` + `DDMMYY` + `NNN`, contoh `MB091126001`. |
| PIC | Person in Charge atau Admin yang bertanggung jawab atas tiket. |
| SLA | Service Level Agreement, yaitu target waktu respons keluhan 60 menit kalender. |
| AI Triage | Analisis otomatis pesan pelanggan untuk menentukan keluhan, kategori, prioritas, sentimen, ringkasan, dan balasan. |
| Gemini | Layanan AI Google yang dipanggil melalui REST API `generativelanguage.googleapis.com`. Model bawaan `gemini-3.5-flash-lite`. |
| Rule-based NLP | Fallback analisis berbasis kata kunci yang dipakai saat Gemini tidak tersedia atau gagal. |
| Kotak masuk WhatsApp | Halaman admin `#simulation` yang menampilkan seluruh ruang chat pelanggan. |
| Ruang chat | Representasi satu pelanggan pada kotak masuk. Satu pelanggan selalu menjadi satu ruang. |
| Pesan masuk | Pesan pelanggan dengan `direction = 'IN'` dan `sender_type = 'CUSTOMER'`. |
| Pesan keluar | Pesan dari AI atau Admin dengan `direction = 'OUT'`. |
| Data simulasi | Data fiktif yang digunakan untuk pengembangan, demonstrasi, dan pengujian. |
| Member | Pelanggan yang terdaftar pada program membership dan memiliki kode member. |
| Membership | Keanggotaan aktif seorang pelanggan pada program promo Bro Chicken. |
| QR Campaign | Kode kampanye pada QR pendaftaran: `QR_OUTLET`, `QR_PACKAGING`, atau `QR_TABLE`. |
| Katalog paket hemat | Tiga paket makanan beserta harga normal dan harga promo yang ditampilkan kepada member. |
| Kupon tanggal tua | Kupon diskon 10% yang diterbitkan pada tiga hari terakhir bulan untuk member yang tidak bertransaksi lebih dari 14 hari. |
| Consent | Persetujuan member untuk menerima pesan WhatsApp promotional. |
| Outbox | Tabel `member_messages` penyimpan pesan membership simulasi beserta status `QUEUED`, `SENT`, atau `FAILED`. |
| SSE | Server-Sent Events, mekanisme satu arah untuk mendorong pesan dari server ke browser yang terbuka. |

## 2. Pengguna dan Hak Akses

Sistem memiliki dua role login CRM: Owner dan Admin. Tidak ada role Kasir atau Supervisor. Pelanggan publik dan member publik bukan role login CRM. Keduanya hanya dapat mengakses halaman publik dan endpoint publik yang ditetapkan.

### 2.1 Owner

Owner adalah pemilik bisnis dan memiliki hak akses untuk:

Melihat dashboard, seluruh data pelanggan, seluruh tiket, SLA, kotak masuk WhatsApp, dan laporan CRM.

Melihat dan menggunakan template WhatsApp bawaan.

Membuat akun Admin serta mengubah nama dan username Admin.

Mengaktifkan dan menonaktifkan akun Admin.

Mengatur ulang password Admin.

Mengubah password akun Owner sendiri.

Melihat informasi outlet dan kebijakan SLA pada halaman Pengaturan.

Mengunduh backup database SQLite.

Owner memiliki akses baca untuk data pelanggan dan tiket operasional. Owner tidak menjadi PIC tiket. Owner dapat membalas percakapan pelanggan dari kotak masuk.

### 2.2 Admin

Admin adalah pelaksana operasional CRM dan memiliki hak akses untuk:

Melihat dashboard.

Menambah, melihat, mengubah, dan mengarsipkan data pelanggan.

Membuat, melihat, dan mengelola tiket keluhan.

Menetapkan atau mengganti PIC dari daftar Admin aktif.

Mengubah status tiket, menambahkan catatan tindak lanjut, dan memantau SLA.

Menggunakan template WhatsApp bawaan.

Melihat laporan CRM dan mengunduh CSV.

Mengelola data member, mencatat transaksi manual, menerbitkan QR campaign, dan menandai kupon sudah dipakai.

Membaca kotak masuk WhatsApp, menandai ruang sudah dibaca, dan membalas pelanggan.

Mengubah password akun sendiri.

Admin tidak dapat membuat akun, mengubah role pengguna, menonaktifkan akun pengguna lain, mengubah konfigurasi sistem, atau mengunduh backup database. Halaman `Akun admin` dan `Pengaturan sistem` hanya tampil untuk Owner.

### 2.3 Pelanggan Publik

Pelanggan publik bukan pengguna CRM dan tidak memiliki sesi login. Pelanggan dapat:

Membuka halaman `/simulasi` atau `/chat-pelanggan`.

Mengisi nama, nomor WhatsApp, dan kanal pembelian.

Memilih salah satu dari lima skenario contoh.

Mengirim pesan dan menerima balasan AI.

Melihat riwayat percakapan sendiri setelah halaman dimuat ulang.

Menerima balasan Admin dan pesan membership secara real-time melalui SSE.

Pelanggan tidak dapat membuka dashboard, data pelanggan lain, tiket, laporan, kotak masuk admin, atau endpoint admin.

### 2.4 Member Publik

Member publik bukan pengguna CRM dan tidak memiliki sesi login. Member dapat:

Membuka halaman `/daftar-member` dari QR campaign atau tautan langsung.

Mendaftar dengan nama, nomor WhatsApp, dan consent.

Melihat welcome message, katalog paket hemat, dan pesan promo QR pada layar hasil pendaftaran.

Membuka simulasi WhatsApp dengan nomor dan nama yang sudah terisi.

Member tidak dapat membuka dashboard, data pelanggan lain, tiket, laporan, atau endpoint admin.

### 2.5 Matriks Hak Akses

| Modul/Fungsi | Owner | Admin | Pelanggan publik | Member publik |
| --- | --- | --- | --- | --- |
| Dashboard | Lihat | Lihat | Tidak memiliki akses | Tidak memiliki akses |
| Data pelanggan | Lihat | Tambah, lihat, ubah, arsipkan | Tidak memiliki akses | Tidak memiliki akses |
| Tiket keluhan | Lihat seluruh tiket | Buat dan kelola | Tidak memiliki akses | Tidak memiliki akses |
| Penetapan PIC | Lihat | Tetapkan dan ubah PIC | Tidak memiliki akses | Tidak memiliki akses |
| SLA | Lihat | Lihat dan tindak lanjuti | Tidak memiliki akses | Tidak memiliki akses |
| Template WhatsApp | Lihat | Gunakan | Tidak memiliki akses | Tidak memiliki akses |
| Laporan CRM | Lihat dan ekspor | Lihat dan ekspor | Tidak memiliki akses | Tidak memiliki akses |
| Kotak masuk WhatsApp | Lihat dan balas | Lihat dan balas | Tidak memiliki akses | Tidak memiliki akses |
| AI Triage | Lihat hasil | Lihat hasil | Memicu lewat chat | Tidak memiliki akses |
| Membership & Promo | Lihat dan kelola | Kelola | Tidak memiliki akses | Daftar dan lihat pesan sendiri |
| Manajemen akun Admin | Kelola | Tidak memiliki akses | Tidak memiliki akses | Tidak memiliki akses |
| Password akun sendiri | Ubah | Ubah | Tidak memiliki akun | Tidak memiliki akun |
| Backup database | Unduh | Tidak memiliki akses | Tidak memiliki akses | Tidak memiliki akses |
| Halaman `/simulasi` | Tidak relevan | Tidak relevan | Buka dan chat | Buka dan chat |
| Halaman `/daftar-member` | Tidak relevan | Tidak relevan | Daftar member | Daftar member |

Seluruh pembatasan hak akses diperiksa di backend melalui middleware `requireAuth` dan `requireOwner`. Menyembunyikan tombol pada frontend tidak cukup sebagai pengamanan.

## 3. Kebutuhan Fungsional (Functional Requirements)

Seluruh requirement pada bagian ini termasuk dalam scope sistem dan telah diimplementasikan pada tahap P11, P12, P13, atau P14.

### FR-01 — Login dan Sesi Pengguna

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-01.01 | Sistem harus menyediakan halaman login dengan field username dan password. |
| FR-01.02 | Sistem harus memvalidasi username, password, dan status aktif akun sebelum membuat sesi login. |
| FR-01.03 | Sistem harus menolak login dengan kredensial salah atau akun nonaktif. |
| FR-01.04 | Sistem harus menyediakan fungsi logout yang mengakhiri sesi pengguna. |
| FR-01.05 | Sistem harus menampilkan nama dan role pengguna yang sedang login pada sidebar. |
| FR-01.06 | Sistem harus mengarahkan Owner dan Admin ke Dashboard setelah login berhasil. |
| FR-01.07 | Sistem harus menerapkan hak akses berdasarkan role Owner atau Admin pada setiap endpoint yang dilindungi. |
| FR-01.08 | Sistem tidak menyediakan pendaftaran akun mandiri. Akun Admin dibuat oleh Owner. |
| FR-01.09 | Sistem harus memeriksa sesi aktif melalui `GET /api/auth/me` saat halaman dimuat dan menghapus sesi bila akun sudah nonaktif. |
| FR-01.10 | Sistem harus menyimpan sesi pada cookie `brochicken.sid` dengan `httpOnly`, `sameSite=lax`, dan masa berlaku 24 jam. |
| FR-01.11 | Sistem harus menampilkan akun pengujian pada halaman login untuk keperluan demo. |

### FR-02 — Dashboard

Dashboard menjadi halaman utama setelah login. Filter awal Dashboard adalah bulan berjalan.

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-02.01 | Sistem harus menampilkan jumlah seluruh pelanggan berstatus Aktif. |
| FR-02.02 | Sistem harus menampilkan jumlah pelanggan baru pada periode filter berdasarkan `created_at`. |
| FR-02.03 | Sistem harus menampilkan jumlah tiket berstatus Baru, Diproses, dan Selesai pada periode filter. |
| FR-02.04 | Sistem harus menampilkan jumlah tiket aktif yang belum mendapat respons pertama dan telah melewati `sla_due_at`. |
| FR-02.05 | Sistem harus menampilkan lima tiket terbaru beserta ID tiket, pelanggan, kategori, prioritas, status, PIC, dan status SLA. |
| FR-02.06 | Sistem harus menyediakan filter periode Bulan Ini, Hari Ini, 7 Hari Terakhir, dan 30 Hari Terakhir pada antarmuka. Endpoint juga menerima `custom` dengan `start_date` dan `end_date`. |
| FR-02.07 | Sistem harus memperbarui seluruh angka dan daftar berdasarkan data database sesuai periode yang dipilih. |
| FR-02.08 | Sistem harus menyediakan tautan dari kartu ringkasan dan tabel ke daftar pelanggan, daftar tiket, atau detail tiket. |
| FR-02.09 | Sistem harus menyediakan tombol Tambah pelanggan dan Catat keluhan langsung dari Dashboard. |
| FR-02.10 | Sistem harus menampilkan status SLA berupa Sisa waktu, Sisa kritis (≤15 menit), Lewat batas, Tepat waktu, atau Lewat batas waktu untuk tiket selesai. |

### FR-03 — Pengelolaan Data Pelanggan

#### 3.1 Daftar dan Pencarian

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-03.01 | Sistem harus menampilkan daftar pelanggan dalam tabel dengan kolom Customer ID, nama, nomor WhatsApp, sumber, tanggal bergabung, status, dan aksi. |
| FR-03.02 | Sistem harus menyediakan pencarian berdasarkan nama, Customer ID, atau nomor WhatsApp. |
| FR-03.03 | Sistem harus menyediakan filter berdasarkan sumber pelanggan dan status Aktif, Diarsipkan, atau Semua status. |
| FR-03.04 | Sistem harus menampilkan daftar pelanggan terbaru lebih dahulu berdasarkan `created_at` menurun. |
| FR-03.05 | Sistem harus menyediakan pagination dengan batas 10 data per halaman secara bawaan dan maksimal 100 data per permintaan. |
| FR-03.06 | Sistem harus menyediakan halaman detail pelanggan. |
| FR-03.07 | Halaman detail pelanggan harus menampilkan profil, catatan preferensi, badge member bila ada, dan seluruh tiket keluhan yang terhubung. |
| FR-03.08 | Halaman detail pelanggan harus menyediakan tautan WhatsApp Web, tombol Ubah profil, tombol Detail member, serta aksi Arsipkan atau Aktifkan kembali. |

#### 3.2 Penambahan dan Pengubahan

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-03.09 | Sistem harus menyediakan formulir tambah pelanggan untuk Admin. |
| FR-03.10 | Sistem harus menghasilkan Customer ID unik secara otomatis dengan format `CS` + `DDMMYY` + `NNN`, contoh `CS091126001`. |
| FR-03.11 | Nomor urut Customer ID dimulai dari `001` pada setiap tanggal dan dihitung dari kode terakhir dengan awalan tanggal yang sama. |
| FR-03.12 | Sistem harus mewajibkan nama, nomor WhatsApp, dan sumber pelanggan. |
| FR-03.13 | Sistem harus menyediakan sumber pelanggan tetap: `DIRECT`, `GOFOOD`, `GRABFOOD`, dan `OTHER`. |
| FR-03.14 | Sistem harus menyimpan nomor WhatsApp dalam format nomor Indonesia yang dinormalisasi dengan awalan 62. |
| FR-03.15 | Sistem harus menolak nomor WhatsApp yang panjangnya kurang dari 10 digit atau lebih dari 15 digit setelah normalisasi. |
| FR-03.16 | Sistem harus menolak nomor WhatsApp yang sudah digunakan pelanggan lain. |
| FR-03.17 | Sistem harus mengisi tanggal bergabung, waktu pembuatan, dan waktu pembaruan secara otomatis. |
| FR-03.18 | Sistem harus menyediakan field catatan dengan nilai awal kosong. |
| FR-03.19 | Sistem harus memungkinkan Admin mengubah nama, nomor WhatsApp, sumber, dan catatan pelanggan. |
| FR-03.20 | Sistem harus menampilkan notifikasi berhasil atau pesan validasi ketika data disimpan. |

#### 3.3 Pengarsipan Pelanggan

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-03.21 | Sistem harus menyediakan aksi Arsipkan untuk mengubah status pelanggan menjadi `ARCHIVED`. |
| FR-03.22 | Sistem tidak boleh menghapus permanen data pelanggan yang sudah memiliki tiket keluhan. |
| FR-03.23 | Sistem harus mempertahankan seluruh tiket, membership, transaksi, pesan, kupon, dan riwayat percakapan saat pelanggan diarsipkan. |
| FR-03.24 | Sistem harus menyediakan aksi Aktifkan Kembali untuk mengubah pelanggan Diarsipkan menjadi `ACTIVE`. |
| FR-03.25 | Sistem harus menolak pembuatan tiket baru untuk pelanggan berstatus `ARCHIVED`. |
| FR-03.26 | Sistem harus menolak registrasi membership untuk pelanggan berstatus `ARCHIVED`. |

### FR-04 — Pengelolaan Keluhan dan Ticketing

#### 4.1 Pembuatan Tiket

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-04.01 | Sistem harus menyediakan formulir pembuatan tiket keluhan untuk Admin. |
| FR-04.02 | Setiap tiket harus terhubung dengan satu pelanggan yang sudah terdaftar dan berstatus `ACTIVE`. |
| FR-04.03 | Sistem harus menghasilkan Ticket ID unik dengan format `TK` + `DDMMYY` + `NNN`, contoh `TK091126001`. |
| FR-04.04 | Nomor urut Ticket ID dimulai dari `001` pada setiap tanggal dan dihitung dari kode terakhir dengan awalan tanggal yang sama. |
| FR-04.05 | Sistem harus mewajibkan pelanggan, kategori, deskripsi, dan prioritas keluhan. |
| FR-04.06 | Sistem harus menyediakan kategori tetap: `FOOD_QUALITY`, `WRONG_ORDER`, `DELIVERY_DELAY`, `SERVICE`, `CLEANLINESS`, dan `OTHER`. |
| FR-04.07 | Sistem harus menyediakan prioritas tetap: `LOW`, `MEDIUM`, dan `HIGH`. |
| FR-04.08 | Sistem harus mengisi status awal `NEW`, waktu pembuatan, dan batas SLA secara otomatis. |
| FR-04.09 | Sistem harus menetapkan Admin pembuat sebagai PIC awal tiket bila pengguna yang login adalah Admin. |
| FR-04.10 | Bila tiket dibuat oleh Owner tanpa `assigned_to`, sistem harus memilih Admin aktif pertama. |
| FR-04.11 | Sistem harus menolak PIC yang bukan akun Admin aktif. |
| FR-04.12 | Sistem harus mencatat aktivitas `CREATED` saat tiket dibuat. |
| FR-04.13 | Keluhan pelanggan yang belum terdaftar harus didahului dengan pendaftaran pelanggan. |

#### 4.2 Daftar dan Pengelolaan Tiket

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-04.14 | Sistem harus menampilkan daftar tiket dengan Ticket ID, pelanggan, kategori, prioritas, status, PIC, batas respons, dan aksi. |
| FR-04.15 | Sistem harus menyediakan pencarian berdasarkan Ticket ID, nama pelanggan, atau deskripsi keluhan. |
| FR-04.16 | Sistem harus menyediakan filter status, kategori, prioritas, dan PIC melalui parameter API. |
| FR-04.17 | Sistem harus mengurutkan tiket berdasarkan status Baru, Diproses, Selesai, lalu waktu pembuatan terbaru. |
| FR-04.18 | Sistem harus menyediakan pagination 10 data per halaman secara bawaan dan maksimal 100 data per permintaan. |
| FR-04.19 | Sistem harus menyediakan halaman detail tiket. |
| FR-04.20 | Sistem harus menampilkan profil pelanggan, deskripsi keluhan, prioritas, PIC, pembuat tiket, status, waktu SLA, respons pertama, waktu selesai, dan riwayat aktivitas pada detail tiket. |
| FR-04.21 | Sistem harus memungkinkan Admin mengganti PIC ke Admin lain yang berstatus aktif. |
| FR-04.22 | Sistem harus mencatat setiap perubahan PIC ke riwayat aktivitas tiket dengan tipe `PIC_CHANGED`. |
| FR-04.23 | Sistem harus memungkinkan Admin menambahkan catatan tindak lanjut pada tiket dengan tipe `NOTE_ADDED`. |
| FR-04.24 | Sistem harus mencatat pembuat dan waktu setiap aktivitas tiket. |
| FR-04.25 | Sistem harus menolak penggantian PIC pada tiket berstatus `RESOLVED` atau ke Admin yang sama. |
| FR-04.26 | Detail tiket harus menyediakan tombol Buka template WhatsApp yang mengarah ke studio template dengan pelanggan dan tiket terpilih. |

#### 4.3 Status Tiket

Status tiket hanya memiliki tiga nilai: `NEW` (Baru), `IN_PROGRESS` (Diproses), dan `RESOLVED` (Selesai).

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-04.27 | Tiket baru harus memiliki status `NEW`. |
| FR-04.28 | Admin harus mengubah status dari `NEW` menjadi `IN_PROGRESS` ketika penanganan pertama dimulai. |
| FR-04.29 | Sistem harus mengisi `first_response_at` pada perubahan pertama dari `NEW` menjadi `IN_PROGRESS` dan tidak mengubah timestamp tersebut setelahnya. |
| FR-04.30 | Admin harus mengubah status dari `IN_PROGRESS` menjadi `RESOLVED` setelah keluhan ditangani. |
| FR-04.31 | Sistem harus mengisi `resolved_at` ketika status berubah menjadi `RESOLVED`. |
| FR-04.32 | Sistem tidak mengizinkan tiket berpindah langsung dari `NEW` menjadi `RESOLVED`. |
| FR-04.33 | Sistem tidak mengizinkan tiket `RESOLVED` dibuka kembali. |
| FR-04.34 | Sistem tidak mengizinkan status `IN_PROGRESS` dikembalikan ke `NEW`. |
| FR-04.35 | Sistem harus menolak perubahan ke status yang sama. |
| FR-04.36 | Setiap perubahan status harus dicatat sebagai aktivitas `STATUS_CHANGED` beserta catatan opsional. |

### FR-05 — Pemantauan SLA

Target SLA ditetapkan 60 menit kalender sejak tiket dibuat. Perhitungan berjalan terus, termasuk di luar jam operasional. Nilai SLA sama untuk seluruh kategori dan prioritas keluhan.

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-05.01 | Sistem harus menetapkan `sla_due_at` sebesar `created_at` + 60 menit. |
| FR-05.02 | Sistem harus menampilkan sisa waktu respons selama tiket belum memiliki respons pertama dan batas SLA belum tercapai. |
| FR-05.03 | Sistem harus menandai tiket `OVERDUE` ketika waktu sekarang melewati `sla_due_at` dan `first_response_at` masih kosong. |
| FR-05.04 | Sistem harus menandai tiket `CRITICAL` ketika sisa waktu kurang dari atau sama dengan 15 menit. |
| FR-05.05 | Sistem harus menandai tiket `ON_TRACK` ketika sisa waktu lebih dari 15 menit. |
| FR-05.06 | Sistem harus menandai respons `COMPLIANT` atau Tepat waktu apabila `first_response_at` tidak melewati `sla_due_at`. |
| FR-05.07 | Sistem harus menandai respons `OVERDUE` atau Terlambat apabila `first_response_at` melewati `sla_due_at`. |
| FR-05.08 | Sistem harus menampilkan status SLA pada daftar tiket, detail tiket, Dashboard, dan panel konteks kotak masuk WhatsApp. |
| FR-05.09 | Sistem harus menghitung durasi respons dari `created_at` sampai `first_response_at`. |
| FR-05.10 | Panel konteks kotak masuk harus memperbarui hitungan sisa SLA setiap detik selama ruang chat dibuka. |

### FR-06 — Template Komunikasi WhatsApp

Template WhatsApp bersifat statis dan disimpan sebagai konfigurasi aplikasi pada `src/routes/templates.js`, bukan sebagai tabel database. Sistem menyediakan empat template tetap:

| ID Template | Judul | Kategori |
| --- | --- | --- |
| `COMPLAINT_RECEIVED` | Konfirmasi Penerimaan Keluhan | Keluhan |
| `COMPLAINT_RESOLVED` | Informasi Penyelesaian Keluhan | Keluhan |
| `GREETING` | Sambutan Pelanggan Baru | Relasi |
| `REVIEW_REQUEST` | Permintaan Ulasan Pelanggan | Relasi |

Sistem juga menghasilkan tiga pesan membership otomatis: welcome message berisi katalog paket hemat, promo QR campaign, dan kupon tanggal tua. Pesan otomatis tersebut disimpan pada outbox `member_messages`, bukan sebagai template statis.

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-06.01 | Sistem harus menampilkan empat template WhatsApp bawaan tersebut. |
| FR-06.02 | Admin harus dapat memilih pelanggan dari database sebelum menyiapkan pesan. |
| FR-06.03 | Sistem harus mengisi placeholder `{nama}`, `{nama_bisnis}`, dan `{ticket_id}`. Placeholder yang tidak terisi harus tetap tampil sebagai penanda. |
| FR-06.04 | Sistem harus menampilkan pratinjau pesan sebelum digunakan. |
| FR-06.05 | Admin harus dapat mengubah teks pada pratinjau untuk satu kali pengiriman tanpa mengubah template bawaan. |
| FR-06.06 | Sistem harus menyediakan tombol Salin Pesan yang menyalin teks ke clipboard. |
| FR-06.07 | Sistem harus menyediakan tombol Buka WhatsApp yang membuka `https://wa.me/<nomor>?text=<teks>` dengan nomor pelanggan dan teks pesan yang telah disiapkan. |
| FR-06.08 | Sistem harus menampilkan keterangan bahwa pengiriman dilakukan oleh Admin melalui WhatsApp dan tidak dikonfirmasi oleh CRM. |
| FR-06.09 | Sistem harus menyediakan welcome message otomatis berisi katalog paket hemat untuk member baru. |
| FR-06.10 | Sistem harus menyediakan pesan promo QR yang berisi harga khusus paket hemat sesuai campaign. |
| FR-06.11 | Sistem harus menyediakan pesan kupon tanggal tua yang memuat kode kupon dan tanggal berlaku. |
| FR-06.12 | Sistem harus mengirim seluruh pesan membership melalui provider `SIMULATION` dan mencatat status pengiriman pada outbox. |

### FR-07 — Laporan CRM

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-07.01 | Sistem harus menyediakan halaman Laporan & SLA untuk Owner dan Admin. |
| FR-07.02 | Sistem harus menyediakan filter periode Bulan Ini, Hari Ini, 7 Hari Terakhir, dan 30 Hari Terakhir. Endpoint juga menerima `custom` dengan `start_date` dan `end_date`. |
| FR-07.03 | Sistem harus menampilkan jumlah pelanggan baru dalam periode laporan. |
| FR-07.04 | Sistem harus menampilkan jumlah keluhan masuk beserta rincian status Baru, Diproses, dan Selesai. |
| FR-07.05 | Sistem harus menampilkan distribusi kategori keluhan dalam bentuk bar dan persentase. |
| FR-07.06 | Sistem harus menampilkan rata-rata waktu respons pertama untuk tiket yang sudah mendapatkan respons, dengan nilai minimum 1 menit per tiket. |
| FR-07.07 | Sistem harus menampilkan kepatuhan SLA dalam persen. Persentase dihitung dari tiket yang direspons dalam 60 menit dibagi seluruh tiket yang sudah memiliki respons pertama; bila belum ada respons, nilai awal 100%. |
| FR-07.08 | Sistem harus menampilkan jumlah tiket yang melewati SLA, termasuk tiket belum direspons yang sudah melewati batas. |
| FR-07.09 | Sistem harus menampilkan kinerja per PIC: jumlah tiket, tepat waktu, terlambat, dan persentase kepatuhan. |
| FR-07.10 | Sistem harus menyediakan ekspor CSV sesuai periode. |
| FR-07.11 | CSV harus memuat kolom ID Tiket, Nama Pelanggan, No WhatsApp, Kategori, Prioritas, Status, PIC, Waktu Dibuat, Batas SLA, Respons Pertama, Waktu Selesai, Status SLA, dan Deskripsi. |
| FR-07.12 | CSV harus memakai pemisah koma, BOM UTF-8 untuk kompatibilitas Excel, dan menyamarkan nomor WhatsApp dengan pola lima digit awal + `****` + tiga digit akhir. |

### FR-08 — Manajemen Akun dan Pengaturan

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-08.01 | Sistem harus menyediakan satu akun Owner awal yang dibuat saat instalasi. |
| FR-08.02 | Sistem harus menyediakan halaman manajemen akun Admin yang hanya dapat diakses Owner. |
| FR-08.03 | Owner harus dapat membuat akun Admin dengan nama, username, dan password awal. |
| FR-08.04 | Sistem harus menolak username yang sudah digunakan dan username yang kurang dari 3 karakter. |
| FR-08.05 | Sistem harus menolak password Admin yang kurang dari 6 karakter. |
| FR-08.06 | Owner harus dapat mengubah nama dan username Admin melalui endpoint `PATCH /api/admin/users/:id`. |
| FR-08.07 | Owner harus dapat mengatur ulang password Admin. |
| FR-08.08 | Owner harus dapat menonaktifkan dan mengaktifkan kembali akun Admin. |
| FR-08.09 | Sistem harus menolak login akun Admin yang nonaktif. |
| FR-08.10 | Sistem harus melarang penghapusan atau penonaktifan akun Owner. |
| FR-08.11 | Sistem harus menolak penonaktifan Admin yang masih menjadi PIC tiket berstatus `NEW` atau `IN_PROGRESS` sampai seluruh tiket tersebut dipindahkan ke Admin aktif lain. |
| FR-08.12 | Owner dan Admin harus dapat mengubah password akun sendiri dengan memasukkan password saat ini. |
| FR-08.13 | Owner harus dapat mengunduh salinan file database SQLite melalui `GET /api/settings/backup`. |
| FR-08.14 | Sistem harus menggunakan target SLA tetap 60 menit dan tidak menyediakan pengaturan perubahan target SLA. |
| FR-08.15 | Halaman Pengaturan harus menampilkan nama outlet, hotline, alamat, kebijakan SLA, kebijakan penomoran, dan jenis database sebagai informasi baca-saja. |
| FR-08.16 | Halaman Akun admin harus menampilkan jumlah tiket berjalan setiap pengguna. |

### FR-09 — Membership, QR Promo, dan Kupon Tanggal Tua

Membership terintegrasi dengan data pelanggan. Nomor WhatsApp tetap menjadi identitas unik pelanggan. Satu pelanggan hanya memiliki satu membership. Registrasi ulang dengan nomor yang sama tidak membuat pelanggan atau membership baru; nama terbaru menimpa nama lama.

#### 9.1 Registrasi Member

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-09.01 | Sistem harus menyediakan halaman publik `/daftar-member` yang dapat diakses tanpa login. |
| FR-09.02 | Halaman registrasi harus menerima parameter `campaign` dan menolak campaign yang tidak terdaftar. |
| FR-09.03 | Formulir registrasi harus mewajibkan nama minimal dua karakter, nomor WhatsApp valid, dan consent WhatsApp promotional. |
| FR-09.04 | Sistem harus menormalisasi nomor WhatsApp ke format awalan 62 dan memakai nomor tersebut sebagai identitas unik pelanggan. |
| FR-09.05 | Sistem harus memvalidasi nomor dengan pola `^62\d{8,15}$` setelah normalisasi. |
| FR-09.06 | Registrasi dengan nomor yang sudah ada harus memakai pelanggan lama dan memperbarui nama dengan nama terbaru. |
| FR-09.07 | Sistem harus menolak registrasi untuk pelanggan yang berstatus `ARCHIVED`. |
| FR-09.08 | Sistem harus membuat membership dengan kode unik berformat `MB` + `DDMMYY` + `NNN`, contoh `MB091126001`, dan status `ACTIVE`. |
| FR-09.09 | Sistem harus mencatat waktu bergabung, consent, dan sumber registrasi berupa `QR_OUTLET`, `QR_PACKAGING`, `QR_TABLE`, `MANUAL`, atau `SIMULATION`. |
| FR-09.10 | Registrasi tanpa campaign harus memakai `registered_via = 'MANUAL'` dan `campaign_code = NULL`. |
| FR-09.11 | Registrasi tanpa campaign tetap diperbolehkan dan halaman harus menampilkan pemberitahuan bahwa pendaftaran dibuka tanpa QR. |
| FR-09.12 | Pelanggan baru dari registrasi member harus dibuat dengan sumber `DIRECT` dan catatan asal registrasi. |
| FR-09.13 | Bila membership lama berstatus `INACTIVE`, registrasi ulang harus mengaktifkannya kembali tanpa membuat membership baru. |
| FR-09.14 | Halaman hasil registrasi harus menampilkan kode member, status aktif, katalog, dan pesan simulasi. |
| FR-09.15 | Halaman hasil registrasi harus menyediakan tombol Buka WhatsApp simulasi dengan parameter `phone` dan `name`. |
| FR-09.16 | Halaman hasil registrasi harus menyediakan tombol Daftarkan nomor lain yang mengosongkan formulir. |

#### 9.2 Welcome Message dan Katalog

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-09.17 | Sistem harus mengirim welcome message otomatis setelah membership baru dibuat. |
| FR-09.18 | Welcome message harus memuat nama member, kode member, dan katalog paket hemat. |
| FR-09.19 | Katalog harus memuat tiga paket: `HEMAT_KRISPI` (Rp25.000), `HEMAT_GEPREK` (Rp27.000), dan `HEMAT_BERDUA` (Rp50.000). |
| FR-09.20 | Welcome message hanya boleh dikirim sekali per membership; registrasi ulang tidak mengirim welcome baru. |
| FR-09.21 | Halaman hasil registrasi harus menampilkan welcome message dan katalog yang sama dengan isi outbox. |
| FR-09.22 | Katalog dengan campaign harus menampilkan `promo_price` sebesar harga normal dikurangi `promo_percent` campaign. |
| FR-09.23 | Format harga harus menggunakan Rupiah tanpa desimal. |

#### 9.3 QR Campaign dan Promo

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-09.24 | Sistem harus menyediakan tiga campaign QR tetap: `QR_OUTLET`, `QR_PACKAGING`, dan `QR_TABLE`. |
| FR-09.25 | Setiap campaign harus memiliki label, deskripsi, dan persentase promo 10%. |
| FR-09.26 | Sistem harus menghasilkan gambar QR yang mengarah ke `/daftar-member?campaign=<kode>`. |
| FR-09.27 | Sistem harus menyediakan QR dalam format SVG melalui `GET /api/membership/qr/:code.svg` dan PNG melalui `GET /api/membership/qr/:code.png`. |
| FR-09.28 | Admin harus dapat melihat pratinjau, membuka formulir, dan mengunduh QR campaign dalam format PNG. |
| FR-09.29 | Sistem harus mengirim pesan promo QR setelah registrasi yang berasal dari campaign valid. |
| FR-09.30 | Pesan promo QR hanya boleh dikirim sekali per member per campaign. |
| FR-09.31 | Pesan promo QR harus memuat label campaign, harga khusus, kode member, dan instruksi menunjukkan pesan di kasir. |

#### 9.4 Log Transaksi Manual

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-09.32 | Admin harus dapat mencatat transaksi member dari halaman Member & Promo atau detail member. |
| FR-09.33 | Log transaksi hanya memuat tanggal, kanal, catatan, dan Admin pencatat; tidak memuat nominal, pembayaran, atau stok. |
| FR-09.34 | Kanal transaksi harus salah satu dari `DIRECT`, `GOFOOD`, `GRABFOOD`, atau `OTHER`; nilai tidak valid diganti `DIRECT`. |
| FR-09.35 | Tanggal transaksi tidak boleh melebihi waktu sekarang dan harus berupa tanggal valid. |
| FR-09.36 | Sistem harus memperbarui `last_transaction_at` membership hanya bila tanggal transaksi lebih baru dari nilai sebelumnya. |
| FR-09.37 | Detail member harus menampilkan riwayat transaksi, pesan, dan kupon. |
| FR-09.38 | Formulir transaksi harus membatasi tanggal maksimum pada hari ini. |

#### 9.5 Kupon Tanggal Tua

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-09.39 | Sistem harus menyediakan scheduler yang memeriksa window tiga hari terakhir setiap bulan berdasarkan zona waktu Asia/Jakarta. |
| FR-09.40 | Scheduler harus berjalan setiap satu jam dan memakai timer `unref()` agar tidak menahan proses Node tetap hidup. |
| FR-09.41 | Member aktif yang memenuhi `COALESCE(last_transaction_at, joined_at) <= sekarang - 14 hari` harus menerima kupon diskon 10%. |
| FR-09.42 | Kupon harus memiliki kode unik dengan format `BC-TU-YYYYMM-<customerId>` dengan `customerId` dipadkan empat digit, contoh `BC-TU-202611-0007`. |
| FR-09.43 | Kupon harus berlaku 7 hari sejak diterbitkan. |
| FR-09.44 | Sistem harus membatasi maksimal satu kupon per member per bulan melalui kombinasi unik `(customer_id, campaign_id)`. |
| FR-09.45 | Proses penerbitan kupon harus idempoten; menjalankan scheduler berkali-kali tidak boleh membuat kupon ganda. |
| FR-09.46 | Sistem harus mengubah kupon `ISSUED` menjadi `EXPIRED` bila `expires_at` sudah lewat. |
| FR-09.47 | Admin harus dapat menjalankan promo tanggal tua secara manual untuk seluruh member yang memenuhi syarat, dengan opsi `force` untuk mode demo. |
| FR-09.48 | Admin harus dapat menandai kupon sebagai `USED`; kupon `USED` atau `EXPIRED` tidak boleh dipakai ulang. |
| FR-09.49 | Kupon yang sudah kedaluwarsa saat akan dipakai harus diubah menjadi `EXPIRED` terlebih dahulu. |
| FR-09.50 | Admin harus dapat mensimulasikan tanggal tua untuk satu member: sistem mengubah `last_transaction_at` menjadi 15 hari lalu, menerbitkan kupon bulan ini jika belum ada, dan mengirim pesan simulasi. Kupon tetap maksimal satu per member per bulan. |
| FR-09.51 | Simulasi tanggal tua harus menolak member nonaktif atau pelanggan `ARCHIVED`. |
| FR-09.52 | Simulasi tanggal tua harus menolak bila kupon bulan ini sudah `USED` atau `EXPIRED`. |
| FR-09.53 | Bila kupon bulan ini sudah ada dan masih `ISSUED`, sistem harus mengirim ulang pesan kupon yang sama tanpa membuat kupon baru. |

#### 9.6 Statistik, Outbox, dan Realtime

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-09.54 | Sistem harus menampilkan statistik total member, member aktif, member baru bulan ini, member pasif lebih dari 14 hari, kupon terbit, kupon terpakai, dan pesan terkirim. |
| FR-09.55 | Statistik harus menyertakan informasi window akhir bulan dan status scheduler. |
| FR-09.56 | Semua pesan membership harus disimpan pada `member_messages` dengan status `QUEUED`, `SENT`, atau `FAILED` dan provider `SIMULATION`. |
| FR-09.57 | Jika halaman simulasi pelanggan terbuka, pesan membership harus didorong melalui event SSE `member_message`. |
| FR-09.58 | Admin harus menerima event SSE `member_registered`, `member_message_sent`, `coupon_redeemed`, dan `end_month_promo_run`. |
| FR-09.59 | Admin harus dapat mencari member berdasarkan nama, nomor, atau kode member serta memfilter status `ACTIVE` atau `INACTIVE`. |
| FR-09.60 | Admin harus dapat melihat 20 kupon dan 20 pesan outbox terbaru pada halaman Member & Promo. |

### FR-10 — Kotak Masuk WhatsApp Admin (WhatsApp Simulation Inbox)

Kotak masuk WhatsApp admin tersedia pada rute `#simulation` dengan label `Kotak masuk WhatsApp`. Halaman ini mengorganisasikan seluruh percakapan pelanggan ke dalam ruang-ruang chat yang persisten.

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-10.01 | Sistem harus menyediakan halaman kotak masuk WhatsApp admin yang hanya dapat diakses setelah login. |
| FR-10.02 | Kotak masuk harus menampilkan daftar ruang chat di mana setiap pelanggan pada tabel `customers` direpresentasikan sebagai satu ruang chat (`customer_id`). |
| FR-10.03 | Daftar ruang chat harus menampilkan nama pelanggan, avatar inisial, waktu pesan terakhir, cuplikan pesan terakhir, kanal pembelian, badge belum dibaca, dan penanda `Diarsipkan` bila pelanggan nonaktif. |
| FR-10.04 | Ruang chat yang memiliki pesan harus diurutkan di atas ruang tanpa pesan, lalu diurutkan berdasarkan waktu pesan terakhir menurun dan nama pelanggan. |
| FR-10.05 | Sistem harus menyediakan pencarian ruang chat berdasarkan nama, nomor WhatsApp, atau Customer ID. |
| FR-10.06 | Admin harus dapat memilih satu ruang chat untuk membuka panel percakapan dan panel konteks CRM. |
| FR-10.07 | Panel percakapan harus menampilkan header dengan tombol kembali (pada layar kecil), avatar, nama, nomor, Customer ID, badge arsip, tautan ke layar pelanggan, dan tombol toggle konteks CRM. |
| FR-10.08 | Panel percakapan harus menampilkan seluruh riwayat pesan dengan pembagi tanggal (Hari ini, Kemarin, atau tanggal lengkap) dan waktu jam:menit. |
| FR-10.09 | Bubble pesan masuk (`IN`) harus menampilkan nama pengirim dan label `masuk`. |
| FR-10.10 | Bubble pesan otomatis AI (`OUT` + `AI`) harus menampilkan pengirim `Bro Chicken Assistant · otomatis` dan label `terkirim`. |
| FR-10.11 | Bubble pesan admin (`OUT` + `ADMIN`) harus menampilkan nama admin, label `staf Bro Chicken`, dan label `terkirim`. |
| FR-10.12 | Membuka ruang chat dengan pesan yang belum dibaca harus secara otomatis menandai seluruh pesan masuk pada ruang tersebut menjadi terbaca (`read_at` terisi) melalui `POST /api/simulation/rooms/:customerId/read`. |
| FR-10.13 | Sistem harus menghitung badge belum dibaca per ruang hanya dari pesan dengan `direction = 'IN'` dan `read_at IS NULL`. |
| FR-10.14 | Header kotak masuk harus menampilkan jumlah seluruh ruang dan total pesan belum dibaca. |
| FR-10.15 | Admin harus dapat membalas percakapan pelanggan melalui formulir composer di bawah percakapan. |
| FR-10.16 | Panel konteks CRM harus menampilkan profil pelanggan, kode pelanggan, kanal, status, tanggal bergabung, tombol buka profil pelanggan, hasil analisis triage terakhir, dan ringkasan tiket terbaru. |
| FR-10.17 | Ringkasan tiket pada panel konteks harus menampilkan kode tiket, badge status, badge prioritas, nama PIC, hitungan mundur batas respons SLA, dan tombol Buka tiket di CRM. |
| FR-10.18 | Hitungan mundur SLA pada panel konteks harus diperbarui setiap detik; bila terlampaui, badge berubah menjadi `SLA terlampaui`. |
| FR-10.19 | Panel konteks dapat dibuka atau ditutup melalui tombol Info CRM / Tutup info dan scrim pada layar kecil. |
| FR-10.20 | Kotak masuk harus mendukung deep link hash `#simulation/:customerId` untuk langsung membuka ruang tertentu. |
| FR-10.21 | Kotak masuk harus mendengarkan event SSE `new_customer_chat` dan memuat ulang ruang serta thread yang sedang aktif tanpa memuat ulang seluruh halaman. |
| FR-10.22 | Kotak masuk harus menampilkan toast notifikasi saat pesan baru diterima dari pelanggan. |
| FR-10.23 | Kotak masuk harus mendengarkan event SSE `admin_reply_sent` untuk menyinkronkan balasan antar tab admin. |
| FR-10.24 | Kotak masuk harus menyediakan tombol Muat ulang manual pada header daftar ruang. |

### FR-11 — AI Triage, Pembuatan Tiket Otomatis, dan Balasan Real-Time

Layanan AI Triage menganalisis setiap pesan yang dikirim pelanggan dari halaman publik `/simulasi` atau melalui endpoint `/api/simulation/public/chat` dan `/api/simulation/chat`.

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-11.01 | Sistem harus menganalisis setiap pesan masuk menggunakan Gemini API model `gemini-3.5-flash-lite` dengan temperature 0.2 dan response MIME type `application/json`. |
| FR-11.02 | Sistem harus menggunakan kunci API dari variabel lingkungan `GEMINI_API_KEY`. |
| FR-11.03 | Sistem harus menyediakan fallback rule-based NLP apabila `GEMINI_API_KEY` tidak dikonfigurasi, kuota habis, terjadi error jaringan, atau timeout 8 detik. |
| FR-11.04 | Fallback rule-based NLP harus mendeteksi keluhan berdasarkan minimal 38 kata kunci komplain dan menentukan kategori serta prioritas berdasarkan kata kunci terkait. |
| FR-11.05 | Hasil analisis harus memuat field `is_complaint` (boolean), `category` (salah satu dari 6 kategori), `priority` (`LOW`, `MEDIUM`, `HIGH`), `sentiment` (`NEGATIVE`, `NEUTRAL`, `POSITIVE`), `extracted_problem` (ringkasan masalah), `ai_auto_reply` (balasan otomatis), dan `engine` (`gemini (<model>)` atau `rule_based_nlp`). |
| FR-11.06 | Kategori hasil triage harus dipetakan ke enam kategori resmi: `FOOD_QUALITY`, `WRONG_ORDER`, `DELIVERY_DELAY`, `SERVICE`, `CLEANLINESS`, atau `OTHER`. |
| FR-11.07 | Pesan non-komplain harus diberi kategori `OTHER`, prioritas `MEDIUM`, sentimen `NEUTRAL` atau `POSITIVE`, dan balasan ramah yang tidak memuat kode tiket. |
| FR-11.08 | Bila pelanggan belum terdaftar pada database, sistem harus membuat data pelanggan baru dengan kode otomatis `CS` + `DDMMYY` + `NNN`, sumber sesuai kiriman (atau `GOFOOD` bila tidak valid), status `ACTIVE`, dan catatan asal simulasi. |
| FR-11.09 | Bila nomor pelanggan sudah terdaftar tetapi nama yang dikirim berbeda, sistem harus memperbarui nama pelanggan lama dengan nama terbaru tanpa membuat pelanggan baru. |
| FR-11.10 | Jika hasil triage menetapkan `is_complaint = true`, sistem harus membuat tiket komplain secara otomatis pada tabel `complaints`. |
| FR-11.11 | Tiket komplain otomatis harus memiliki kode unik `TK` + `DDMMYY` + `NNN`, status `NEW`, batas respons `created_at` + 60 menit, deskripsi sesuai pesan pelanggan, serta kategori dan prioritas dari hasil triage. |
| FR-11.12 | Tiket komplain otomatis harus ditugaskan ke Admin aktif pertama di database. |
| FR-11.13 | Sistem harus mencatat aktivitas `CREATED` pada `complaint_activities` dengan keterangan bahwa tiket dibuat otomatis oleh WhatsApp AI Triage beserta engine dan ringkasan masalah. |
| FR-11.14 | Kode tiket yang baru dibuat harus disisipkan ke dalam balasan AI menggantikan placeholder `#{ticket_code}` atau `{ticket_id}`. |
| FR-11.15 | Pesan masuk pelanggan harus disimpan ke tabel `simulation_messages` dengan `direction = 'IN'`, `sender_type = 'CUSTOMER'`, hasil analisis dalam format JSON, dan referensi tiket bila ada. |
| FR-11.16 | Balasan AI harus disimpan ke tabel `simulation_messages` dengan `direction = 'OUT'`, `sender_type = 'AI'`, `sender_name = 'Bro Chicken Assistant'`, dan referensi tiket bila ada. |
| FR-11.17 | Sistem harus menyiarkan event SSE `new_customer_chat` ke seluruh client admin yang terhubung melalui `/api/simulation/admin/stream`. |
| FR-11.18 | Admin harus dapat membalas pesan melalui `POST /api/simulation/admin/reply` dengan parameter `phone`, `ticket_id` (opsional), dan `message`. |
| FR-11.19 | Balasan admin harus disimpan ke tabel `simulation_messages` dengan `direction = 'OUT'`, `sender_type = 'ADMIN'`, dan `sender_name` sesuai admin yang login. |
| FR-11.20 | Bila balasan admin menyertakan `ticket_id`, sistem harus mencatat aktivitas `NOTE_ADDED` pada tiket tersebut dengan isi balasan. |
| FR-11.21 | Bila balasan admin menyertakan `ticket_id` dan tiket tersebut masih berstatus `NEW`, sistem harus secara otomatis mengubah statusnya menjadi `IN_PROGRESS` dan mengisi `first_response_at` dengan waktu sekarang. |
| FR-11.22 | Balasan admin harus dikirimkan langsung secara real-time ke tab browser pelanggan yang bersangkutan melalui event SSE `admin_reply`. |
| FR-11.23 | Balasan admin harus disiarkan ke seluruh admin melalui event SSE `admin_reply_sent` untuk sinkronisasi antarmuka. |

### FR-12 — Halaman Publik Simulasi Pelanggan (`/simulasi` dan `/chat-pelanggan`)

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-12.01 | Sistem harus menyediakan halaman publik `/simulasi` dan alias `/chat-pelanggan` yang dapat diakses tanpa login. |
| FR-12.02 | Halaman harus menampilkan antarmuka bertema WhatsApp dengan indikator POV Pelanggan (Publik) dan tautan ke CRM admin. |
| FR-12.03 | Halaman harus menyediakan formulir konfigurasi pelanggan: nama, nomor WhatsApp, dan pilihan kanal (`GOFOOD`, `GRABFOOD`, `DIRECT`, `OTHER`). |
| FR-12.04 | Halaman harus menerima parameter query `phone` dan `name` untuk mengisi konfigurasi secara otomatis. |
| FR-12.05 | Halaman harus menampilkan lima tombol skenario contoh yang diambil dari `GET /api/simulation/samples`. |
| FR-12.06 | Mengklik skenario contoh harus mengisi nama, nomor, kanal, dan teks pesan ke dalam formulir secara otomatis serta menyiapkan ruang percakapan. |
| FR-12.07 | Lima skenario contoh tetap adalah: Ayam Dingin & Saus Tumpah (Kualitas Makanan, Tinggi), Sambal & Nasi Ketinggalan (Pesanan Kurang, Sedang), Pengiriman Driver Telat Lama (Pengiriman, Sedang), Pelayanan Staf Kasir Kurang Ramah (Pelayanan, Sedang), dan Tanya Paket Catering (Non-Komplain). |
| FR-12.08 | Halaman harus memuat riwayat pesan sebelumnya dari `GET /api/simulation/public/history?phone=` saat nomor diubah atau saat halaman dimuat. |
| FR-12.09 | Halaman harus terhubung ke stream SSE pelanggan melalui `GET /api/simulation/public/stream?phone=`. |
| FR-12.10 | Halaman harus menampilkan animasi pengetikan `Bro Chicken sedang mengetik...` saat menunggu balasan AI. |
| FR-12.11 | Halaman harus menampilkan pesan balasan admin yang diterima dari event SSE `admin_reply` secara real-time, lengkap dengan nama staf dan kode tiket bila ada. |
| FR-12.12 | Halaman harus menampilkan pesan membership yang diterima dari event SSE `member_message` secara real-time, lengkap dengan kode kupon bila ada. |
| FR-12.13 | Feed percakapan harus otomatis bergulir ke pesan terbawah setiap kali ada pesan baru. |
| FR-12.14 | Mengubah nomor telepon harus menutup koneksi SSE lama, mengosongkan layar, memuat riwayat nomor baru, dan membuka koneksi SSE baru. |

## 4. Kebutuhan Nonfungsional (Non-Functional Requirements)

### NFR-01 — Kinerja (Performance)

| ID | Ketentuan |
| --- | --- |
| NFR-01.01 | Seluruh query operasional pelanggan, tiket, membership, dan kotak masuk harus merespons dalam waktu di bawah 200 ms untuk data hingga 50.000 baris. |
| NFR-01.02 | SQLite dioperasikan dalam mode Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) dan foreign keys aktif (`PRAGMA foreign_keys = ON;`) untuk meningkatkan konkurensi pembacaan dan penulisan. |
| NFR-01.03 | Permintaan ke Gemini API dibatasi timeout maksimal 8.000 ms (8 detik). Jika melebihi batas, sistem harus beralih ke fallback rule-based NLP tanpa membuat transaksi pengguna gagal. |
| NFR-01.04 | Koneksi Server-Sent Events (SSE) mengirimkan detak jantung periodik setiap 25 detik dengan timer `unref()` agar koneksi HTTP tetap terbuka tanpa menahan proses Node keluar saat server dihentikan. |
| NFR-01.05 | Pagination dibatasi maksimal 100 rekaman per permintaan untuk menjaga ukuran payload JSON tetap ringan. |

### NFR-02 — Keamanan (Security)

| ID | Ketentuan |
| --- | --- |
| NFR-02.01 | Kata sandi pengguna disimpan menggunakan fungsi hash bcrypt dengan salt round 10 (`bcryptjs`). Kata sandi teks terang tidak boleh disimpan atau dicatat ke log. |
| NFR-02.02 | Cookie sesi `brochicken.sid` dikonfigurasi dengan flag `httpOnly: true`, `sameSite: 'lax'`, dan `secure: false` pada mode lokal (dapat diubah menjadi `true` pada lingkungan HTTPS produksi). |
| NFR-02.03 | Seluruh endpoint privat di bawah `/api/customers`, `/api/complaints`, `/api/dashboard`, `/api/reports`, `/api/templates`, `/api/simulation/rooms`, `/api/simulation/admin`, dan `/api/membership/admin` wajib melewati middleware `requireAuth`. |
| NFR-02.04 | Endpoint manajemen pengguna di bawah `/api/admin/users`, backup di `/api/settings/backup`, dan info sistem dilindungi middleware `requireOwner`. Akses oleh peran non-Owner ditolak dengan status HTTP 403 Forbidden. |
| NFR-02.05 | Pencegahan SQL Injection dijamin dengan penggunaan prepared statements (`prepare().run()` / `prepare().get()` / `prepare().all()`) dengan parameter binding terpisah pada seluruh operasi database. |
| NFR-02.06 | Nomor telepon pelanggan disamarkan pada ekspor CSV publik dengan menampilkan 5 digit awal + `****` + 3 digit akhir untuk menjaga privasi kontak. |

### NFR-03 — Keandalan dan Ketersediaan (Reliability & Availability)

| ID | Ketentuan |
| --- | --- |
| NFR-03.01 | Sistem menggunakan modul bawaan Node.js `node:sqlite` (`DatabaseSync`) tanpa dependensi binary C++ eksternal yang rentan terhadap kompilasi native. |
| NFR-03.02 | Layanan AI Triage harus tetap berfungsi 100% meskipun API key Gemini tidak ada, jaringan internet mati, atau kuota Google AI Studio habis, dengan mengalihkan pemrosesan secara mulus ke mesin rule-based NLP bawaan. |
| NFR-03.03 | Scheduler promo kupon tanggal tua bersifat idempoten: eksekusi berulang pada window promo yang sama tidak menghasilkan kupon duplikat karena adanya constraint unik `(customer_id, campaign_id)` pada database. |
| NFR-03.04 | Integritas referensial data ditegakkan melalui foreign key SQLite. Pelanggan yang memiliki relasi dengan tiket, membership, transaksi, kupon, atau pesan tidak dapat dihapus secara permanen dari database (hanya boleh diarsipkan). |

### NFR-04 — Keterpakaian dan Antarmuka (Usability & Interface)

| ID | Ketentuan |
| --- | --- |
| NFR-04.01 | Antarmuka pengguna dibangun menggunakan HTML, CSS modern (CSS custom properties, CSS Grid, Flexbox), dan Vanilla JavaScript tanpa framework berat. |
| NFR-04.02 | Tata letak CRM responsif untuk resolusi desktop (≥1024px) dan tablet (≥768px), dengan sidebar navigasi tetap dan area kerja terstruktur. |
| NFR-04.03 | Halaman publik `/simulasi` dan `/daftar-member` dirancang mobile-friendly untuk kenyamanan simulasi di layar ponsel pintar (360px–480px). |
| NFR-04.04 | Format penanggalan, jam, dan mata uang disajikan sesuai konvensi Indonesia (WIB, format Rupiah `Rp X.XXX`, dan tanggal lokal). |

---

## 5. Rancangan Database (Database Schema)

Sistem menggunakan database SQLite tunggal pada berkas `brochicken_crm.sqlite` yang dikelola secara deklaratif melalui berkas `src/db/database.js`. Skema terdiri dari 9 tabel dan 11 index.

### 5.1 Skema Tabel

#### 1. Tabel `users`
Menyimpan akun pengguna CRM internal (Owner dan Admin).

```sql
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN')),
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### 2. Tabel `customers`
Menyimpan data master pelanggan Bro Chicken dari berbagai kanal.

```sql
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL CHECK (source IN ('DIRECT', 'GOFOOD', 'GRABFOOD', 'OTHER')),
  joined_date TEXT NOT NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ARCHIVED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

#### 3. Tabel `complaints`
Menyimpan tiket keluhan pelanggan, kategori, prioritas, status penanganan, dan metrik SLA.

```sql
CREATE TABLE IF NOT EXISTS complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_code TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('FOOD_QUALITY', 'WRONG_ORDER', 'DELIVERY_DELAY', 'SERVICE', 'CLEANLINESS', 'OTHER')),
  description TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'RESOLVED')),
  assigned_to INTEGER,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  sla_due_at TEXT NOT NULL,
  first_response_at TEXT,
  resolved_at TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);
```

#### 4. Tabel `complaint_activities`
Menyimpan log audit setiap aktivitas penanganan tiket (pembuatan, perubahan status, perubahan PIC, penambahan catatan).

```sql
CREATE TABLE IF NOT EXISTS complaint_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  complaint_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('CREATED', 'STATUS_CHANGED', 'NOTE_ADDED', 'PIC_CHANGED')),
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### 5. Tabel `memberships`
Menyimpan data keanggotaan pelanggan pada program loyalitas & promo Bro Chicken.

```sql
CREATE TABLE IF NOT EXISTS memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_code TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL UNIQUE,
  joined_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  registered_via TEXT NOT NULL DEFAULT 'MANUAL',
  campaign_code TEXT,
  whatsapp_consent INTEGER NOT NULL DEFAULT 1 CHECK (whatsapp_consent IN (0,1)),
  last_transaction_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

#### 6. Tabel `member_transactions`
Menyimpan log interaksi/transaksi pembelian manual anggota untuk memperbarui tanggal aktivitas terakhir.

```sql
CREATE TABLE IF NOT EXISTS member_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  membership_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  transaction_date TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'DIRECT',
  notes TEXT,
  recorded_by INTEGER,
  created_at TEXT NOT NULL,
  FOREIGN KEY (membership_id) REFERENCES memberships(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (recorded_by) REFERENCES users(id)
);
```

#### 7. Tabel `member_coupons`
Menyimpan kupon diskon tanggal tua 10% yang diterbitkan untuk anggota.

```sql
CREATE TABLE IF NOT EXISTS member_coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_code TEXT NOT NULL UNIQUE,
  customer_id INTEGER NOT NULL,
  membership_id INTEGER NOT NULL,
  campaign_id TEXT NOT NULL,
  discount_percent INTEGER NOT NULL DEFAULT 10,
  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  status TEXT NOT NULL DEFAULT 'ISSUED' CHECK (status IN ('ISSUED', 'USED', 'EXPIRED')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (membership_id) REFERENCES memberships(id),
  UNIQUE (customer_id, campaign_id)
);
```

#### 8. Tabel `member_messages`
Menyimpan antrean (outbox) pesan otomatis program membership (welcome, promo QR, kupon tanggal tua).

```sql
CREATE TABLE IF NOT EXISTS member_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  membership_id INTEGER,
  message_type TEXT NOT NULL CHECK (message_type IN ('WELCOME', 'PROMO_QR', 'PROMO_END_MONTH', 'MANUAL')),
  recipient_phone TEXT NOT NULL,
  message_body TEXT NOT NULL,
  payload_json TEXT,
  status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'SENT', 'FAILED')),
  sent_at TEXT,
  provider TEXT NOT NULL DEFAULT 'SIMULATION',
  error_message TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (membership_id) REFERENCES memberships(id)
);
```

#### 9. Tabel `simulation_messages`
Menyimpan seluruh percakapan masuk dan keluar pada simulasi WhatsApp (chat pelanggan publik, balasan otomatis AI Triage, balasan admin CRM).

```sql
CREATE TABLE IF NOT EXISTS simulation_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL,
  complaint_id INTEGER,
  direction TEXT NOT NULL CHECK (direction IN ('IN', 'OUT')),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('CUSTOMER', 'AI', 'ADMIN')),
  sender_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  body TEXT NOT NULL,
  analysis_json TEXT,
  read_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (complaint_id) REFERENCES complaints(id)
);
```

### 5.2 Rancangan Index

Sistem menetapkan 11 index performa untuk mempercepat filter, sorting, pencarian, dan penegakan keunikan:

```sql
-- Index tiket dan aktivitas
CREATE INDEX IF NOT EXISTS idx_complaints_customer ON complaints(customer_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_assigned ON complaints(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activities_complaint ON complaint_activities(complaint_id);

-- Index membership dan promo
CREATE INDEX IF NOT EXISTS idx_memberships_customer ON memberships(customer_id);
CREATE INDEX IF NOT EXISTS idx_member_tx_membership ON member_transactions(membership_id);
CREATE INDEX IF NOT EXISTS idx_member_tx_customer ON member_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_member_coupons_customer ON member_coupons(customer_id);
CREATE INDEX IF NOT EXISTS idx_member_messages_customer ON member_messages(customer_id);

-- Index percakapan simulasi WhatsApp & AI Triage
CREATE INDEX IF NOT EXISTS idx_sim_messages_customer ON simulation_messages(customer_id, created_at);
CREATE INDEX IF NOT EXISTS idx_sim_messages_unread ON simulation_messages(customer_id, direction, read_at);
```

### 5.3 Konvensi Format ID Unik

| Entitas | Format Prefix | Rumus Penomoran | Contoh |
| --- | --- | --- | --- |
| Pelanggan | `CS` | `CS` + `DDMMYY` + `NNN` (3 digit urutan harian) | `CS091126001` |
| Tiket Keluhan | `TK` | `TK` + `DDMMYY` + `NNN` (3 digit urutan harian) | `TK091126001` |
| Membership | `MB` | `MB` + `DDMMYY` + `NNN` (3 digit urutan harian) | `MB091126001` |
| Kupon Tanggal Tua | `BC-TU-` | `BC-TU-` + `YYYYMM-` + `<customer_id:4>` | `BC-TU-202611-0007` |

---

## 6. Tahap Implementasi (Implementation Phases)

### 6.1 Ringkasan Tahapan

| Tahap | Fokus Utama | Luaran yang Dihasilkan |
| --- | --- | --- |
| **P11** | Fondasi Core CRM & Pelanggan | Setup project, skema SQLite (users, customers), modul auth RBAC (Owner/Admin), CRUD pelanggan, pencarian & filter data pelanggan. |
| **P12** | Ticketing Keluhan, SLA, & Laporan | Skema complaints & complaint_activities, workflow status 3-tahap, kalkulasi SLA 60 menit, 4 template WA statis, dashboard metrik, laporan & ekspor CSV, manajemen akun Admin & backup database. |
| **P13** | Membership & Promo Tanggal Tua | Skema memberships, member_transactions, member_coupons, member_messages, halaman publik `/daftar-member`, generator QR campaign, outbox pesan simulasi, katalog paket hemat, scheduler kupon tanggal tua 10%. |
| **P14** | WhatsApp Inbox, AI Triage, & Realtime | Skema simulation_messages, antarmuka kotak masuk WhatsApp admin (`#simulation`), integrasi Gemini API 3.5 Flash Lite + fallback NLP kata kunci, auto-create ticket keluhan, SSE broadcast (admin & customer), halaman publik `/simulasi` & `/chat-pelanggan`. |

---

## 7. Kriteria Penerimaan Sistem (Acceptance Criteria)

Sistem dinyatakan memenuhi spesifikasi apabila seluruh 24 kriteria penerimaan berikut diverifikasi dan lulus uji (melalui automated test suite atau verifikasi fungsional):

| No | Kriteria Penerimaan | Metode Verifikasi | Status |
| --- | --- | --- | --- |
| 1 | Akun Owner dan Admin bawaan tersedia di database dan dapat melakukan otentikasi dengan kata sandi yang valid. | Test Case / Login UI | LULUS |
| 2 | Pembatasan hak akses (RBAC) ditegakkan: endpoint akun admin dan pengaturan/backup hanya dapat diakses oleh role Owner. | Test Case / HTTP Status 403 | LULUS |
| 3 | Pengguna dengan peran Admin dapat menambah pelanggan baru dengan Customer ID unik otomatis (`CSDDMMYYNNN`) dan nomor telepon terstandardisasi awalan 62. | Test Case / Database | LULUS |
| 4 | Duplikasi nomor WhatsApp pelanggan ditolak oleh validasi sistem. | Test Case / HTTP Status 400 | LULUS |
| 5 | Admin dapat mencatat tiket keluhan baru terhubung ke pelanggan aktif, dengan kode `TKDDMMYYNNN` dan batas SLA otomatis 60 menit. | Test Case / Database | LULUS |
| 6 | Transisi status tiket mematuhi aturan: `NEW` -> `IN_PROGRESS` -> `RESOLVED`. Tiket tidak dapat melompat dari `NEW` langsung ke `RESOLVED` atau dibuka kembali setelah selesai. | Test Case / State Validation | LULUS |
| 7 | Waktu respons pertama (`first_response_at`) tercatat otomatis saat tiket berpindah dari `NEW` ke `IN_PROGRESS` dan tidak berubah setelahnya. | Test Case / Database | LULUS |
| 8 | Setiap perubahan tiket (pembuatan, pergantian PIC, perubahan status, penambahan catatan) tercatat lengkap di tabel riwayat aktivitas. | Test Case / Audit Log | LULUS |
| 9 | Perhitungan SLA menandai tiket secara tepat: `ON_TRACK` (>15 menit), `CRITICAL` (≤15 menit), `OVERDUE` (lewat batas waktu). | Test Case / Calculation | LULUS |
| 10 | Empat template WhatsApp statis dapat diakses dan placeholder `{nama}`, `{ticket_id}` terisi secara dinamis sesuai konteks. | Test Case / Rendering | LULUS |
| 11 | Dashboard menampilkan ringkasan metrik pelanggan, status tiket berjalan, tiket overdue, dan daftar tiket terbaru sesuai periode filter. | Test Case / Aggregation | LULUS |
| 12 | Haporan CRM menghitung total keluhan, distribusi kategori, rata-rata durasi respons pertama, dan persentase kepatuhan SLA. | Test Case / Report Engine | LULUS |
| 13 | Laporan dapat diekspor menjadi berkas CSV valid dengan format koma, penyamaran nomor kontak, dan encoding UTF-8 BOM. | Test Case / CSV Parser | LULUS |
| 14 | Akun Admin dapat dinonaktifkan oleh Owner, kecuali jika Admin tersebut masih ditugaskan sebagai PIC tiket aktif (`NEW`/`IN_PROGRESS`). | Test Case / Validation | LULUS |
| 15 | Registrasi member mandiri via `/daftar-member` menghasilkan kode `MBDDMMYYNNN`, outbox welcome message, dan katalog promo paket hemat. | Test Case / Public Endpoint | LULUS |
| 16 | Registrasi member yang menggunakan nomor telepon lama yang sudah terdaftar tidak membuat duplikat, melainkan memperbarui profil dan membership terkait. | Test Case / Idempotency | LULUS |
| 17 | Tiga campaign QR (`QR_OUTLET`, `QR_PACKAGING`, `QR_TABLE`) dapat di-generate dalam format gambar SVG dan PNG. | Test Case / Image Output | LULUS |
| 18 | Transaksi pembelian manual dapat dicatat ke membership dan memperbarui timestamp transaksi terakhir. | Test Case / Database | LULUS |
| 19 | Kupon tanggal tua 10% terbit otomatis untuk member dengan inaktivitas >14 hari pada window promo akhir bulan, maksimal 1 kupon per member per bulan. | Test Case / Scheduler Logic | LULUS |
| 20 | Kupon tanggal tua dapat ditandai `USED` oleh staf dan tidak dapat digunakan kembali setelah dipakai atau kedaluwarsa. | Test Case / Coupon Lifecycle | LULUS |
| 21 | Seluruh pesan percakapan simulasi pelanggan, AI, dan balasan admin tersimpan persisten di tabel `simulation_messages` dan tetap utuh saat halaman dimuat ulang. | Test Case / Persistence | LULUS |
| 22 | Kotak masuk WhatsApp admin menampilkan daftar ruang chat pelanggan, indikator pesan belum dibaca, panel riwayat percakapan, dan auto-read saat ruang dibuka. | Test Case / Inbox Flow | LULUS |
| 23 | Layanan AI Triage menganalisis pesan pelanggan, mendeteksi keluhan secara akurat via Gemini atau fallback rule-based NLP, dan membuat tiket CRM otomatis dengan PIC Admin aktif. | Test Case / Triage Service | LULUS |
| 24 | Balasan admin dari kotak masuk CRM terkirim secara instan ke tab browser pelanggan aktif melalui Server-Sent Events (SSE) dan memperbarui status tiket `NEW` menjadi `IN_PROGRESS`. | Test Case / Real-Time SSE | LULUS |

---

## 8. Batasan Sistem (System Boundaries & Limitations)

1. **Bukan Sistem Kasir/POS**: Sistem tidak mengelola transaksi kasir, pembayaran tunai/kartu/QRIS, pembukuan penjualan, maupun persediaan/stok bahan baku ayam.
2. **Pengiriman WhatsApp Berbasis Simulasi & Web Link**: Sistem tidak terhubung langsung ke WhatsApp Cloud Business API resmi berbayar. Notifikasi CRM menggunakan tautan `https://wa.me/` langsung, sedangkan pesan otomatis dan interaksi AI beroperasi dalam lingkungan simulasi persisten (browser UI + outbox + SSE).
3. **Penyimpanan Lokal SQLite**: Database menggunakan file tunggal `brochicken_crm.sqlite` pada disk server lokal. Replikasi terdistribusi multi-server tidak didukung dalam lingkup sistem ini.
4. **Target SLA Konstan**: Target waktu respons pertama ditetapkan kaku 60 menit kalender sejak tiket dibuat, tanpa kalender jam kerja atau hari libur operasional.
5. **AI Model & Fallback**: AI Triage mengutamakan model `gemini-3.5-flash-lite`. Namun, jika kuota API habis atau koneksi terputus, sistem secara transparan menggunakan fallback mesin rule-based NLP berbasis 38+ kata kunci tanpa menimbulkan galat pada pengguna.

---

## 9. Ketentuan Teknis dan Operasional

1. **Format Identitas Sistem**:
   - Customer Code: `CS` + `DDMMYY` + `NNN` (contoh: `CS091126001`)
   - Ticket Code: `TK` + `DDMMYY` + `NNN` (contoh: `TK091126001`)
   - Member Code: `MB` + `DDMMYY` + `NNN` (contoh: `MB091126001`)
   - Coupon Code: `BC-TU-YYYYMM-NNNN` (contoh: `BC-TU-202611-0007`)
2. **Normalisasi Kontak**: Semua nomor telepon diawali dengan format standar internasional Indonesia (`62xxxxxxxxxx`). Karakter selain angka dieliminasi otomatis.
3. **Pembersihan Log & Integritas Data**: Pengarsipan pelanggan menggunakan soft-delete (`status = 'ARCHIVED'`). Foreign key cascade hanya diterapkan pada tabel riwayat aktivitas tiket (`complaint_activities`), sedangkan relasi pelanggan dilindungi dari penghapusan fisik.
4. **Audit Trail**: Setiap perubahan status tiket atau catatan admin wajib mencantumkan ID pengguna yang melakukan aksi beserta waktu presisi ISO 8601 UTC.

---

## 10. Penutup

Dokumen Spesifikasi Kebutuhan Sistem (SRS) Versi 2.1 ini merupakan dokumen acuan resmi menyeluruh yang mencerminkan secara utuh dan tepat kondisi implementasi aplikasi CRM Bro Chicken saat ini. Dokumen ini mengikat seluruh pengujian penerimaan, tinjauan arsitektur, dan pemeliharaan kode sumber ke depan.

