# SOFTWARE REQUIREMENTS SPECIFICATION (SRS)

# CRM BRO CHICKEN

| Informasi | Ketetapan |
| --- | --- |
| Nama Sistem | Bro Chicken Customer Relationship Management (CRM) |
| Jenis Sistem | Website CRM internal |
| Versi Dokumen | 2.0 |
| Status | Baseline kebutuhan sistem yang ditetapkan |
| Studi Kasus | Bro Chicken |
| Tahap Pengembangan | P11–P13 |
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js dan Express.js |
| Database | SQLite |
| Pengguna | Owner, Admin, dan Member publik tanpa login |

## Riwayat Revisi

| Versi | Perubahan |
| --- | --- |
| 1.0 | Rancangan awal kebutuhan CRM Bro Chicken. |
| 1.1 | Menghapus tabel database message_templates; template WhatsApp ditetapkan sebagai konfigurasi statis aplikasi. |
| 1.2 | Menetapkan scope, fitur, hak akses, alur status, SLA, struktur data, dan pembagian P11–P12 secara final. Menghapus fitur loyalitas dan promosi dari scope sistem. |
| 2.0 | Menambahkan Membership & Promo: registrasi mandiri melalui QR campaign, welcome message dan katalog paket hemat, log transaksi manual tanpa POS, serta kupon tanggal tua 10% yang berlaku 7 hari. Pengiriman WhatsApp ditetapkan sebagai simulasi dengan outbox dan SSE. Menambahkan FR-09, empat tabel membership, tahap P13, dan lima kriteria penerimaan baru. |

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

Dokumen Software Requirements Specification (SRS) ini menetapkan kebutuhan fungsional, kebutuhan nonfungsional, hak akses, rancangan data, batasan, dan kriteria penerimaan CRM Bro Chicken. Dokumen ini menjadi acuan tetap untuk desain UI/UX, implementasi, dan pengujian sistem.

### 1.2 Tujuan Sistem

CRM Bro Chicken adalah aplikasi website internal untuk mengelola data pelanggan dan interaksi layanan pelanggan secara terpusat. Sistem digunakan untuk menjaga data pelanggan, mencatat keluhan, memastikan setiap keluhan memiliki penanggung jawab, memantau target waktu respons, dan menyiapkan komunikasi pelanggan melalui WhatsApp.

Tujuan sistem:

Memusatkan data pelanggan dalam satu database.

Menyediakan pencarian dan pengelolaan data pelanggan.

Mencatat seluruh keluhan pelanggan sebagai tiket yang dapat dilacak.

Menetapkan Admin sebagai penanggung jawab setiap tiket.

Memantau target respons keluhan maksimal 60 menit.

Menstandarkan pesan layanan pelanggan melalui template WhatsApp bawaan.

Menyediakan dashboard dan laporan untuk memantau kinerja layanan pelanggan.

Menyelenggarakan membership terintegrasi dengan registrasi publik, katalog paket hemat, dan kupon tanggal tua.

Mengirim pesan membership melalui simulasi WhatsApp yang tersimpan pada outbox dan tampil real-time pada halaman yang terbuka.

### 1.3 Ruang Lingkup yang Ditetapkan

Sistem memiliki sepuluh area fungsi berikut:

Login dan pembatasan hak akses Owner/Admin.

Dashboard CRM.

Pengelolaan data pelanggan.

Pengelolaan tiket keluhan.

Pemantauan SLA keluhan.

Template komunikasi WhatsApp bawaan.

Laporan CRM dan ekspor CSV.

Manajemen akun Admin oleh Owner.

Pengaturan akun pribadi dan pencadangan database.

Membership, QR campaign, katalog paket hemat, log transaksi manual, dan kupon tanggal tua.

Sistem bukan aplikasi Point of Sale (POS). Sistem tidak mencatat pembayaran, penjualan, stok, atau transaksi pesanan secara lengkap. Log transaksi member hanya mencatat tanggal, kanal, dan catatan aktivitas untuk menentukan member pasif. Tidak ada nominal harga, pembayaran, atau pengurangan stok di dalam log tersebut.

### 1.4 Istilah dan Definisi

| Istilah | Definisi |
| --- | --- |
| CRM | Customer Relationship Management, yaitu sistem untuk mengelola hubungan dan interaksi dengan pelanggan. |
| Owner | Pemilik Bro Chicken yang memantau data CRM dan mengelola akun Admin. |
| Admin | Pengguna yang menjalankan operasional data pelanggan dan penanganan keluhan. |
| Customer ID | Kode unik untuk setiap pelanggan. |
| Ticket | Catatan keluhan pelanggan yang harus ditindaklanjuti. |
| PIC | Person in Charge atau Admin yang bertanggung jawab atas tiket. |
| SLA | Service Level Agreement, yaitu target waktu respons keluhan. |
| Data simulasi | Data fiktif yang digunakan untuk pengembangan dan pengujian. |
| Member | Pelanggan yang terdaftar pada program membership dan memiliki kode member. |
| Membership | Keanggotaan aktif seorang pelanggan pada program promo Bro Chicken. |
| QR Campaign | Kode kampanye pada QR pendaftaran: QR_OUTLET, QR_PACKAGING, atau QR_TABLE. |
| Katalog paket hemat | Daftar paket makanan beserta harga normal dan harga promo yang ditampilkan kepada member. |
| Kupon tanggal tua | Kupon diskon 10% yang diterbitkan pada tiga hari terakhir bulan untuk member yang tidak bertransaksi lebih dari 14 hari. |
| Consent | Persetujuan member untuk menerima pesan WhatsApp promotional. |
| Outbox | Tabel penyimpan pesan simulasi WhatsApp beserta status QUEUED, SENT, atau FAILED. |
| SSE | Server-Sent Events, mekanisme satu arah untuk mendorong pesan dari server ke browser yang terbuka. |

## 2. Pengguna dan Hak Akses

Sistem hanya memiliki dua role login CRM: Owner dan Admin. Tidak ada role Kasir atau Supervisor. Member bukan role login CRM; member adalah pelanggan publik yang dapat mendaftar tanpa akun dan tanpa sesi login.

### 2.1 Owner

Owner adalah pemilik bisnis dan memiliki hak akses untuk:

Melihat dashboard, seluruh data pelanggan, seluruh tiket, SLA, dan laporan CRM.

Melihat template WhatsApp bawaan.

Membuat akun Admin.

Mengubah nama, username, dan status akun Admin.

Mengatur ulang password Admin.

Mengubah password akun Owner.

Mengunduh backup database.

Owner memiliki akses baca untuk data pelanggan dan tiket operasional. Owner tidak menjadi PIC tiket.

### 2.2 Admin

Admin adalah pelaksana operasional CRM dan memiliki hak akses untuk:

Melihat dashboard.

Menambah, melihat, mengubah, dan mengarsipkan data pelanggan.

Membuat, melihat, dan mengelola tiket keluhan.

Menetapkan atau mengganti PIC dari daftar Admin aktif.

