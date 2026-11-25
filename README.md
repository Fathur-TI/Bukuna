# BUKUNA — Cerita Seru Untuk Dunia Kecilnya 📚✨

**BUKUNA** adalah platform buku cerita anak digital berbasis website yang dirancang untuk membantu guru TK, SD, dan orang tua menemukan, memilih, dan membacakan cerita anak yang berkualitas, sesuai usia, serta aman.

---

## 🎨 Fitur Utama & 13 Halaman Lengkap

1. **Splash Screen (`/splash` atau `/`)**: Layar pembuka dengan background teal berpola doodle anak-anak dan logo BUKUNA di tengah, otomatis berpindah setelah ±2 detik ke halaman Pilih Masuk/Daftar (atau Beranda jika sudah login).
2. **Pilih Masuk / Daftar (`/auth`)**: Logo bulat di tengah dengan dua tombol utama **"Masuk"** dan **"Daftar"**, serta pintasan masuk cepat akun demo.
3. **Masuk (`/masuk`)**: Form login (Email & Password) dengan validasi Bahasa Indonesia.
4. **Daftar (`/daftar`)**: Form pendaftaran akun baru (Nama Akun, Email, Password) dengan validasi Bahasa Indonesia.
5. **Beranda (`/beranda`)**:
   - Header dengan Logo di kiri, tombol Cari (`Q`), dan menu titik tiga (`⋮`) di kanan.
   - Hero section *"Cerita Seru Untuk Dunia Kecilnya"* dengan ilustrasi anak-anak membaca di sofa kuning.
   - Panel **"Pilihan Cerita"** (`#1FAFAA`) dengan filter chip **Kategori Tema** (*Semua Cerita, Petualangan, Persahabatan, Keluarga, Alam/Lingkungan, Fantasi*) dan **Kategori Usia** (*4-6 Tahun, 6-8 Tahun, 8-12 Tahun*) yang dapat digabungkan secara nyata.
6. **Koleksi / Daftar Cerita (`/koleksi`)**: Katalog seluruh cerita dengan panel filter Kategori & Usia bergaya akordeon sesuai wireframe, serta tab untuk melihat **Koleksi Saya**.
7. **Cerita Favorit (`/favorit`)**: Grid kartu cerita yang ditandai favorit lengkap dengan *empty state* ramah anak.
8. **Akun / Profil (`/akun`)**: Avatar kucing berkacamata, nama akun, email, serta menu interaktif **Koleksi Saya**, **Riwayat Bacaan** (menyimpan halaman terakhir yang dibaca), **Favorit Saya**, **Tentang Bukuna**, dan tombol **Keluar**.
9. **Detail Cerita (`/cerita/:id`)**: Sampul cerita besar, judul, badge kategori + rentang usia + jumlah halaman, sinopsis lengkap, tombol Favorit & Koleksi, serta tombol besar oranye **"Mulai Membaca"**.
10. **Halaman Membaca (`/baca/:id`)**: Ilustrasi per halaman cerita, kotak teks ramah anak (dengan opsi perbesar huruf), indikator halaman (`1/5`), tombol *Sebelumnya* & *Selanjutnya* (berubah menjadi *Selesai* di halaman terakhir), serta dukungan *swipe* layar sentuh dan tombol panah keyboard (`←` / `→`).
11. **Selesai Membaca (`/selesai/:id`)**: Ucapan **"HORE!"** dengan animasi konfeti, sampul cerita, tombol **"Kembali Ke Daftar Cerita"**, **"Bagikan Cerita"** (Web Share API + fallback salin link), serta tombol **Favorit** dan **Koleksi**.
12. **Tentang Kami (`/tentang`)**: Banner ilustrasi, deskripsi *Tentang Bukuna*, dan 3 kartu nilai utama (*Cerita Berkualitas*, *Mudah Diakses*, *Aman Untuk Anak*).
13. **Pencarian (`/pencarian`)**: Pencarian *real-time* dengan *debounce* berdasarkan judul, kategori, usia, atau isi sinopsis, lengkap dengan *empty state* *"Cerita tidak ditemukan"*.

