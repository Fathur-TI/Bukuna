import React from 'react';
import { Link } from 'react-router-dom';
import { Award, Smartphone, ShieldCheck, BookOpen } from 'lucide-react';
import Header from '../components/Header';
import Logo from '../components/Logo';
import Navigation from '../components/Navigation';
import HeroIllustration from '../components/HeroIllustration';
import ColorfulTitle from '../components/ColorfulTitle';

/**
 * Halaman 12: Tentang Kami (sesuai File 1 Halaman 5 tengah)
 * - Logo bukuna di atas
 * - Banner ilustrasi
 * - Judul "Tentang Bukuna"
 * - Deskripsi resmi sesuai spesifikasi
 * - 3 Kartu Nilai Utama:
 *   1. "Cerita Berkualitas" (Dipilih dengan hati untuk anak-anak)
 *   2. "Mudah Diakses" (Bisa dibaca kapan saja dan dimana saja)
 *   3. "Aman Untuk Anak" (Konten sesuai usia dan ramah anak)
 */
export default function AboutPage() {
  const valueCards = [
    {
      title: 'Cerita Berkualitas',
      desc: 'Dipilih dengan hati untuk anak-anak',
      icon: Award,
      bg: 'bg-[#E07030]',
      iconBg: 'bg-[#FFE9B0]',
    },
    {
      title: 'Mudah Diakses',
      desc: 'Bisa dibaca kapan saja dan dimana saja',
      icon: Smartphone,
      bg: 'bg-[#1FAFAA]',
      iconBg: 'bg-[#FFE9B0]',
    },
    {
      title: 'Aman Untuk Anak',
      desc: 'Konten sesuai usia dan ramah anak',
      icon: ShieldCheck,
      bg: 'bg-[#E07030]',
      iconBg: 'bg-[#FFE9B0]',
    },
  ];

  return (
    <div className="bukuna-doodle-bg min-h-screen flex flex-col pb-24 lg:pb-12">
      <Header />

      <main className="flex-1 w-full max-w-[960px] mx-auto px-4 sm:px-6 pt-5 pb-10">
        {/* Banner Atas sesuai File 1 Halaman 5 tengah */}
        <div className="w-full rounded-[32px] bg-gradient-to-r from-[#005E5C] via-[#1FAFAA]/40 to-[#005E5C] border-2 border-[#1FAFAA]/60 p-5 sm:p-8 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden">
          <div className="max-w-md text-center sm:text-left flex flex-col items-center sm:items-start">
            <Logo size="md" className="mb-3" />
            <span className="sub-chip inline-block px-3.5 py-1 rounded-full bg-[#E07030] text-white uppercase tracking-wider mb-3">
              Sahabat Guru TK, SD & Keluarga
            </span>
            <ColorfulTitle
              as="h1"
              text="Tentang Bukuna"
              className="font-heading font-extrabold text-3xl sm:text-4xl text-[#FFE9B0] leading-tight"
            />
            <p className="sub-body mt-3 text-white/95">
              Bukuna adalah platform buku cerita anak digital yang hadir untuk menemani tumbuh kembang si kecil dengan cerita-cerita penuh makna, imajinasi, dan nilai positif.
            </p>
          </div>

          <div className="w-56 sm:w-64 shrink-0">
            <HeroIllustration />
          </div>
        </div>

        {/* 3 Kartu Nilai Utama (3 kolom sejajar seperti pada wireframe File 1 Hal 5 tengah) */}
        <section aria-label="Keunggulan Bukuna" className="mt-7 grid grid-cols-3 gap-2.5 sm:gap-5">
          {valueCards.map(({ title, desc, icon: Icon, bg, iconBg }) => (
            <div
              key={title}
              className={`${bg} rounded-[24px] p-3 sm:p-5 shadow-lg border-2 border-white/25 flex flex-col items-center text-center transition-transform hover:-translate-y-1`}
            >
              {/* Kotak Ilustrasi Ikon Atas Kartu (sesuai File 1 Hal 5 tengah) */}
              <div
                className={`w-full aspect-square max-w-[110px] rounded-[18px] ${iconBg} flex items-center justify-center mb-3 shadow-inner`}
              >
                <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-[#062D2C] stroke-[2.2]" />
              </div>

              <h2 className="font-heading font-extrabold text-sm sm:text-lg text-white leading-snug">
                {title}
              </h2>
              <p className="sub-label mt-1 text-white/95">
                {desc}
              </p>
            </div>
          ))}
        </section>

        {/* Informasi Tambahan untuk Guru & Orang Tua */}
        <section className="mt-8 bg-[#005E5C]/85 border-2 border-[#1FAFAA]/40 rounded-[28px] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-bold text-xl text-[#FFE9B0]">
              Siap Membacakan Cerita Hari Ini?
            </h2>
            <p className="sub-section text-white/90 mt-1">
              Pilih cerita berdasarkan kategori tema pembelajaran dan usia anak dengan mudah.
            </p>
          </div>
          <Link
            to="/beranda"
            className="min-h-[48px] px-6 py-3 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-bold text-sm sm:text-base inline-flex items-center gap-2 shrink-0 shadow-lg"
          >
            <BookOpen className="w-5 h-5" />
            <span>Mulai Jelajahi Cerita</span>
          </Link>
        </section>
      </main>

      <Navigation />
    </div>
  );
}

