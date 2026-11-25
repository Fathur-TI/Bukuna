import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, RotateCcw } from 'lucide-react';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import HeroIllustration from '../components/HeroIllustration';
import StoryCard from '../components/StoryCard';
import ColorfulTitle from '../components/ColorfulTitle';
import { useBukuna } from '../context/BukunaContext';
import { getAvailableCategories, AGE_GROUPS } from '../data/stories';

/**
 * Halaman 5: Beranda / Homepage (sesuai File 1 Hal 3 kiri & File 2 Hal 1 kanan)
 * - Header: logo kiri, ikon cari & menu titik tiga kanan
 * - Hero: "Cerita Seru Untuk Dunia Kecilnya" + subteks + ilustrasi anak membaca di sofa
 * - Panel "Pilihan Cerita" (#1FAFAA): filter chip Tema + Usia yang bisa digabung + grid kartu oranye (#E07030)
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
      </main>

      <Navigation />
    </div>
  );
}