Mengubah status tiket, menambahkan catatan tindak lanjut, dan memantau SLA.

Menggunakan template WhatsApp bawaan.

Melihat laporan CRM.

Mengelola data member, mencatat transaksi manual, menerbitkan QR campaign, dan menandai kupon sudah dipakai.

Mengubah password akun sendiri.

Admin tidak dapat membuat akun, mengubah role pengguna, menonaktifkan akun pengguna lain, mengubah konfigurasi sistem, atau mengunduh backup database.

### 2.3 Member Publik

Member publik bukan pengguna CRM dan tidak memiliki sesi login. Member dapat:

Membuka halaman `/daftar-member` dari QR campaign.

Mendaftar dengan nama, nomor WhatsApp, dan consent.

Melihat welcome message, katalog paket hemat, dan kupon pada layar hasil pendaftaran atau halaman simulasi WhatsApp.

Member tidak dapat membuka dashboard, data pelanggan lain, tiket, laporan, atau endpoint admin.

### 2.4 Matriks Hak Akses

| Modul/Fungsi | Owner | Admin | Member publik |
| --- | --- | --- | --- |
| Dashboard | Lihat | Lihat | Tidak memiliki akses |
| Data pelanggan | Lihat | Tambah, lihat, ubah, arsipkan | Tidak memiliki akses |
| Tiket keluhan | Lihat seluruh tiket | Buat dan kelola | Tidak memiliki akses |
| Penetapan PIC | Lihat | Tetapkan dan ubah PIC | Tidak memiliki akses |
| SLA | Lihat | Lihat dan tindak lanjuti | Tidak memiliki akses |
| Template WhatsApp | Lihat | Gunakan | Tidak memiliki akses |
| Laporan CRM | Lihat dan ekspor | Lihat dan ekspor | Tidak memiliki akses |
| Membership & Promo | Lihat dan kelola | Kelola | Daftar dan lihat pesan sendiri |
| Manajemen akun Admin | Kelola | Tidak memiliki akses | Tidak memiliki akses |
| Password akun sendiri | Ubah | Ubah | Tidak memiliki akun |
| Backup database | Unduh | Tidak memiliki akses | Tidak memiliki akses |

Seluruh pembatasan hak akses wajib diperiksa di backend. Menyembunyikan tombol pada frontend tidak cukup sebagai pengamanan.

## 3. Kebutuhan Fungsional (Functional Requirements)

Seluruh requirement pada bagian ini termasuk dalam scope sistem dan wajib diimplementasikan sesuai tahap P11, P12, atau P13.

### FR-01 — Login dan Sesi Pengguna

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-01.01 | Sistem harus menyediakan halaman login dengan field username dan password. |
| FR-01.02 | Sistem harus memvalidasi username, password, dan status aktif akun sebelum membuat sesi login. |
| FR-01.03 | Sistem harus menolak login dengan kredensial salah atau akun nonaktif. |
| FR-01.04 | Sistem harus menyediakan fungsi logout yang mengakhiri sesi pengguna. |
| FR-01.05 | Sistem harus menampilkan nama dan role pengguna yang sedang login. |
| FR-01.06 | Sistem harus mengarahkan Owner dan Admin ke Dashboard setelah login berhasil. |
| FR-01.07 | Sistem harus menerapkan hak akses berdasarkan role Owner atau Admin pada setiap endpoint yang dilindungi. |
| FR-01.08 | Sistem tidak menyediakan pendaftaran akun mandiri. Akun Admin dibuat oleh Owner. |

### FR-02 — Dashboard

Dashboard menjadi halaman utama setelah login. Filter awal Dashboard adalah bulan berjalan.

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-02.01 | Sistem harus menampilkan jumlah seluruh pelanggan berstatus Aktif. |
| FR-02.02 | Sistem harus menampilkan jumlah pelanggan baru pada periode filter. |
| FR-02.03 | Sistem harus menampilkan jumlah tiket berstatus Baru, Diproses, dan Selesai. |
| FR-02.04 | Sistem harus menampilkan jumlah tiket yang belum mendapat respons pertama dan telah melewati SLA. |
| FR-02.05 | Sistem harus menampilkan lima tiket terbaru beserta ID tiket, pelanggan, kategori, status, PIC, dan status SLA. |
| FR-02.06 | Sistem harus menyediakan filter periode: Hari Ini, 7 Hari Terakhir, 30 Hari Terakhir, Bulan Ini, dan Rentang Tanggal. |
| FR-02.07 | Sistem harus memperbarui seluruh angka dan daftar berdasarkan data database sesuai periode yang dipilih. |
| FR-02.08 | Sistem harus menyediakan tautan dari kartu ringkasan ke daftar pelanggan atau tiket yang sesuai. |

### FR-03 — Pengelolaan Data Pelanggan

#### 3.1 Daftar dan Pencarian

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-03.01 | Sistem harus menampilkan daftar pelanggan dalam tabel dengan kolom Customer ID, nama, nomor WhatsApp, sumber, tanggal bergabung, dan status. |
| FR-03.02 | Sistem harus menyediakan pencarian berdasarkan nama, Customer ID, atau nomor WhatsApp. |
| FR-03.03 | Sistem harus menyediakan filter berdasarkan sumber pelanggan dan status Aktif/Diarsipkan. |
| FR-03.04 | Sistem harus menyediakan pengurutan berdasarkan nama dan tanggal bergabung. |
| FR-03.05 | Sistem harus menyediakan halaman detail pelanggan. |
| FR-03.06 | Halaman detail pelanggan harus menampilkan profil dan seluruh tiket keluhan yang terhubung dengan pelanggan tersebut. |

#### 3.2 Penambahan dan Pengubahan

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-03.07 | Sistem harus menyediakan formulir tambah pelanggan untuk Admin. |
| FR-03.08 | Sistem harus menghasilkan Customer ID unik secara otomatis dengan format CUS-YYYY-NNNN. |
| FR-03.09 | Sistem harus mewajibkan nama, nomor WhatsApp, dan sumber pelanggan. |
| FR-03.10 | Sistem harus menyediakan sumber pelanggan tetap: Langsung, GoFood, GrabFood, dan Lainnya. |
| FR-03.11 | Sistem harus menyimpan nomor WhatsApp dalam format nomor Indonesia yang dinormalisasi dengan awalan 62. |
| FR-03.12 | Sistem harus menolak nomor WhatsApp yang tidak valid atau sudah digunakan pelanggan lain. |
| FR-03.13 | Sistem harus mengisi tanggal bergabung, waktu pembuatan, dan waktu pembaruan secara otomatis. |
| FR-03.14 | Sistem harus menyediakan field catatan dengan nilai awal kosong. |
| FR-03.15 | Sistem harus memungkinkan Admin mengubah nama, nomor WhatsApp, sumber, dan catatan pelanggan. |
| FR-03.16 | Sistem harus menampilkan notifikasi berhasil atau pesan validasi ketika data disimpan. |

