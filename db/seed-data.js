// Data awal enam rumah sakit + satu akun admin per RS.
// Poster mengacu pada berkas gambar yang sudah ada di folder /images.

module.exports = [
  {
    slug: "rsud-sunan-kalijaga",
    name: "RSUD Sunan Kalijaga",
    official_name: "RSUD Sunan Kalijaga Demak",
    phone_rawat_jalan: "0812-1234-5001",
    phone_igd: "0812-9000-5001",
    image_url: "/images/rsud_suka.jpg",
    username: "rsud.sukalijaga",
    email: "rsud.sukalijaga@demakkab.go.id",
    posters: [
      { file_url: "/images/layanan_rsud_suka.jpg", title: "Poster Layanan RSUD Sunan Kalijaga" },
      { file_url: "/images/layanan_rsud_suka_1.jpg", title: "Poster Layanan RSUD Sunan Kalijaga 2" },
    ],
  },
  {
    slug: "rsud-sultan-fatah",
    name: "RSUD Sultan Fatah",
    official_name: "RSUD Sultan Fatah Demak",
    phone_rawat_jalan: "0812-1234-5002",
    phone_igd: "0812-9000-5002",
    image_url: "/images/rsud_sulfat.jpeg",
    username: "rsud.sultanfatah",
    email: "rsud.sultanfatah@demakkab.go.id",
    posters: [
      { file_url: "/images/layanan_rsud_sulfat.jpg", title: "Poster Layanan RSUD Sultan Fatah" },
      { file_url: "/images/layanan_rsud_sulfat_1.jpg", title: "Poster Layanan RSUD Sultan Fatah 2" },
    ],
  },
  {
    slug: "rsi-nahdlatul-ulama",
    name: "RSI Nahdlatul Ulama Demak",
    official_name: "RSI Nahdlatul Ulama Demak",
    phone_rawat_jalan: "0812-1234-5003",
    phone_igd: "0812-9000-5003",
    image_url: "/images/rsi_nu.jpeg",
    username: "rsi.nu",
    email: "rsi.nu@demakkab.go.id",
    posters: [
      { file_url: "/images/layanan_rsi_nu.jpg", title: "Poster Layanan RSI NU Demak" },
      { file_url: "/images/layanan_rsi_nu_1.jpg", title: "Poster Layanan RSI NU Demak 2" },
    ],
  },
  {
    slug: "rs-pelita-anugerah",
    name: "RS Pelita Anugerah",
    official_name: "RS Pelita Anugerah",
    phone_rawat_jalan: "0812-1234-5004",
    phone_igd: "0812-9000-5004",
    image_url: "/images/rs_pelita.jpg",
    username: "rs.pelita",
    email: "rs.pelita@demakkab.go.id",
    posters: [
      { file_url: "/images/layanan_rs_pelita.jpg", title: "Poster Layanan RS Pelita Anugerah" },
      { file_url: "/images/layanan_rs_pelita_1.jpg", title: "Poster Layanan RS Pelita Anugerah 2" },
    ],
  },
  {
    slug: "rs-hj-fatimah-sulhan",
    name: "RS Hj. Fatimah Sulhan PKU Muhammadiyah",
    official_name: "RS Hj. Fatimah Sulhan PKU Muhammadiyah",
    phone_rawat_jalan: "0812-1234-5005",
    phone_igd: "0812-9000-5005",
    image_url: "/images/rs_pku.jpg",
    username: "rs.fatimah",
    email: "rs.fatimah@demakkab.go.id",
    posters: [
      { file_url: "/images/layanan_rs_pku.jpeg", title: "Poster Layanan RS Hj. Fatimah Sulhan" },
      { file_url: "/images/layanan_rs_pku_1.jpg", title: "Poster Layanan RS Hj. Fatimah Sulhan 2" },
    ],
  },
  {
    slug: "charlie-hospital",
    name: "Charlie Hospital Demak",
    official_name: "Charlie Hospital Demak",
    phone_rawat_jalan: "0812-1234-5006",
    phone_igd: "0812-9000-5006",
    image_url: "/images/rs_charlie.jpg",
    username: "charlie",
    email: "charlie@demakkab.go.id",
    posters: [
      { file_url: "/images/layanan_rs_charlie.jpg", title: "Poster Layanan Charlie Hospital" },
      { file_url: "/images/layanan_rs_charlie_1.jpg", title: "Poster Layanan Charlie Hospital 2" },
    ],
  },
];