---

## 📁 Struktur Folder Project

```text
BUKUNA WEB/
├── index.html                  # Entry point HTML + Google Fonts (Baloo 2, Fredoka, Nunito)
├── package.json                # Konfigurasi dependencies (React, Vite, React Router, Tailwind, Lucide)
├── vite.config.js              # Konfigurasi Vite + Tailwind CSS
├── src/
│   ├── main.jsx                # Bootstrap aplikasi React & BrowserRouter
│   ├── App.jsx                 # Routing 13 halaman + Toast notifikasi
│   ├── index.css               # Design tokens (CSS Variables) & pola wallpaper doodle SVG
│   ├── context/
│   │   └── BukunaContext.jsx   # State global (Auth, Favorit, Koleksi, Riwayat) berbasis localStorage
│   ├── hooks/
│   │   └── useDebounce.js      # Custom hook debounce untuk pencarian real-time
│   ├── data/
│   │   └── stories.js          # Data mock 12 cerita anak orisinal (masing-masing 5 halaman)
│   ├── components/
│   │   ├── BukunaLogo.jsx      # Logo SVG berwarna-warni dengan ikon buku & bintang
│   │   ├── CatAvatar.jsx       # Avatar profil kucing berkacamata sesuai referensi desain
│   │   ├── ConfettiEffect.jsx  # Animasi konfeti ringan pada halaman Selesai Membaca
│   │   ├── Header.jsx          # Header responsif dengan pencarian & menu titik tiga
│   │   ├── HeroIllustration.jsx# Ilustrasi anak-anak membaca di sofa kuning
│   │   ├── Navigation.jsx      # Bottom navigation bar (mobile/tablet)
│   │   ├── StoryCard.jsx       # Kartu cerita oranye (#E07030) dengan sudut membulat
│   │   └── StoryIllustration.jsx# Ilustrasi sampul & adegan setiap halaman cerita
│   └── pages/
│       ├── SplashPage.jsx
│       ├── AuthChoicePage.jsx
│       ├── LoginPage.jsx
│       ├── RegisterPage.jsx
│       ├── HomePage.jsx
│       ├── CollectionPage.jsx
│       ├── FavoritesPage.jsx
│       ├── ProfilePage.jsx
│       ├── StoryDetailPage.jsx
│       ├── ReadStoryPage.jsx
│       ├── FinishStoryPage.jsx
│       ├── AboutPage.jsx
│       └── SearchPage.jsx
```

---

## 🚀 Cara Menjalankan Project

### Opsi 1: Menggunakan Node.js & Vite (Standar Development)
Pastikan [Node.js](https://nodejs.org/) (versi 18+) sudah terpasang, lalu jalankan perintah berikut di terminal:

```bash
npm install
npm run dev
```

Kemudian buka alamat yang muncul di terminal (biasanya `http://localhost:5173`).

---

## 💡 Daftar Pengembangan Selanjutnya (Future Improvements)
1. **Integrasi Backend & Database (Supabase / Firebase / Node.js API)**: Menyimpan akun guru/siswa, riwayat bacaan, dan favorit secara terpusat lintas perangkat.
2. **Fitur Upload & Editor Cerita untuk Guru**: Memungkinkan guru TK/SD mengunggah cerita bergambar karya sendiri sesuai kurikulum tematik di sekolah.
3. **Narasi Suara (Read-Aloud / Text-to-Speech Bahasa Indonesia)**: Membacakan teks cerita secara ekspresif bagi anak usia 4–6 tahun yang belum lancar membaca mandiri.
4. **Kuis Interaktif Ringan di Akhir Cerita**: 2–3 pertanyaan reflektif bergambar untuk membantu guru berdiskusi tentang pesan moral cerita di kelas.
5. **Mode Offline (Progressive Web App / PWA)**: Agar buku cerita tetap dapat dibuka di daerah dengan koneksi internet terbatas.