#### 3.3 Pengarsipan Pelanggan

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-03.17 | Sistem harus menyediakan aksi Arsipkan untuk menonaktifkan pelanggan dari daftar aktif. |
| FR-03.18 | Sistem tidak boleh menghapus permanen data pelanggan yang sudah memiliki tiket keluhan. |
| FR-03.19 | Sistem harus mempertahankan seluruh tiket dan riwayat aktivitas saat pelanggan diarsipkan. |
| FR-03.20 | Sistem harus menyediakan aksi Aktifkan Kembali untuk mengubah pelanggan Diarsipkan menjadi Aktif. |

### FR-04 — Pengelolaan Keluhan dan Ticketing

#### 4.1 Pembuatan Tiket

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-04.01 | Sistem harus menyediakan formulir pembuatan tiket keluhan untuk Admin. |
| FR-04.02 | Setiap tiket harus terhubung dengan satu pelanggan yang sudah terdaftar. |
| FR-04.03 | Sistem harus menghasilkan Ticket ID unik dengan format TCK-YYYY-NNNN. |
| FR-04.04 | Sistem harus mewajibkan pelanggan, kategori, deskripsi, dan prioritas keluhan. |
| FR-04.05 | Sistem harus menyediakan kategori tetap: Kualitas Makanan, Pesanan Tidak Sesuai, Keterlambatan Pengiriman, Pelayanan, Kebersihan, dan Lainnya. |
| FR-04.06 | Sistem harus menyediakan prioritas tetap: Rendah, Sedang, dan Tinggi. |
| FR-04.07 | Sistem harus mengisi status awal Baru, waktu pembuatan, dan batas SLA secara otomatis. |
| FR-04.08 | Sistem harus menetapkan Admin pembuat sebagai PIC awal tiket. |
| FR-04.09 | Keluhan pelanggan yang belum terdaftar harus didahului dengan pendaftaran pelanggan. |

#### 4.2 Daftar dan Pengelolaan Tiket

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-04.10 | Sistem harus menampilkan daftar tiket dengan Ticket ID, pelanggan, kategori, prioritas, status, PIC, waktu dibuat, dan status SLA. |
| FR-04.11 | Sistem harus menyediakan pencarian berdasarkan Ticket ID, nama pelanggan, atau nomor WhatsApp. |
| FR-04.12 | Sistem harus menyediakan filter status, kategori, prioritas, PIC, dan status SLA. |
| FR-04.13 | Sistem harus menyediakan halaman detail tiket. |
| FR-04.14 | Sistem harus menampilkan profil pelanggan, deskripsi keluhan, prioritas, PIC, status, waktu SLA, dan riwayat aktivitas pada detail tiket. |
| FR-04.15 | Sistem harus memungkinkan Admin mengganti PIC ke Admin lain yang berstatus Aktif. |
| FR-04.16 | Sistem harus mencatat setiap perubahan PIC ke riwayat aktivitas tiket. |
| FR-04.17 | Sistem harus memungkinkan Admin menambahkan catatan tindak lanjut pada tiket. |
| FR-04.18 | Sistem harus mencatat pembuat dan waktu setiap aktivitas tiket. |

#### 4.3 Status Tiket

Status tiket hanya memiliki tiga nilai: Baru, Diproses, dan Selesai.

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-04.19 | Tiket baru harus memiliki status Baru. |
| FR-04.20 | Admin harus mengubah status dari Baru menjadi Diproses ketika penanganan pertama dimulai. |
| FR-04.21 | Sistem harus mengisi first_response_at pada perubahan pertama dari Baru menjadi Diproses dan tidak mengubah timestamp tersebut setelahnya. |
| FR-04.22 | Admin harus mengubah status dari Diproses menjadi Selesai setelah keluhan ditangani. |
| FR-04.23 | Sistem harus mengisi resolved_at ketika status berubah menjadi Selesai. |
| FR-04.24 | Sistem tidak mengizinkan tiket berpindah langsung dari Baru menjadi Selesai. |
| FR-04.25 | Sistem tidak mengizinkan tiket Selesai dibuka kembali. Keluhan baru setelah tiket selesai harus dicatat sebagai tiket baru. |

### FR-05 — Pemantauan SLA

Target SLA ditetapkan 60 menit kalender sejak tiket dibuat. Perhitungan berjalan terus, termasuk di luar jam operasional. Nilai SLA sama untuk seluruh kategori dan prioritas keluhan.

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-05.01 | Sistem harus menetapkan sla_due_at sebesar created_at + 60 menit. |
| FR-05.02 | Sistem harus menampilkan sisa waktu respons selama tiket belum memiliki respons pertama dan batas SLA belum tercapai. |
| FR-05.03 | Sistem harus menandai tiket Terlambat ketika waktu sekarang melewati sla_due_at dan first_response_at masih kosong. |
| FR-05.04 | Sistem harus menandai respons Tepat Waktu apabila first_response_at tidak melewati sla_due_at. |
| FR-05.05 | Sistem harus menandai respons Terlambat apabila first_response_at melewati sla_due_at. |
| FR-05.06 | Sistem harus menampilkan status SLA pada daftar tiket, detail tiket, dan Dashboard. |
| FR-05.07 | Sistem harus menghitung durasi respons dari created_at sampai first_response_at. |

### FR-06 — Template Komunikasi WhatsApp

Template WhatsApp bersifat statis dan disimpan sebagai konfigurasi aplikasi, bukan sebagai tabel database. Sistem menyediakan empat template tetap:

Sambutan pelanggan baru.

Konfirmasi penerimaan keluhan.

Informasi penyelesaian keluhan.

Permintaan ulasan pelanggan.

Sistem juga menghasilkan tiga pesan membership otomatis: welcome message berisi katalog paket hemat, promo QR campaign, dan kupon tanggal tua. Pesan otomatis tersebut disimpan pada outbox `member_messages`, bukan sebagai template statis.

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-06.01 | Sistem harus menampilkan empat template WhatsApp bawaan tersebut. |
| FR-06.02 | Admin harus dapat memilih pelanggan dari database sebelum menyiapkan pesan. |
| FR-06.03 | Sistem harus mengisi placeholder nama pelanggan, nama bisnis, dan Ticket ID untuk template yang berkaitan dengan keluhan. |
| FR-06.04 | Sistem harus menampilkan pratinjau pesan sebelum digunakan. |
| FR-06.05 | Admin harus dapat mengubah teks pada pratinjau untuk satu kali pengiriman tanpa mengubah template bawaan. |
| FR-06.06 | Sistem harus menyediakan tombol Salin Pesan. |
| FR-06.07 | Sistem harus menyediakan tombol Buka WhatsApp yang membuka percakapan dengan nomor pelanggan dan teks pesan yang telah disiapkan. |
| FR-06.08 | Sistem harus menampilkan keterangan bahwa pengiriman dilakukan oleh Admin melalui WhatsApp dan tidak dikonfirmasi oleh CRM. |
| FR-06.09 | Sistem harus menyediakan welcome message otomatis berisi katalog paket hemat untuk member baru. |
| FR-06.10 | Sistem harus menyediakan pesan promo QR yang berisi harga khusus paket hemat sesuai campaign. |
| FR-06.11 | Sistem harus menyediakan pesan kupon tanggal tua yang memuat kode kupon dan tanggal berlaku. |
| FR-06.12 | Sistem harus mengirim seluruh pesan membership melalui provider SIMULATION dan mencatat status pengiriman pada outbox. |

