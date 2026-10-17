# Rencana Memaksimalkan Kartu Rumah Sakit di Layar Ponsel

**Proyek:** Tangklet Dokter — Dinas Kesehatan Kabupaten Demak  
**Tanggal:** 17 Oktober 2026

## Tujuan

Membuat keenam kartu rumah sakit lebih besar dan rapat pada layar ponsel, mengurangi ruang kosong antarkartu, serta tetap menjaga nama RS dan tombol **Detail** mudah dibaca dan disentuh.

## Temuan dari tampilan dan CSS saat ini

Pada `style.css`, bagian responsif rumah sakit sekitar baris 1745 membatasi setiap `.rumahsakit-col` ke `calc(30% - 4px)` dan menetapkan `aspect-ratio: 1.6`. Lebar 30% dapat membuat kartu terlalu kecil; rasio pada kartu luar juga berisiko membuat susunan gambar/tombol tidak proporsional. Aturan ini berada di bagian akhir stylesheet sehingga dapat mengalahkan aturan kartu yang lebih awal.

## Rancangan tampilan yang diusulkan

1. **Gunakan grid dua kolom pada ponsel.** Jadikan `.rumahsakit .row` sebagai CSS Grid dengan dua kolom setara (`minmax(0, 1fr)`), bukan menentukan lebar setiap kartu dengan persentase kecil.
2. **Persempit jarak dengan konsisten.** Gunakan jarak horizontal sekitar 10–12 px dan vertikal 12–16 px. Hapus margin lama pada kartu bila masih menambah ruang di luar `gap` grid.
3. **Perbesar area gambar.** Hilangkan rasio lebar pada elemen kartu luar. Tetapkan rasio gambar yang konsisten, misalnya 4:3 atau 1:1, lalu gunakan `object-fit: cover` agar foto tetap mengisi kartu.
4. **Pertahankan nama rumah sakit yang terbaca.** Beri lapisan judul dengan ukuran huruf yang cukup dan latar kontras. Nama panjang boleh membungkus menjadi dua atau tiga baris, bukan dipaksa mengecil sampai sulit dibaca.
5. **Buat tombol Detail nyaman disentuh.** Pertahankan tombol selebar kartu dengan tinggi/padding yang memadai; hindari tinggi 4 px pada aturan mobile lama.
6. **Atur lebar kontainer.** Gunakan hampir seluruh lebar layar dengan padding samping sekitar 12–16 px dan batas lebar kontainer yang wajar. Pusatkan grid pada ponsel yang lebih lebar.
7. **Jaga aturan desktop/tablet.** Perubahan grid dua kolom dibatasi ke breakpoint ponsel; tata letak layar besar tidak perlu berubah tanpa kebutuhan.

Contoh arah CSS untuk breakpoint ponsel (bukan patch yang sudah diterapkan):

```css
@media (max-width: 600px) {
  .rumahsakit {
    width: 100%;
    padding: 24px 14px 0;
  }

  .rumahsakit .row {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    width: 100%;
    margin: 0;
    padding: 0;
  }

  .rumahsakit-col {
    width: auto !important;
    max-width: none !important;
    min-width: 0;
    margin: 0 !important;
    aspect-ratio: auto;
  }

  .rs-img-wrap {
    aspect-ratio: 4 / 3;
  }
}
```

Angka akhir sebaiknya diuji langsung di situs. CSS di atas hanya menggambarkan pendekatan; aturan tombol, judul overlay, dan breakpoint perlu diselaraskan dengan stylesheet yang ada.

## Tahapan pengerjaan

### Tahap 1 — Pastikan struktur kartu

- Konfirmasi keenam `.rumahsakit-col` berada di dalam `.rumahsakit .row` seperti yang terlihat pada `index.html`.
- Catat aturan lain di `style.css` yang mengubah `.rumahsakit`, `.rumahsakit .row`, `.rumahsakit-col`, `.rs-img-wrap`, `.layer h3`, atau `.btn-detail-rs` pada breakpoint mobile.

### Tahap 2 — Rapikan aturan responsif

- Perbarui satu blok CSS mobile yang menjadi sumber aturan akhir; hindari menambahkan override duplikat di banyak lokasi.
- Terapkan dua kolom, gap kecil yang seragam, dan lebar kartu mengikuti kolom grid.
- Atur rasio gambar dan tinggi tombol secara terpisah dari rasio elemen kartu.
- Pastikan judul, ukuran teks, dan gambar tidak terpotong atau tertindih.

### Tahap 3 — Uji ukuran perangkat

Uji sekurangnya pada lebar 320 px, 360 px, 390 px, 430 px, dan tablet sekitar 768 px. Periksa:

- Dua kartu tampil pada tiap baris dan keenam RS tersusun menjadi tiga baris di ponsel.
- Kartu memakai lebar kolom secara seimbang; tidak ada kolom kartu yang menyusut karena flex-basis atau `!important` lama.
- Jarak horizontal/vertikal tampak rapat tetapi kartu tidak bersentuhan.
- Nama panjang tetap terbaca, foto tidak gepeng, dan tombol Detail dapat ditekan.
- Tidak muncul scroll horizontal dan tata letak desktop tetap sesuai.

## Kriteria selesai

- Pada ponsel, keenam rumah sakit tersusun dua kolom dengan kartu lebih besar dan jarak antarkartu lebih rapat.
- Gambar rumah sakit tampil proporsional dengan judul dan tombol yang jelas.
- Tidak ada aturan mobile lama yang kembali mengecilkan kartu atau menambahkan jarak berlebih.
- Tampilan tablet/desktop dan modal detail tetap berfungsi.

## Catatan

Rencana ini hanya menjelaskan perubahan yang disarankan; CSS proyek belum diubah. Implementasi berikutnya sebaiknya memusatkan perubahan pada blok mobile yang sekarang membatasi `.rumahsakit-col`, lalu memverifikasi hasil di beberapa lebar layar.
