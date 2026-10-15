# Rencana Login Admin Enam Rumah Sakit

**Proyek:** Tangklet Dokter — Dinas Kesehatan Kabupaten Demak  
**Tanggal:** 15 Oktober 2026

## 1. Tujuan

Menambahkan akses admin untuk enam rumah sakit agar tiap rumah sakit dapat memperbarui data layanan dan poster miliknya sendiri. Tombol **Login Admin Rumah Sakit** ditempatkan di footer. Saat dipilih, tombol membuka panel *flyover* berisi pilihan rumah sakit dan formulir login.

Daftar akun yang menjadi cakupan awal:

1. RSUD Sunan Kalijaga
2. RSI Nahdlatul Ulama
3. RS Pelita Anugerah
4. RSUD Sultan Fatah
5. RS Hj. Fatimah Sulhan
6. Charlie Hospital

## 2. Kondisi aplikasi saat ini

- Halaman menggunakan HTML/CSS/JavaScript statis; data rumah sakit dan nomor telepon ditulis langsung pada `index.html`.
- Poster layanan ditampilkan melalui daftar path gambar yang dikirim ke fungsi `openDetailRS(...)`.
- Footer dibuat terpisah pada beberapa halaman (`index.html`, `informasi.html`, `speling.html`, dan `chat.html`), sehingga tombol baru perlu dipasang konsisten.
- `server.js` saat ini hanya menyajikan file statis. Belum terlihat autentikasi, API data, database, maupun sistem unggah.
- Karena itu, login dan perubahan konten yang benar-benar aman memerlukan backend dan penyimpanan data; menyimpan kata sandi atau mengandalkan pemeriksaan JavaScript di browser saja tidak aman.

## 3. Alur pengguna yang diusulkan

### Pengunjung

1. Pengunjung membuka detail salah satu rumah sakit.
2. Situs mengambil data layanan dan daftar poster terbaru dari API, bukan dari nilai yang ditanam di HTML.
3. Poster dan informasi yang sudah diterbitkan tampil pada kartu/detail rumah sakit.

### Admin rumah sakit

1. Admin menekan **Login Admin Rumah Sakit** di footer.
2. Panel *flyover* muncul. Admin memilih rumah sakit, lalu mengisi nama pengguna/email dan kata sandi.
3. Server memverifikasi identitas dan mengaitkan sesi dengan satu `hospital_id`.
4. Admin masuk ke dashboard ringkas yang hanya menampilkan data rumah sakitnya sendiri.
5. Admin memperbarui informasi layanan atau mengunggah, mengurutkan, mengganti, dan menghapus poster milik RS tersebut.
6. Setelah menyimpan, admin melihat konfirmasi. Konten langsung diterbitkan, atau—bila Dinkes menghendaki moderasi—ditandai menunggu persetujuan.
7. Admin keluar; sesi server dibatalkan.

**Flyover** sebaiknya berfungsi sebagai pintu masuk yang ringkas, bukan tempat mengedit seluruh konten. Sesudah login, pindahkan admin ke halaman dashboard agar formulir dan pengelolaan poster tetap nyaman di ponsel.

## 4. Rancangan teknis yang disarankan

### Frontend

- Pertahankan tampilan dan pola visual yang sudah ada.
- Tambahkan tombol footer dan panel *flyover* yang ramah keyboard dan layar kecil.
- Buat halaman/dashboard admin untuk data layanan dan poster.
- Ubah detail rumah sakit agar membaca data dari API. Saat API gagal, tampilkan pesan yang jelas; jangan diam-diam menampilkan data lama seolah-olah sudah diperbarui.

### Backend dan penyimpanan

- Kembangkan backend Node.js yang sudah ada menjadi aplikasi yang melayani halaman sekaligus API, atau pisahkan layanan API dari hosting statis.
- Gunakan PostgreSQL untuk produksi. SQLite dapat dipakai untuk prototipe lokal, tetapi bukan pilihan utama untuk situs publik multi-admin.
- Simpan berkas gambar di object storage yang sesuai dengan lingkungan hosting; simpan URL dan metadata berkas di database. Jangan bergantung pada direktori lokal server yang bisa hilang saat deploy.
- Berkas `CNAME` menunjukkan kemungkinan situs memakai hosting statis/domain khusus. Pastikan penyedia hosting saat ini mendukung backend, atau siapkan hosting backend dan storage terpisah sebelum implementasi produksi.

### API awal

- `POST /api/auth/login` dan `POST /api/auth/logout`
- `GET /api/public/hospitals` dan `GET /api/public/hospitals/:id/services`
- `GET/PUT /api/admin/hospital` untuk profil RS yang sedang login
- `POST/PUT/DELETE /api/admin/services` untuk layanan milik RS yang sedang login
- `POST/DELETE /api/admin/posters` untuk unggah dan penghapusan poster, dengan pemeriksaan kepemilikan di server

Semua endpoint admin harus memeriksa sesi dan hak akses pada server. ID rumah sakit yang dikirim browser tidak boleh dianggap sebagai bukti kewenangan.

## 5. Data yang dikelola