### FR-07 — Laporan CRM

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-07.01 | Sistem harus menyediakan halaman Laporan CRM untuk Owner dan Admin. |
| FR-07.02 | Sistem harus menyediakan filter periode Hari Ini, 7 Hari Terakhir, 30 Hari Terakhir, Bulan Ini, dan Rentang Tanggal. |
| FR-07.03 | Sistem harus menampilkan jumlah pelanggan baru dalam periode laporan. |
| FR-07.04 | Sistem harus menampilkan jumlah tiket berdasarkan kategori dan status. |
| FR-07.05 | Sistem harus menampilkan rata-rata waktu respons pertama untuk tiket yang sudah mendapatkan respons. |
| FR-07.06 | Sistem harus menampilkan jumlah dan persentase respons yang memenuhi SLA. Persentase dihitung dari jumlah tiket yang direspons dalam 60 menit dibagi seluruh tiket yang sudah memiliki respons pertama. |
| FR-07.07 | Sistem harus menampilkan jumlah tiket yang melewati SLA. |
| FR-07.08 | Sistem harus menyediakan ekspor laporan sesuai periode ke file CSV. |

### FR-08 — Manajemen Akun dan Pengaturan

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-08.01 | Sistem harus menyediakan satu akun Owner awal yang dibuat saat instalasi. |
| FR-08.02 | Sistem harus menyediakan halaman manajemen akun Admin yang hanya dapat diakses Owner. |
| FR-08.03 | Owner harus dapat membuat akun Admin dengan nama, username, dan password awal. |
| FR-08.04 | Sistem harus menolak username yang sudah digunakan. |
| FR-08.05 | Owner harus dapat mengubah nama dan username Admin. |
| FR-08.06 | Owner harus dapat mengatur ulang password Admin. |
| FR-08.07 | Owner harus dapat menonaktifkan dan mengaktifkan kembali akun Admin. |
| FR-08.08 | Sistem harus menolak login akun Admin yang nonaktif. |
| FR-08.09 | Sistem harus melarang penghapusan atau penonaktifan satu-satunya akun Owner. |
| FR-08.10 | Owner dan Admin harus dapat mengubah password akun sendiri dengan memasukkan password saat ini. |
| FR-08.11 | Owner harus dapat mengunduh salinan file database SQLite melalui halaman Pengaturan. |
| FR-08.12 | Sistem harus menggunakan target SLA tetap 60 menit dan tidak menyediakan pengaturan perubahan target SLA. |
| FR-08.13 | Sistem harus menolak penonaktifan Admin yang masih menjadi PIC tiket berstatus Baru atau Diproses sampai seluruh tiket tersebut dipindahkan ke Admin aktif lain. |

### FR-09 — Membership, QR Promo, dan Kupon Tanggal Tua

Membership terintegrasi dengan data pelanggan. Nomor WhatsApp tetap menjadi identitas unik pelanggan. Satu pelanggan hanya memiliki satu membership. Registrasi ulang dengan nomor yang sama tidak membuat pelanggan atau membership baru; nama terbaru menimpa nama lama.

#### 9.1 Registrasi Member

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-09.01 | Sistem harus menyediakan halaman publik `/daftar-member` yang dapat diakses tanpa login. |
| FR-09.02 | Halaman registrasi harus menerima parameter campaign QR dan menolak campaign yang tidak terdaftar. |
| FR-09.03 | Formulir registrasi harus mewajibkan nama minimal dua karakter, nomor WhatsApp valid, dan consent WhatsApp promotional. |
| FR-09.04 | Sistem harus menormalisasi nomor WhatsApp ke format awalan 62 dan memakai nomor tersebut sebagai identitas unik pelanggan. |
| FR-09.05 | Registrasi dengan nomor yang sudah ada harus memakai pelanggan lama dan memperbarui nama dengan nama terbaru. |
| FR-09.06 | Sistem harus menolak registrasi untuk pelanggan yang berstatus ARCHIVED. |
| FR-09.07 | Sistem harus membuat membership dengan kode unik berformat MBR-YYYY-NNNN dan status ACTIVE. |
| FR-09.08 | Sistem harus mencatat waktu bergabung, consent, dan sumber registrasi berupa QR_OUTLET, QR_PACKAGING, QR_TABLE, MANUAL, atau SIMULATION. |

#### 9.2 Welcome Message dan Katalog

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-09.09 | Sistem harus mengirim welcome message otomatis setelah membership baru dibuat. |
| FR-09.10 | Welcome message harus memuat nama member, kode member, dan katalog paket hemat. |
| FR-09.11 | Katalog harus memuat minimal tiga paket beserta komponen dan harga normal. |
| FR-09.12 | Welcome message hanya boleh dikirim sekali per membership; registrasi ulang tidak mengirim welcome baru. |
| FR-09.13 | Halaman hasil registrasi harus menampilkan welcome message dan katalog yang sama dengan isi outbox. |

#### 9.3 QR Campaign dan Promo

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-09.14 | Sistem harus menyediakan tiga campaign QR tetap: QR_OUTLET, QR_PACKAGING, dan QR_TABLE. |
| FR-09.15 | Setiap campaign harus memiliki label, deskripsi, dan persentase promo. |
| FR-09.16 | Sistem harus menghasilkan gambar QR yang mengarah ke `/daftar-member?campaign=<kode>`. |
| FR-09.17 | Admin harus dapat melihat pratinjau dan mengunduh QR campaign dalam format PNG. |
| FR-09.18 | Sistem harus mengirim pesan promo QR setelah registrasi yang berasal dari campaign valid. |
| FR-09.19 | Pesan promo QR hanya boleh dikirim sekali per member per campaign. |

#### 9.4 Log Transaksi Manual

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-09.20 | Admin harus dapat mencatat transaksi member dari halaman detail member. |
| FR-09.21 | Log transaksi hanya memuat tanggal, kanal, catatan, dan Admin pencatat; tidak memuat nominal, pembayaran, atau stok. |
| FR-09.22 | Tanggal transaksi tidak boleh melebihi waktu sekarang. |
| FR-09.23 | Sistem harus memperbarui `last_transaction_at` membership dengan tanggal transaksi terbaru. |
| FR-09.24 | Detail member harus menampilkan riwayat transaksi, pesan, dan kupon. |

