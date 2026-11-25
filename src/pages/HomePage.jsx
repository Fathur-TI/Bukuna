import React, { useState, useMemo, useEffect } from 'react';
import {
  Sparkles,
  RotateCcw,
  BookOpen,
  Clock,
  Heart,
  Award,
  ShieldCheck,
} from 'lucide-react';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import HeroIllustration from '../components/HeroIllustration';
import StoryCard from '../components/StoryCard';
import ColorfulTitle from '../components/ColorfulTitle';
import { useBukuna } from '../context/BukunaContext';
import { getAvailableCategories, AGE_GROUPS } from '../data/stories';

const LITERACY_STATS = [
  {
    id: 'stat-pisa',
    badge: 'Data PISA & OECD',
    metric: 'Peringkat 71',
    title: 'Tantangan Literasi Membaca',
    description:
      'Berdasarkan survei PISA (OECD), kemampuan literasi membaca pelajar Indonesia masih tertinggal di peringkat bawah global, sehingga pembiasaan membaca sejak dini di lingkungan keluarga sangat krusial.',
    icon: BookOpen,
    accentClass: 'bg-[#E07030]',
  },
  {
    id: 'stat-perpusnas',
    badge: 'Kajian Perpusnas RI',
    metric: '63,90 Poin',
    title: 'Tingkat Kegemaran Membaca (TGM)',
    description:
      'Data Perpustakaan Nasional (Perpusnas) menunjukkan TGM masyarakat Indonesia terus tumbuh ke kategori sedang-tinggi, namun ketersediaan buku cerita anak bergambar yang ramah anak masih perlu diperkuat.',
    icon: Award,
    accentClass: 'bg-[#1FAFAA] text-[#052625]',
  },
  {
    id: 'stat-15-menit',
    badge: 'Riset Perkembangan Anak',
    metric: '15 Menit/Hari',
    title: 'Keajaiban Membaca Bersama Orang Tua',
    description:
      'Membacakan cerita (read-aloud) minimal 15 menit setiap hari bersama orang tua terbukti memperkaya ribuan kosakata baru serta paparan 1,4 juta kata sebelum masuk sekolah, melatih fokus kognitif, imajinasi kreatif, serta ikatan empati anak.',
    icon: Clock,
    accentClass: 'bg-[#E07030]',
  },
];

const PARENT_ROLE_PILLARS = [
  {
    title: 'Perkembangan Kognitif & Bahasa',
    text: 'Dialog hangat saat orang tua membacakan cerita merangsang daya ingat, logika sebab-akibat, dan pemerolehan kosakata anak usia dini.',
    icon: Sparkles,
  },
  {
    title: 'Imajinasi & Daya Kreativitas',
    text: 'Visualisasi ilustrasi buku cerita membantu anak membangun dunia imajinatif yang sehat dan kemampuan berpikir kreatif.',
    icon: BookOpen,
  },
  {
    title: 'Empati & Ikatan Emosional',
    text: 'Mengenal perasaan tokoh cerita dengan pendampingan orang tua atau guru menumbuhkan kepekaan sosial, budi pekerti, dan rasa aman.',
    icon: Heart,
  },
];

/**
 * Halaman 5: Beranda / Homepage (sesuai File 1 Hal 3 kiri & File 2 Hal 1 kanan)
 * - Header: logo kiri, ikon cari & menu titik tiga kanan
 * - Hero: "Cerita Seru Untuk Dunia Kecilnya" + subteks + ilustrasi anak membaca di sofa
 * - Panel "Pilihan Cerita" (#1FAFAA): filter chip Tema + Usia yang bisa digabung + grid kartu oranye (#E07030)
 * - Seksi Edukasi: "Dasar Pengembangan & Data Minat Baca" (urgensi peran orang tua & kartu statistik Perpusnas/UNESCO/15 Menit)
 */