| Entitas | Isi utama |
|---|---|
| Rumah sakit | ID, nama resmi, status akun, kontak pendaftaran/rawat jalan, kontak IGD, dan waktu pembaruan |
| Akun admin | ID, nama pengguna/email, hash kata sandi, `hospital_id`, status aktif, dan waktu login terakhir |
| Layanan | ID, `hospital_id`, nama layanan, keterangan, kontak/jadwal bila diperlukan, status publikasi, dan urutan tampil |
| Poster | ID, `hospital_id`, layanan terkait, URL berkas, teks alternatif/judul, urutan tampil, status publikasi, dan waktu unggah |
| Log perubahan | Admin, jenis perubahan, objek yang diubah, dan waktu perubahan untuk penelusuran/audit |

Satu akun awal dapat dipetakan ke masing-masing dari enam RS. Hindari pendaftaran akun mandiri; akun dibuat atau diaktifkan oleh pengelola yang berwenang.

## 6. Tahapan implementasi

### Tahap 1 — Sepakati kebutuhan dan hosting

- Pastikan nama resmi tiap rumah sakit, informasi yang boleh diedit, batas jumlah/ukuran poster, serta apakah perubahan langsung tayang atau perlu persetujuan Dinkes.
- Verifikasi hosting/domain saat ini dan tentukan tempat menjalankan API, database, serta penyimpanan gambar.
- Tetapkan siapa yang berwenang membuat, menonaktifkan, dan mereset enam akun.

### Tahap 2 — Backend, akun, dan kontrol akses

- Tambahkan database dan migrasikan data rumah sakit yang saat ini ditulis di HTML.
- Buat enam akun awal secara aman; simpan hanya hash kata sandi menggunakan algoritma khusus password.
- Terapkan sesi server yang aman, HTTPS, pembatasan percobaan login, validasi input, serta proteksi CSRF bila menggunakan cookie sesi.
- Terapkan pemeriksaan bahwa setiap admin hanya dapat membaca atau mengubah data dengan `hospital_id` miliknya.

### Tahap 3 — Flyover login dan dashboard

- Pasang tombol footer pada seluruh halaman yang memiliki footer.
- Implementasikan flyover: pilihan RS, formulir kredensial, status proses, pesan gagal yang tidak membocorkan detail akun, dan aksesibilitas keyboard.
- Buat dashboard responsif dengan form data layanan dan pengelolaan poster.

### Tahap 4 — Unggah poster dan tampilan publik

- Validasi tipe berkas dan ukuran di server; buat nama berkas acak dan batasi format gambar yang diterima.
- Tampilkan pratinjau, urutan poster, teks alternatif, serta konfirmasi sebelum penghapusan.
- Hubungkan kartu dan modal detail RS di halaman publik ke API; pertahankan nomor telepon, layanan, dan poster yang sekarang dengan proses migrasi.

### Tahap 5 — Uji, rilis, dan operasional

- Uji seluruh skenario pada desktop dan ponsel, siapkan backup database/berkas, dokumentasi pengelolaan akun, dan cara pemulihan akun.
- Deploy backend dan frontend, aktifkan HTTPS, lalu verifikasi bahwa perubahan admin muncul pada halaman publik.
- Pantau error login/API dan kegagalan unggah; tetapkan prosedur backup serta pemulihan.

## 7. Keamanan minimum

- Kata sandi tidak pernah disimpan dalam teks biasa, ditanam di JavaScript, atau dikirim ke log.
- Seluruh otorisasi dilakukan di backend; menyembunyikan tombol atau halaman admin di browser bukan kontrol akses.
- Gunakan HTTPS, cookie sesi `HttpOnly`, `Secure`, dan `SameSite`, rotasi/pengakhiran sesi saat logout, serta batas percobaan login.
- Admin satu RS tidak dapat mengubah RS lain, termasuk dengan mengganti ID pada URL atau request.
- Validasi input dan unggahan pada server; cegah nama berkas/path berbahaya.
- Catat perubahan penting dan sediakan backup yang dapat dipulihkan.

## 8. Kriteria selesai

- Tombol login terlihat dan bekerja konsisten pada footer semua halaman yang relevan.
- Panel flyover dapat dibuka/ditutup dengan mouse, keyboard, dan perangkat seluler.
- Keenam akun dapat login, logout, dan hanya mengelola data RS masing-masing.
- Admin dapat menambah, mengubah, dan menghapus/mengurutkan layanan serta poster sesuai kebijakan publikasi yang disepakati.
- Perubahan yang diterbitkan terlihat pada detail RS publik setelah pemuatan ulang.
- Pengunjung tanpa sesi tidak dapat mengakses endpoint admin; pengujian silang antar-RS gagal sebagaimana mestinya.
- Tidak ada kredensial rahasia di berkas HTML/JavaScript publik.

## 9. Asumsi awal untuk memulai

Rencana ini mengasumsikan enam akun (satu per rumah sakit), admin boleh mengubah informasi layanan dan poster RS-nya sendiri, serta konten langsung tayang setelah disimpan. Jika Dinkes ingin persetujuan sebelum tayang, tambahkan status **Draft / Menunggu Persetujuan / Terbit** dan panel moderasi Dinkes pada Tahap 4.