#### 9.5 Kupon Tanggal Tua

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-09.25 | Sistem harus menyediakan scheduler yang memeriksa window tiga hari terakhir setiap bulan. |
| FR-09.26 | Member aktif yang memenuhi `COALESCE(last_transaction_at, joined_at) <= sekarang - 14 hari` harus menerima kupon diskon 10%. |
| FR-09.27 | Kupon harus memiliki kode unik dengan format BC-TU-YYYYMM-<customerId> dan berlaku 7 hari sejak diterbitkan. |
| FR-09.28 | Sistem harus membatasi maksimal satu kupon per member per bulan. |
| FR-09.29 | Proses penerbitan kupon harus idempoten; menjalankan scheduler berkali-kali tidak boleh membuat kupon ganda. |
| FR-09.30 | Admin harus dapat menjalankan promo tanggal tua secara manual untuk keperluan demo. |
| FR-09.31 | Admin harus dapat menandai kupon sebagai USED; kupon yang sudah USED atau EXPIRED tidak boleh dipakai ulang. |

#### 9.6 Outbox dan Realtime

| ID | Kebutuhan Fungsional |
| --- | --- |
| FR-09.32 | Semua pesan membership harus disimpan pada `member_messages` dengan status QUEUED, SENT, atau FAILED dan provider SIMULATION. |
| FR-09.33 | Jika halaman simulasi pelanggan terbuka, pesan membership harus didorong melalui event SSE `member_message`. |
| FR-09.34 | Halaman `/simulasi` harus menerima parameter `phone` dan `name` untuk langsung terhubung ke nomor member. |
| FR-09.35 | Admin harus menerima event SSE untuk member baru, pesan terkirim, kupon dipakai, dan promo dijalankan. |
| FR-09.36 | Sistem harus menampilkan statistik total member, member baru bulan ini, member pasif lebih dari 14 hari, serta kupon terbit dan terpakai. |

## 4. Kebutuhan Nonfungsional (Non-Functional Requirements)

| ID | Kategori | Ketentuan |
| --- | --- | --- |
| NFR-01 | Usability | Antarmuka menggunakan bahasa Indonesia dan navigasi yang sama pada seluruh halaman. |
| NFR-02 | Usability | Formulir wajib menampilkan label, validasi, dan pesan kesalahan yang menjelaskan tindakan perbaikan. |
| NFR-03 | Performance | Pada dataset pengujian 1.000 pelanggan dan 500 tiket di lingkungan lokal, halaman daftar pelanggan dan tiket harus menampilkan hasil dalam waktu maksimal 3 detik. |
| NFR-04 | Security | Password harus disimpan sebagai hash menggunakan bcrypt dan tidak boleh disimpan sebagai teks biasa. |
| NFR-05 | Security | Sesi login harus menggunakan cookie HttpOnly dan SameSite. Cookie Secure harus aktif saat aplikasi berjalan melalui HTTPS. |
| NFR-06 | Security | Backend harus memeriksa sesi dan role pada setiap endpoint yang memerlukan autentikasi. |
| NFR-07 | Security | Seluruh input dari pengguna harus divalidasi di backend dan query database harus menggunakan parameter binding. |
| NFR-08 | Privacy | Nomor WhatsApp pelanggan hanya ditampilkan kepada pengguna yang telah login. Nomor pada screenshot dan laporan akademik harus disamarkan. |
| NFR-09 | Reliability | Data yang telah berhasil disimpan harus tetap tersedia setelah halaman dimuat ulang dan server dijalankan kembali. |
| NFR-10 | Compatibility | Aplikasi harus dapat digunakan pada browser desktop Google Chrome dan Microsoft Edge versi stabil. |
| NFR-11 | Maintainability | Kode frontend, backend, dan akses database harus dipisahkan ke dalam modul yang terstruktur. |
| NFR-12 | Backup | Owner harus dapat mengunduh backup database SQLite dari halaman Pengaturan. |
| NFR-13 | Data Integrity | Customer ID dan Ticket ID harus unik; nomor WhatsApp pelanggan harus unik; seluruh foreign key harus divalidasi. |
| NFR-14 | Idempotency | Penerbitan kupon dan pengiriman welcome/promo QR harus idempoten; pengulangan proses tidak boleh membuat data ganda. |
| NFR-15 | Consent | Pesan promotional hanya boleh dibuat untuk member yang telah memberikan consent. |
| NFR-16 | Delivery Log | Setiap pesan simulasi WhatsApp harus tercatat pada outbox dengan status dan provider SIMULATION. |
| NFR-17 | Reliability | Scheduler promo harus berjalan tanpa menahan proses Node tetap hidup saat pengujian dan harus aman dijalankan berulang. |
| NFR-18 | Security | Endpoint registrasi publik hanya boleh membuat data member sendiri; seluruh endpoint admin membership wajib memeriksa sesi login. |
| NFR-19 | Transparency | Antarmuka harus menyatakan bahwa pengiriman WhatsApp adalah simulasi dan tidak menggunakan WhatsApp API asli. |

## 5. Rancangan Database

Database menggunakan SQLite dan terdiri dari delapan tabel: users, customers, complaints, complaint_activities, memberships, member_transactions, member_coupons, dan member_messages. Template WhatsApp statis disimpan sebagai konfigurasi di kode aplikasi dan tidak dibuatkan tabel database.

### 5.1 Tabel users

| Field | Tipe SQLite | Constraint | Keterangan |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | ID internal pengguna. |
| name | TEXT | NOT NULL | Nama pengguna. |
| username | TEXT | NOT NULL UNIQUE | Username login. |
| password_hash | TEXT | NOT NULL | Hash password bcrypt. |
| role | TEXT | NOT NULL CHECK (role IN (‘OWNER’,‘ADMIN’)) | Role pengguna. |
| is_active | INTEGER | NOT NULL DEFAULT 1 CHECK (is_active IN (0,1)) | Status akun. |
| created_at | TEXT | NOT NULL | Waktu akun dibuat dalam ISO 8601. |
| updated_at | TEXT | NOT NULL | Waktu akun diperbarui dalam ISO 8601. |

Aturan: sistem memiliki tepat satu akun OWNER yang dibuat saat instalasi. OWNER tidak dapat dinonaktifkan. Akun ADMIN dapat dibuat dan dinonaktifkan oleh OWNER.

### 5.2 Tabel customers

| Field | Tipe SQLite | Constraint | Keterangan |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | ID internal pelanggan. |
| customer_code | TEXT | NOT NULL UNIQUE | Kode dengan format CUS-YYYY-NNNN. |
| name | TEXT | NOT NULL | Nama pelanggan. |
| phone | TEXT | NOT NULL UNIQUE | Nomor WhatsApp yang dinormalisasi dengan awalan 62. |
| source | TEXT | NOT NULL CHECK (source IN (‘DIRECT’,‘GOFOOD’,‘GRABFOOD’,‘OTHER’)) | Sumber pelanggan. |
| joined_at | TEXT | NOT NULL | Waktu pelanggan terdaftar. |
| notes | TEXT | NOT NULL DEFAULT ’’ | Catatan pelanggan; nilai awal string kosong. |
| status | TEXT | NOT NULL DEFAULT ‘ACTIVE’ CHECK (status IN (‘ACTIVE’,‘ARCHIVED’)) | Status pelanggan. |
| created_at | TEXT | NOT NULL | Waktu data dibuat. |
| updated_at | TEXT | NOT NULL | Waktu data diperbarui. |

