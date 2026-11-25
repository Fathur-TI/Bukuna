// Data cerita anak bawaan untuk platform BUKUNA
// Berisi 2 cerita bawaan pilihan dengan ilustrasi buku cerita dan pesan moral positif.

export const CATEGORIES = [
  'Semua Cerita',
  'Petualangan',
  'Persahabatan',
  'Keluarga',
  'Alam/Lingkungan',
  'Fantasi',
];

export const AGE_GROUPS = [
  { id: 'Semua', label: 'Semua Usia' },
  { id: '4-5', label: '4-5 Tahun' },
  { id: '5-6', label: '5-6 Tahun' },
];

/**
 * Menghasilkan daftar kategori tema yang memiliki minimal 1 cerita pada daftar cerita aktif.
 * Dengan 2 cerita bawaan saat ini, menghasilkan: ['Semua Cerita', 'Petualangan', 'Fantasi'].
 * Jika pengguna menerbitkan cerita baru di tema lain (mis. Persahabatan / Keluarga / Alam/Lingkungan),
 * chip tema tersebut otomatis ikut muncul.
 */
export function getAvailableCategories(storiesList = [], includeAll = true) {
  const activeThemes = new Set(
    (storiesList || []).map((s) => s && s.kategori).filter(Boolean)
  );
  const available = CATEGORIES.filter(
    (cat) => cat !== 'Semua Cerita' && activeThemes.has(cat)
  );
  (storiesList || []).forEach((s) => {
    if (
      s &&
      s.kategori &&
      !CATEGORIES.includes(s.kategori) &&
      !available.includes(s.kategori)
    ) {
      available.push(s.kategori);
    }
  });
  return includeAll ? ['Semua Cerita', ...available] : available;
}

export const stories = [
  {
    id: 'petualangan-kucing-di-hutan-ajaib',
    judul: 'Petualangan Kucing di Hutan Ajaib',
    kategori: 'Petualangan',
    usia: '4-5 Tahun',
    kelompokUsia: '4-5',
    cover: '/stories/kucing-hutan/cover.webp',
    coverAlt: 'Rodri si kucing kecil berjalan riang di hutan',
    objectPosition: 'center center',
    featured: true,
    sinopsis:
      'Kucing kecil bernama Rodri menemukan sebuah pintu ajaib di tengah hutan. Pintu itu membawa ke dunia penuh keajaiban, di mana ia belajar tentang keberanian, persahabatan, dan arti rumah.',
    pages: [
      {
        gambar: '/stories/kucing-hutan/halaman-1.webp',
        alt: 'Rodri si kucing kecil berjalan riang di hutan',
        teks: 'Di sebuah hutan yang tenang, hiduplah seekor kucing kecil bernama Rodri. Rodri sangat suka menjelajah dan menemukan hal-hal baru.',
      },
      {
        gambar: '/stories/kucing-hutan/halaman-2.webp',
        alt: 'Rodri menemukan pintu ajaib berbintang di pohon',
        teks: 'Suatu pagi yang cerah, Rodri melihat cahaya keemasan di balik pohon ek tua. Saat didekati, tampak sebuah pintu kayu mungil berukir bintang yang bersinar lembut.',
      },
      {
        gambar: '/stories/kucing-hutan/halaman-3.webp',
        alt: 'Rodri membuka pintu dan melihat dunia ajaib berwarna-warni',
        teks: 'Dengan hati berani, Rodri mengetuk lalu membuka pintu itu. Wah! Di baliknya terbentang taman jamur bercahaya dan sungai berkilau warna pelangi.',
      },
      {
        gambar: '/stories/kucing-hutan/halaman-4.webp',
        alt: 'Rodri bertemu sahabat baru, seekor tupai terbang',
        teks: 'Di sana, Rodri bertemu Pipi si tupai terbang yang kehilangan arah. Bersama-sama mereka melewati jembatan daun gantung dan saling menyemangati agar tidak takut.',
      },
      {
        gambar: '/stories/kucing-hutan/halaman-5.webp',
        alt: 'Rodri dan sahabatnya berjalan pulang saat matahari terbenam',
        teks: 'Setelah mengantar Pipi pulang, Rodri kembali melewati pintu ajaib sebelum senja. Ia tersenyum bahagia karena kini punya sahabat baru dan tahu bahwa rumah adalah tempat paling hangat.',
      },
    ],
  },
  {
    id: 'langit-dan-balon-warna-warni',
    judul: 'Langit dan Balon Warna-Warni',
    kategori: 'Fantasi',
    usia: '5-6 Tahun',
    kelompokUsia: '5-6',
    cover: '/stories/langit-balon/cover.webp',
    coverAlt: 'Balon-balon membawa kartu terbang di langit berpelangi',
    objectPosition: 'center center',
    featured: true,
    sinopsis:
      'Seorang anak bernama Langit menemukan balon-balon ajaib yang bisa membawa pesan kebaikan ke atas awan. Setiap warna balon menyimpan keajaiban yang menghibur teman-temannya.',
    pages: [
      {
        gambar: '/stories/langit-balon/halaman-1.webp',
        alt: 'Seorang anak melihat balon warna-warni dari jendela',
        teks: 'Langit adalah anak ceria yang gemar memandang awan dari jendela kamarnya. Suatu sore, lima balon warna-warni melayang turun tepat di halaman rumahnya.',
      },
      {
        gambar: '/stories/langit-balon/halaman-2.webp',
        alt: 'Anak itu memegang balon merah yang tersenyum',
        teks: 'Saat Langit memegang talinya, balon merah berbisik lembut, "Tuliskan harapan baikmu, kami akan membawanya terbang ke negeri awan!"',
      },
      {
        gambar: '/stories/langit-balon/halaman-3.webp',
        alt: 'Empat anak menggambar kartu di taman',
        teks: 'Langit mengajak teman-temannya di taman untuk menggambar senyuman dan ucapan semangat pada kertas kecil, lalu mengikatkannya pada balon kuning, hijau, dan biru.',
      },
      {
        gambar: '/stories/langit-balon/halaman-4.webp',
        alt: 'Balon-balon membawa kartu terbang di langit berpelangi',
        teks: 'Ketika balon-balon itu dilepaskan ke angkasa, awan-awan kelabu berubah menjadi semburat pelangi sore yang sangat indah di atas desa mereka.',
      },
      {
        gambar: '/stories/langit-balon/halaman-5.webp',
        alt: 'Anak-anak bersorak gembira',
        teks: 'Semua anak bertepuk tangan gembira. Langit belajar bahwa berbagi kebahagiaan sederhana dapat membuat dunia di sekitarnya terasa jauh lebih berwarna.',
      },
    ],
  },
];

export const initialStories = stories;
