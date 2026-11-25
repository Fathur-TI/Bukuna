import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, BookmarkCheck, RotateCcw, Sparkles, Plus, Edit3 } from 'lucide-react';
import Header from '../components/Header';
import Navigation from '../components/Navigation';
import StoryCard from '../components/StoryCard';
import ColorfulTitle from '../components/ColorfulTitle';
import { useBukuna } from '../context/BukunaContext';
import { getAvailableCategories, AGE_GROUPS } from '../data/stories';

/**
 * Halaman 6: Koleksi / Daftar Cerita (sesuai File 1 Halaman 3 tengah)
 * Menampilkan "Semua Cerita" dengan panel filter Kategori & Kategori Usia (4-5 Tahun, 5-6 Tahun)
 * seperti pada wireframe File 1, ditambah tab untuk melihat Koleksi Tersimpan dan tombol "+ Buat Cerita".
 */
export default function CollectionPage() {
  const navigate = useNavigate();
  const { stories, myStories, collections } = useBukuna();
  const [activeTab, setActiveTab] = useState('semua'); // 'semua' | 'koleksi'
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

  const sourceStories = useMemo(() => {
    if (activeTab === 'koleksi') {
      return stories.filter((s) => collections.includes(s.id));
    }
    return stories;
  }, [stories, collections, activeTab]);

  const filteredStories = useMemo(() => {
    return sourceStories.filter((story) => {
      const matchCategory =
        selectedCategory === 'Semua Cerita' || story.kategori === selectedCategory;
      const matchAge =
        selectedAge === 'Semua' ||
        story.kelompokUsia === selectedAge ||
        (story.usia && story.usia.startsWith(selectedAge));
      return matchCategory && matchAge;
    });
  }, [sourceStories, selectedCategory, selectedAge]);

  const handleReset = () => {
    setSelectedCategory('Semua Cerita');
    setSelectedAge('Semua');
  };

  const handleCreateStory = () => {
    try {
      sessionStorage.removeItem('bukuna_working_draft_id_v1');
    } catch {
      // Abaikan
    }
    navigate('/cerita/buat');
  };

  return (
    <div className="bukuna-doodle-bg min-h-screen flex flex-col pb-24 lg:pb-12">
      <Header />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 pt-4 pb-8">
        {/* Header Judul, Tombol + Buat Cerita, & Tab Semua Cerita vs Koleksi Saya */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-6">
          <div>
            <ColorfulTitle
              as="h1"
              text={activeTab === 'semua' ? 'Semua Cerita' : 'Koleksi Tersimpan Saya'}
              className="font-heading font-extrabold text-2xl sm:text-3xl text-[#FFE9B0]"
            />
            <p className="sub-section text-white/90">
              {activeTab === 'semua'
                ? 'Jelajahi seluruh cerita anak berdasarkan tema dan kelompok usia'
                : `Daftar cerita yang kamu simpan ke Koleksi (${collections.length} cerita)`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCreateStory}
              className="min-h-[44px] px-4 py-2 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Cerita</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/cerita-saya')}
              className="min-h-[44px] px-4 py-2 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-xs sm:text-sm inline-flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Cerita Saya ({myStories.length})</span>
            </button>

            <div className="inline-flex rounded-full bg-[#005E5C] p-1 border border-[#1FAFAA]/50">
              <button
                type="button"
                onClick={() => setActiveTab('semua')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'semua'
                    ? 'bg-[#E07030] text-white shadow-sm'
                    : 'text-white/85 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Semua ({stories.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('koleksi')}
                className={`min-h-[40px] px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'koleksi'
                    ? 'bg-[#E07030] text-white shadow-sm'
                    : 'text-white/85 hover:text-white'
                }`}
              >
                <BookmarkCheck className="w-4 h-4" />
                <span>Koleksi ({collections.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tata Letak sesuai File 1 Halaman 3 tengah: Sidebar Kategori + Kategori Usia di kiri, Grid Cerita di kanan */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Panel Filter Kategori & Usia (mengikuti struktur File 1 Hal 3 "Daftar Cerita") */}
          <aside className="md:col-span-4 lg:col-span-3 bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-3xl p-4 sm:p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-heading font-bold text-lg text-[#FFE9B0]">Kategori Tema</h2>
              {(selectedCategory !== 'Semua Cerita' || selectedAge !== 'Semua') && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-bold text-[#FFE9B0] hover:underline flex items-center gap-1 cursor-pointer min-h-[36px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2">
              {availableCategories.map((category) => {
                const isSelected = selectedCategory === category;
                return (
                  <div key={category} className="rounded-2xl overflow-hidden transition-all">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full min-h-[46px] px-4 py-2.5 text-left font-heading font-bold text-sm sm:text-base flex items-center justify-between transition-colors cursor-pointer rounded-2xl ${
                        isSelected
                          ? 'bg-[#062D2C] text-[#FFE9B0] shadow-md'
                          : 'bg-white/10 text-white hover:bg-white/20'
                      }`}
                    >
                      <span>{category}</span>
                      <span className="sub-chip px-2 py-0.5 rounded-full bg-white/15 text-white">
                        {category === 'Semua Cerita'
                          ? sourceStories.length
                          : sourceStories.filter((s) => s.kategori === category).length}
                      </span>
                    </button>

                    {/* Sub-panel Kategori Usia di dalam kategori aktif (persis seperti File 1 Hal 3 tengah!) */}
                    {isSelected && (
                      <div className="mt-1.5 bg-[#062D2C]/90 rounded-2xl p-3 border border-[#1FAFAA]/40">
                        <p className="sub-label uppercase tracking-wider text-[#FFE9B0] mb-2">
                          Kategori Usia
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {AGE_GROUPS.map((age) => {
                            const activeAge = selectedAge === age.id;
                            return (
                              <button
                                key={age.id}
                                type="button"
                                onClick={() => setSelectedAge(age.id)}
                                className={`sub-chip min-h-[38px] px-3 py-1 rounded-full transition-colors cursor-pointer ${
                                  activeAge
                                    ? 'bg-[#E07030] text-white'
                                    : 'bg-white/15 text-white/90 hover:bg-white/25'
                                }`}
                              >
                                {age.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </aside>

          {/* Grid Kartu Cerita */}
          <section className="md:col-span-8 lg:col-span-9">
            {filteredStories.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {filteredStories.map((story) => (
                  <StoryCard key={story.id} story={story} showProgress={true} />
                ))}
              </div>
            ) : (
              <div className="bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-3xl p-8 text-center">
                <Sparkles className="w-12 h-12 text-[#FFE9B0] mx-auto mb-3" />
                <h3 className="font-heading text-xl font-bold text-[#FFE9B0]">
                  {activeTab === 'koleksi' && collections.length === 0
                    ? 'Koleksi Tersimpan Masih Kosong'
                    : 'Belum ada cerita untuk pilihan ini'}
                </h3>
                <p className="sub-section mt-1.5 text-white/90 max-w-md mx-auto">
                  {activeTab === 'koleksi' && collections.length === 0
                    ? 'Kamu bisa menambahkan cerita ke Koleksi melalui tombol "Koleksi" pada halaman Detail Cerita atau Selesai Membaca.'
                    : 'Coba pilih kategori tema atau rentang usia lain untuk melihat cerita seru lainnya.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    handleReset();
                    setActiveTab('semua');
                  }}
                  className="mt-5 min-h-[46px] px-6 py-2.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-bold text-sm cursor-pointer"
                >
                  Lihat Semua Cerita
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      <Navigation />
    </div>
  );
}