Aturan: data pelanggan tidak dihapus permanen melalui UI. Aksi hapus pada tampilan direalisasikan sebagai pengarsipan dengan status ARCHIVED.

### 5.3 Tabel complaints

| Field | Tipe SQLite | Constraint | Keterangan |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | ID internal tiket. |
| ticket_code | TEXT | NOT NULL UNIQUE | Kode dengan format TCK-YYYY-NNNN. |
| customer_id | INTEGER | NOT NULL REFERENCES customers(id) | Pelanggan pemilik keluhan. |
| category | TEXT | NOT NULL CHECK (category IN (‘FOOD_QUALITY’,‘WRONG_ORDER’,‘DELIVERY_DELAY’,‘SERVICE’,‘CLEANLINESS’,‘OTHER’)) | Kategori keluhan sesuai daftar FR-04. |
| description | TEXT | NOT NULL | Deskripsi keluhan. |
| priority | TEXT | NOT NULL CHECK (priority IN (‘LOW’,‘MEDIUM’,‘HIGH’)) | Prioritas keluhan. |
| status | TEXT | NOT NULL DEFAULT ‘NEW’ CHECK (status IN (‘NEW’,‘IN_PROGRESS’,‘RESOLVED’)) | Status tiket. |
| assigned_to | INTEGER | NOT NULL REFERENCES users(id) | Admin PIC saat ini. |
| created_by | INTEGER | NOT NULL REFERENCES users(id) | Admin pembuat tiket. |
| created_at | TEXT | NOT NULL | Waktu tiket dibuat. |
| sla_due_at | TEXT | NOT NULL | Waktu dibuat + 60 menit. |
| first_response_at | TEXT | NULL | Diisi saat pertama kali status menjadi IN_PROGRESS. |
| resolved_at | TEXT | NULL | Diisi saat status menjadi RESOLVED. |

Aturan: assigned_to dan created_by harus menunjuk akun ADMIN yang aktif ketika tiket dibuat atau ditugaskan. first_response_at dan resolved_at bernilai NULL sebelum peristiwa terkait terjadi.

### 5.4 Tabel complaint_activities

| Field | Tipe SQLite | Constraint | Keterangan |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | ID aktivitas. |
| complaint_id | INTEGER | NOT NULL REFERENCES complaints(id) | Tiket terkait. |
| user_id | INTEGER | NOT NULL REFERENCES users(id) | Pengguna pelaku aktivitas. |
| activity_type | TEXT | NOT NULL CHECK (activity_type IN (‘CREATED’,‘STATUS_CHANGED’,‘PIC_CHANGED’,‘NOTE_ADDED’)) | Jenis aktivitas. |
| description | TEXT | NOT NULL | Isi catatan atau keterangan perubahan. |
| created_at | TEXT | NOT NULL | Waktu aktivitas. |

Sistem mencatat aktivitas pembuatan tiket, perubahan status, perubahan PIC, dan penambahan catatan. Aktivitas lama tidak dapat diubah atau dihapus melalui UI. Tiket berstatus Baru atau Diproses wajib dipindahkan ke Admin aktif lain sebelum akun PIC sebelumnya dinonaktifkan.

### 5.5 Tabel memberships

| Field | Tipe SQLite | Constraint | Keterangan |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | ID internal membership. |
| customer_id | INTEGER | NOT NULL UNIQUE REFERENCES customers(id) | Pelanggan pemilik membership. |
| member_code | TEXT | NOT NULL UNIQUE | Kode dengan format MBR-YYYY-NNNN. |
| status | TEXT | NOT NULL DEFAULT ‘ACTIVE’ CHECK (status IN (‘ACTIVE’,‘INACTIVE’)) | Status membership. |
| registered_via | TEXT | NOT NULL CHECK (registered_via IN (‘QR_OUTLET’,‘QR_PACKAGING’,‘QR_TABLE’,‘MANUAL’,‘SIMULATION’)) | Sumber registrasi. |
| campaign_code | TEXT | NULL | Kode campaign QR jika registrasi berasal dari QR. |
| joined_at | TEXT | NOT NULL | Waktu member bergabung. |
| welcome_sent_at | TEXT | NULL | Waktu welcome message dikirim; NULL berarti belum dikirim. |
| last_transaction_at | TEXT | NULL | Tanggal transaksi manual terbaru. |
| consent_at | TEXT | NOT NULL | Waktu consent diberikan. |
| created_at | TEXT | NOT NULL | Waktu data dibuat. |
| updated_at | TEXT | NOT NULL | Waktu data diperbarui. |

Aturan: satu pelanggan hanya memiliki satu membership. Nomor WhatsApp tetap unik pada tabel customers sehingga registrasi ulang tidak membuat pelanggan ganda.

### 5.6 Tabel member_transactions

| Field | Tipe SQLite | Constraint | Keterangan |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | ID log transaksi. |
| customer_id | INTEGER | NOT NULL REFERENCES customers(id) | Member terkait. |
| occurred_at | TEXT | NOT NULL | Tanggal transaksi manual. |
| channel | TEXT | NOT NULL DEFAULT ‘DIRECT’ CHECK (channel IN (‘DIRECT’,‘GOFOOD’,‘GRABFOOD’,‘OTHER’)) | Kanal pembelian. |
| notes | TEXT | NOT NULL DEFAULT ’’ | Catatan transaksi. |
| created_by | INTEGER | NULL REFERENCES users(id) | Admin pencatat. |
| created_at | TEXT | NOT NULL | Waktu pencatatan. |

Aturan: tabel ini bukan POS. Tidak ada kolom nominal, pembayaran, atau stok. Fungsinya hanya menentukan tanggal aktivitas terakhir member.

### 5.7 Tabel member_coupons

| Field | Tipe SQLite | Constraint | Keterangan |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | ID kupon. |
| coupon_code | TEXT | NOT NULL UNIQUE | Kode kupon BC-TU-YYYYMM-<customerId>. |
| customer_id | INTEGER | NOT NULL REFERENCES customers(id) | Member penerima kupon. |
| campaign_id | TEXT | NOT NULL | ID campaign, contoh END_MONTH_2026-11. |
| discount_percent | INTEGER | NOT NULL DEFAULT 10 | Persentase diskon. |
| status | TEXT | NOT NULL DEFAULT ‘ISSUED’ CHECK (status IN (‘ISSUED’,‘USED’,‘EXPIRED’)) | Status kupon. |
| issued_at | TEXT | NOT NULL | Waktu kupon diterbitkan. |
| expires_at | TEXT | NOT NULL | Waktu kedaluwarsa, issued_at + 7 hari. |
| used_at | TEXT | NULL | Waktu kupon dipakai. |
| used_by | INTEGER | NULL REFERENCES users(id) | Admin yang menandai kupon dipakai. |
| created_at | TEXT | NOT NULL | Waktu data dibuat. |

Aturan: kombinasi customer_id dan campaign_id unik sehingga satu member hanya menerima satu kupon per bulan.

### 5.8 Tabel member_messages