export default function HomePage() {
  const { stories } = useBukuna();
  const [selectedCategory, setSelectedCategory] = useState('Semua Cerita');
  const [selectedAge, setSelectedAge] = useState('Semua');

  const availableCategories = useMemo(
    () => getAvailableCategories(stories, true),
    [stories]
  );

  useEffect(() => {
    if (!availableCategories.includes(selectedCategory)) {
      setSelectedCategory('Semua Cerita');
    }
  }, [availableCategories, selectedCategory]);

  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      const matchCategory =
        selectedCategory === 'Semua Cerita' || story.kategori === selectedCategory;
      const matchAge =
        selectedAge === 'Semua' ||
        story.kelompokUsia === selectedAge ||
        (story.usia && story.usia.startsWith(selectedAge));
      return matchCategory && matchAge;
    });
  }, [stories, selectedCategory, selectedAge]);

  const handleResetFilter = () => {
    setSelectedCategory('Semua Cerita');
    setSelectedAge('Semua');
  };

  return (
    <div className="bukuna-doodle-bg min-h-screen flex flex-col pb-24 lg:pb-12">
      <Header />

      <main className="flex-1 w-full max-w-[1200px] mx-auto">
        {/* HERO SECTION (Sesuai File 2: ilustrasi tanpa kartu di kanan teks hero 45-50% di mobile >=360px, turun ke bawah teks di <360px, max 460px di desktop) */}
        <section className="px-4 sm:px-6 pt-3 pb-5 lg:py-8">
          <div className="bukuna-hero-layout flex flex-row items-center justify-between gap-2 sm:gap-6 lg:gap-8">
            {/* Teks Hero Kiri */}
            <div className="bukuna-hero-text w-[52%] sm:w-1/2 text-left z-10">
              <ColorfulTitle
                as="h1"
                text="Cerita Seru Untuk Dunia Kecilnya"
                highlight="Dunia"
                className="bukuna-hero-title-wrap font-heading font-extrabold text-[#FFE9B0] text-2xl sm:text-4xl lg:text-5xl tracking-tight drop-shadow-xs"
              />
              <p className="sub-hero bukuna-hero-sub-enter mt-2 sm:mt-4 text-white/95 max-w-md">
                Temukan berbagai cerita anak yang penuh nilai, imajinasi, dan petualangan.
              </p>
            </div>

            {/* Ilustrasi Anak Membaca di Sofa Kanan (tanpa kartu, langsung di atas latar teal) */}
            <div className="bukuna-hero-media w-[48%] sm:w-1/2 flex justify-end items-center">
              <HeroIllustration className="w-full max-w-[220px] sm:max-w-[360px] lg:max-w-[460px]" />
            </div>
          </div>
        </section>

        {/* PANEL "PILIHAN CERITA" (#1FAFAA sesuai File 2 Halaman 1 kanan) */}
        <section
          aria-labelledby="pilihan-cerita-heading"
          className="bg-[#1FAFAA] rounded-t-[34px] lg:rounded-[36px] px-4 sm:px-6 lg:px-8 pt-6 pb-8 sm:pb-10 shadow-[0_-6px_24px_rgba(0,40,39,0.28)]"
        >
          <div className="flex flex-col items-center text-center mb-5">
            <ColorfulTitle
              as="h2"
              id="pilihan-cerita-heading"
              text="Pilihan Cerita"
              className="font-heading font-extrabold text-2xl sm:text-3xl text-[#FFE9B0] drop-shadow-xs"
            />
            <p className="sub-section text-[#052625] mt-0.5">
              Pilih berdasarkan tema pembelajaran dan rentang usia anak
            </p>
          </div>

          {/* Filter Kategori Tema (Chip otomatis dari data cerita aktif) */}
          <div className="mb-3">
            <span className="sub-label block uppercase tracking-wider text-[#052625] mb-2">
              Filter Kategori Tema:
            </span>
            <div
              role="group"
              aria-label="Filter Kategori Tema"
              className="flex flex-wrap gap-2"
            >
              {availableCategories.map((category) => {
                const active = selectedCategory === category;
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setSelectedCategory(category)}
                    className={`sub-chip min-h-[44px] px-4 py-2 rounded-full transition-all cursor-pointer ${
                      active
                        ? 'bg-[#062D2C] text-[#FFE9B0] shadow-md scale-[1.02]'
                        : 'bg-[#007A78]/85 text-white hover:bg-[#005E5C]'
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Kategori Usia (Chip) */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="sub-label block uppercase tracking-wider text-[#052625] mb-2">
                Filter Rentang Usia:
              </span>
              <div
                role="group"
                aria-label="Filter Kategori Usia"
                className="flex flex-wrap gap-2"
              >
                {AGE_GROUPS.map((age) => {
                  const active = selectedAge === age.id;
                  return (
                    <button
                      key={age.id}
                      type="button"
                      onClick={() => setSelectedAge(age.id)}
                      className={`sub-chip min-h-[44px] px-4 py-2 rounded-full transition-all cursor-pointer ${
                        active
                          ? 'bg-[#E07030] text-white shadow-md scale-[1.02] ring-2 ring-[#FFE9B0]'
                          : 'bg-white/85 text-[#062D2C] hover:bg-white'
                      }`}
                    >
                      {age.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {(selectedCategory !== 'Semua Cerita' || selectedAge !== 'Semua') && (
              <button
                type="button"
                onClick={handleResetFilter}
                className="sub-chip min-h-[44px] px-4 py-2 rounded-full bg-[#062D2C]/15 hover:bg-[#062D2C]/25 text-[#062D2C] inline-flex items-center gap-1.5 cursor-pointer self-end"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Filter ({filteredStories.length} cerita)</span>
              </button>
            )}
          </div>

          {/* Grid Kartu Cerita (lebar kartu tetap/maksimal, 2 kolom di HP, 3 di tablet, 4 di desktop) */}
          {filteredStories.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
              {filteredStories.map((story) => (
                <StoryCard key={story.id} story={story} showProgress={true} />
              ))}
            </div>
          ) : (
            <div className="my-6 bg-[#007A78]/90 rounded-3xl p-8 text-center max-w-md mx-auto border-2 border-white/20">
              <Sparkles className="w-12 h-12 text-[#FFE9B0] mx-auto mb-3" />
              <h3 className="font-heading text-xl font-bold text-[#FFE9B0]">
                Belum ada cerita untuk pilihan ini
              </h3>
              <p className="sub-section mt-1 text-white/90">
                Coba pilih kategori tema atau rentang usia lain untuk melihat cerita seru lainnya.
              </p>
              <button
                type="button"
                onClick={handleResetFilter}
                className="mt-5 min-h-[46px] px-6 py-2.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-bold text-sm shadow-md cursor-pointer"
              >
                Lihat Semua Cerita
              </button>
            </div>
          )}
        </section>

        {/* SEKSI EDUKASI: "DASAR PENGEMBANGAN & DATA MINAT BACA" */}
        <section
          aria-labelledby="dasar-pengembangan-heading"
          className="px-4 sm:px-6 lg:px-0 pt-7 pb-4"
        >
          <div className="bg-[#005E5C]/90 border-2 border-[#1FAFAA]/60 rounded-[34px] p-5 sm:p-8 shadow-2xl">
            {/* Header Seksi Edukasi */}
            <div className="text-center max-w-3xl mx-auto">
              <span className="sub-chip inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#E07030] text-white uppercase tracking-wider mb-2.5 shadow-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>LITERASI ANAK &amp; PERAN ORANG TUA</span>
              </span>

              <ColorfulTitle
                as="h2"
                id="dasar-pengembangan-heading"
                text="Dasar Pengembangan & Data Minat Baca"
                className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#FFE9B0] leading-tight"
              />

              <p className="sub-body mt-3 text-white/95">
                Peran aktif orang tua dalam mendampingi dan membiasakan aktivitas membaca sejak dini merupakan fondasi utama bagi perkembangan kognitif, daya imajinasi, dan kepekaan empati anak. BUKUNA hadir sebagai media literasi digital yang hangat, terarah, dan ramah untuk mendampingi tumbuh kembang semua anak bersama keluarga.
              </p>
            </div>

            {/* 3 Kartu Statistik / Data Pendukung (UNESCO, Perpusnas, 15 Menit/Hari) */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {LITERACY_STATS.map((item) => {
                const StatIcon = item.icon;
                return (
                  <article
                    key={item.id}
                    className="bg-[#062D2C]/90 border-2 border-[#1FAFAA]/50 rounded-[26px] p-5 flex flex-col justify-between shadow-xl"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className={`sub-chip px-3 py-1 rounded-full font-extrabold shadow-sm ${
                            item.id === 'stat-perpusnas'
                              ? 'bg-[#1FAFAA] text-[#052625]'
                              : 'bg-[#E07030] text-white'
                          }`}
                        >
                          {item.badge}
                        </span>
                        <div className="w-10 h-10 rounded-2xl bg-[#FFE9B0] text-[#062D2C] flex items-center justify-center shrink-0 shadow-inner">
                          <StatIcon className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="font-heading font-extrabold text-3xl sm:text-4xl text-[#FFE9B0] tracking-tight">
                        {item.metric}
                      </div>

                      <h3 className="mt-1.5 font-heading font-extrabold text-lg text-white leading-snug">
                        {item.title}
                      </h3>

                      <p className="sub-help mt-2 text-white/90">
                        {item.description}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>

            {/* Panel Pilar Urgensi Peran Orang Tua */}
            <div className="mt-6 bg-[#1FAFAA] text-[#052625] rounded-[28px] p-5 sm:p-6 border-2 border-[#FFE9B0]/70 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <h3 className="font-heading font-extrabold text-lg sm:text-xl text-[#052625]">
                  Mengapa Pendampingan Membaca Bersama Orang Tua Sangat Penting?
                </h3>
                <span className="sub-chip px-3 py-1 rounded-full bg-[#062D2C] text-[#FFE9B0] self-start sm:self-auto">
                  3 Pilar Tumbuh Kembang
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
                {PARENT_ROLE_PILLARS.map((pillar) => {
                  const PillarIcon = pillar.icon;
                  return (
                    <div
                      key={pillar.title}
                      className="bg-[#005E5C] text-white rounded-2xl p-4 border border-[#FFE9B0]/40 flex items-start gap-3 shadow-md"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#FFE9B0] text-[#062D2C] flex items-center justify-center shrink-0 mt-0.5">
                        <PillarIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-heading font-extrabold text-base text-[#FFE9B0] leading-snug">
                          {pillar.title}
                        </h4>
                        <p className="sub-help mt-1 text-white/90">
                          {pillar.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      <Navigation />
    </div>
  );
}