| Field | Tipe SQLite | Constraint | Keterangan |
| --- | --- | --- | --- |
| id | INTEGER | PRIMARY KEY AUTOINCREMENT | ID pesan. |
| customer_id | INTEGER | NOT NULL REFERENCES customers(id) | Member penerima pesan. |
| phone | TEXT | NOT NULL | Nomor WhatsApp tujuan pada saat pengiriman. |
| message_type | TEXT | NOT NULL CHECK (message_type IN (‘WELCOME’,‘QR_PROMO’,‘END_MONTH_COUPON’)) | Jenis pesan membership. |
| body | TEXT | NOT NULL | Isi pesan. |
| status | TEXT | NOT NULL DEFAULT ‘SENT’ CHECK (status IN (‘QUEUED’,‘SENT’,‘FAILED’)) | Status pengiriman simulasi. |
| provider | TEXT | NOT NULL DEFAULT ‘SIMULATION’ | Provider pengiriman; versi ini selalu SIMULATION. |
| campaign_code | TEXT | NULL | Campaign terkait, jika ada. |
| coupon_id | INTEGER | NULL REFERENCES member_coupons(id) | Kupon terkait, jika ada. |
| created_at | TEXT | NOT NULL | Waktu pesan dibuat. |
| sent_at | TEXT | NULL | Waktu pesan ditandai terkirim. |

Aturan: seluruh pesan membership masuk outbox. Jika halaman pelanggan terbuka, pesan juga didorong melalui SSE.

### 5.9 Relasi Antar Tabel

| Relasi | Kardinalitas | Penjelasan |
| --- | --- | --- |
| customers → complaints | 1 : N | Satu pelanggan dapat memiliki banyak tiket. Satu tiket hanya milik satu pelanggan. |
| users → complaints (created_by) | 1 : N | Satu Admin dapat membuat banyak tiket. |
| users → complaints (assigned_to) | 1 : N | Satu Admin dapat menjadi PIC banyak tiket. |
| complaints → complaint_activities | 1 : N | Satu tiket memiliki banyak catatan aktivitas. |
| users → complaint_activities | 1 : N | Satu pengguna dapat mencatat banyak aktivitas. |
| customers → memberships | 1 : 1 | Satu pelanggan memiliki maksimal satu membership. |
| customers → member_transactions | 1 : N | Satu member dapat memiliki banyak log transaksi manual. |
| customers → member_coupons | 1 : N | Satu member dapat menerima banyak kupon lintas bulan. |
| customers → member_messages | 1 : N | Satu member dapat menerima banyak pesan simulasi. |
| member_coupons → member_messages | 1 : N | Satu kupon dapat direferensikan oleh pesan kupon. |

### 5.10 ERD

Entity Relationship Diagram CRM Bro Chicken

Diagram menunjukkan delapan tabel dan relasi foreign key. Tabel users memiliki dua relasi ke complaints, yaitu sebagai pembuat tiket (created_by) dan PIC (assigned_to). Tabel customers terhubung ke complaints, memberships, member_transactions, member_coupons, dan member_messages.

### 5.11 Index Database

Database wajib memiliki index berikut untuk mendukung pencarian dan pemfilteran:

| Nama Index | Tabel | Kolom |
| --- | --- | --- |
| idx_customers_name | customers | name |
| idx_customers_status | customers | status |
| idx_complaints_status_created | complaints | status, created_at |
| idx_complaints_assigned_to | complaints | assigned_to |
| idx_activities_complaint_created | complaint_activities | complaint_id, created_at |
| idx_memberships_status_transaction | memberships | status, last_transaction_at |
| idx_member_transactions_customer_occurred | member_transactions | customer_id, occurred_at |
| idx_member_messages_customer_created | member_messages | customer_id, created_at |
| idx_member_coupons_customer_status | member_coupons | customer_id, status |

## 6. Tahap Implementasi yang Ditetapkan

Seluruh fitur dalam SRS wajib selesai pada akhir P13. Pembagian berikut menetapkan urutan pengerjaan, bukan pilihan fitur.

### 6.1 P11 — Prototype Inti

Menyiapkan project Vanilla JavaScript, Node.js, Express.js, dan SQLite.

Membuat layout website, sidebar, topbar, dan halaman login.

Mengimplementasikan login, logout, sesi, dan hak akses Owner/Admin.

Membuat database inti empat tabel sesuai Bagian 5.

Mengimplementasikan daftar, pencarian, filter, detail, tambah, edit, arsip, dan aktivasi kembali pelanggan.

Mengimpor minimal 20 data pelanggan simulasi.

Mengimplementasikan pembuatan tiket, daftar tiket, detail tiket, prioritas, PIC, dan catatan aktivitas.

Mengimplementasikan alur status Baru → Diproses → Selesai.

Mengimplementasikan perhitungan SLA 60 menit dan penandaan keterlambatan.

Menguji seluruh alur pelanggan dan tiket serta menyimpan screenshot hasil uji.

### 6.2 P12 — Penyelesaian Sistem

Mengimplementasikan Dashboard dan seluruh kartu ringkasan.

Mengimplementasikan empat template WhatsApp bawaan, pratinjau, salin pesan, dan buka WhatsApp.

Mengimplementasikan laporan CRM, filter periode, perhitungan metrik SLA, dan ekspor CSV.

Mengimplementasikan manajemen akun Admin oleh Owner.

Mengimplementasikan perubahan password dan unduh backup database.

Melakukan pengujian hak akses Owner dan Admin.

Melakukan pengujian seluruh kriteria penerimaan pada Bagian 7.

Memperbaiki seluruh kesalahan yang ditemukan dan menyiapkan dokumentasi demo.

### 6.3 P13 — Membership dan Promo

Menambahkan tabel memberships, member_transactions, member_coupons, dan member_messages.

Mengimplementasikan halaman publik `/daftar-member` dengan validasi campaign QR dan consent.

Mengimplementasikan registrasi member, normalisasi nomor, dan pembaruan nama pelanggan lama tanpa duplikasi.

Mengimplementasikan welcome message, katalog paket hemat, dan promo QR melalui outbox simulasi.

Mengimplementasikan log transaksi manual dan pembaruan `last_transaction_at`.

Mengimplementasikan scheduler kupon tanggal tua, aturan 14 hari, diskon 10%, dan masa berlaku 7 hari.

Mengimplementasikan halaman admin Member & Promo, QR campaign, outbox pesan, dan aksi pemakaian kupon.

Mengimplementasikan integrasi SSE `member_message` pada halaman `/simulasi`.

Melakukan pengujian membership dan memperluas kriteria penerimaan dari 15 menjadi 20.

Memperbarui dokumentasi SRS, README, dan bukti pengujian.

## 7. Kriteria Penerimaan Sistem

Sistem dinyatakan memenuhi SRS apabila seluruh butir berikut lulus pengujian.

| No. | Area | Kriteria Penerimaan |
| --- | --- | --- |
| 1 | Login | Owner dan Admin dapat login; kredensial salah dan akun nonaktif ditolak. |
| 2 | Hak akses | Admin tidak dapat membuka endpoint manajemen akun atau backup; Owner dapat mengaksesnya. |
| 3 | Data pelanggan | Admin dapat menambah, mencari, melihat, mengubah, mengarsipkan, dan mengaktifkan kembali pelanggan. |
| 4 | Data awal | Minimal 20 data pelanggan simulasi tersedia di database. |
| 5 | Validasi pelanggan | Nama, nomor, dan sumber wajib terisi; nomor tidak valid atau duplikat ditolak. |
| 6 | Riwayat pelanggan | Detail pelanggan menampilkan seluruh tiket yang terhubung. |
| 7 | Pembuatan tiket | Admin dapat membuat tiket dengan ID unik, pelanggan, kategori, deskripsi, prioritas, dan PIC. |
| 8 | Aktivitas tiket | Sistem mencatat pembuatan tiket, perubahan status, perubahan PIC, dan catatan. |
| 9 | SLA | Batas SLA tepat 60 menit setelah tiket dibuat dan status keterlambatan sesuai timestamp. |
| 10 | Alur status | Status hanya bergerak Baru → Diproses → Selesai. Perpindahan yang tidak valid ditolak. |
| 11 | WhatsApp | Keempat template tersedia; Admin dapat melihat pratinjau, mengubah teks sementara, menyalin, dan membuka WhatsApp. |
| 12 | Dashboard | Seluruh angka Dashboard sesuai dengan data dan periode filter. |
| 13 | Laporan | Laporan menampilkan metrik periode yang benar dan dapat diekspor ke CSV. |
| 14 | Manajemen akun | Owner dapat membuat, mengubah, menonaktifkan, dan mengaktifkan akun Admin. |
| 15 | Backup | Owner dapat mengunduh file database SQLite yang dapat dibuka kembali. |
| 16 | Struktur membership | Tabel memberships, member_transactions, member_coupons, dan member_messages tersedia dengan foreign key dan index yang benar. |
| 17 | QR campaign | Tiga campaign QR tersedia beserta katalog paket hemat, gambar QR, dan tautan registrasi. |
| 18 | Registrasi member | Nomor WhatsApp unik tidak membuat pelanggan ganda; nama terbaru menimpa nama lama; welcome message hanya dikirim sekali. |
| 19 | Kupon tanggal tua | Member pasif lebih dari 14 hari menerima kupon 10% berlaku 7 hari; member aktif dan member baru tidak menerima kupon; proses idempoten. |
| 20 | Outbox simulasi | Seluruh pesan membership tersimpan dengan provider SIMULATION dan status yang valid, serta dapat didorong melalui SSE. |

## 8. Batasan Sistem (Di Luar Scope)

Fungsi berikut tidak dibangun pada versi CRM Bro Chicken ini:

POS, pencatatan penjualan, pembayaran, dan pengelolaan stok.

Integrasi API GoFood dan GrabFood. Sumber pelanggan dicatat manual oleh Admin.

Pengiriman WhatsApp asli melalui WhatsApp Business API atau Meta Cloud API. Seluruh pengiriman membership pada versi ini adalah simulasi yang disimpan pada outbox dan didorong melalui SSE.

Chatbot otomatis untuk penanganan keluhan. AI Triage pada halaman simulasi hanya alat demonstrasi dan tidak menggantikan Admin.

Pengelolaan template WhatsApp secara dinamis. Empat template statis ditetapkan di kode aplikasi; tiga pesan membership dihasilkan sistem.

Program loyalitas poin, stamp, penukaran reward, dan perhitungan poin dari transaksi.

Segmentasi pemasaran massal dan broadcast ke pelanggan di luar program membership. Promo QR dan kupon tanggal tua hanya dikirim ke member yang telah memberikan consent.

Aplikasi mobile native dan portal pelanggan penuh. Yang termasuk scope hanya halaman registrasi publik dan halaman simulasi WhatsApp.

Role selain Owner dan Admin. Member publik bukan role login.

Multi-cabang dan pemisahan database berdasarkan cabang.

Penghapusan permanen pelanggan melalui antarmuka aplikasi.

Perhitungan omzet, laporan penjualan, atau integrasi transaksi dengan kasir. Log transaksi member hanya mencatat tanggal aktivitas.

## 9. Ketentuan Teknis dan Operasional

Frontend wajib menggunakan HTML, CSS, dan Vanilla JavaScript.

Backend wajib menggunakan Node.js dan Express.js.

Database wajib menggunakan SQLite untuk prototype P11–P13.

Aplikasi berjalan secara lokal selama pengembangan dan demonstrasi kelas.

Jika aplikasi dipublikasikan secara online, layanan hosting wajib menyediakan penyimpanan persisten untuk file SQLite.

Data pengembangan dan demonstrasi wajib menggunakan data simulasi. Nomor WhatsApp pada screenshot harus disamarkan.

Seluruh timestamp disimpan dalam format ISO 8601 dan ditampilkan menggunakan zona waktu Asia/Jakarta.

Target SLA 60 menit dihitung sebagai waktu kalender, bukan hanya jam operasional, dan berlaku sama untuk semua kategori serta prioritas.

Timestamp disimpan dalam ISO 8601 berbasis UTC dan ditampilkan menggunakan zona waktu Asia/Jakarta.

Akun Owner awal dibuat melalui proses inisialisasi aplikasi. Akun Admin berikutnya dibuat melalui halaman manajemen akun.

File backup hanya dapat diunduh Owner.

Halaman publik `/daftar-member` dan `/simulasi` tidak memerlukan login. Kedua halaman hanya boleh mengakses data member sendiri dan tidak boleh membuka endpoint admin.

Seluruh pesan membership menggunakan provider SIMULATION. Tidak ada kredensial WhatsApp API pada versi ini. Adapter provider dapat ditambahkan tanpa mengubah alur bisnis.

Scheduler promo berjalan di proses server, memakai timer yang tidak menahan proses Node tetap hidup, dan hanya memeriksa window tiga hari terakhir bulan. Admin tetap dapat menjalankan promo secara manual untuk demo.

Consent member disimpan pada `memberships.consent_at`. Member tanpa consent tidak boleh menerima pesan promotional.

Kupon tanggal tua dihitung dari `COALESCE(last_transaction_at, joined_at)`. Member yang belum pernah bertransaksi memakai tanggal bergabung sebagai dasar perhitungan.

## 10. Penutup

SRS versi 2.0 ini menjadi baseline kebutuhan CRM Bro Chicken untuk pengembangan P11–P13. Fitur, role, alur status, SLA, membership, promo QR, kupon tanggal tua, struktur database, dan batasan scope telah ditetapkan pada dokumen ini. Perubahan terhadap baseline harus dicatat sebagai revisi SRS baru dan disepakati oleh kelompok sebelum diimplementasikan.

Akhir Dokumen — SRS CRM Bro Chicken Versi 2.0


## Lampiran Gambar dari Dokumen Word


![image1.png](SRS_CRM_Bro_Chicken_assets/image1.png)
