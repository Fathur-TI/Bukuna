import React, { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Search, XCircle, Play, Sparkles } from 'lucide-react';
import StoryIllustration from '../components/StoryIllustration';
import Navigation from '../components/Navigation';
import TextInput from '../components/TextInput';
import { useBukuna } from '../context/BukunaContext';
import { useDebounce } from '../hooks/useDebounce';
import { getAvailableCategories } from '../data/stories';

/**
 * Halaman 13: Pencarian (sesuai File 1 Hal 5 kanan & File 2 Hal 3 kanan)
 * - Bar input pencarian menggunakan komponen reusable <TextInput /> yang berada di luar bagian hasil,
 *   sehingga saat hasil pencarian difilter secara real-time, elemen input tidak pernah di-remount
 *   dan fokus ketikan tetap terjaga penuh.
 */
export default function SearchPage() {
  const navigate = useNavigate();
  const { stories } = useBukuna();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 200);

  const availableCategories = useMemo(
    () => getAvailableCategories(stories, false),
    [stories]
  );

  const searchResults = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return stories;
    return stories.filter(
      (story) =>
        story.judul.toLowerCase().includes(q) ||
        story.kategori.toLowerCase().includes(q) ||
        story.usia.toLowerCase().includes(q) ||
        story.sinopsis.toLowerCase().includes(q)
    );
  }, [stories, debouncedQuery]);

  return (
    <div className="bukuna-doodle-bg min-h-screen flex flex-col pb-24 lg:pb-12">
      {/* Bar Pencarian Atas: Berada di luar daftar hasil pencarian */}
      <header className="sticky top-0 z-30 bg-[#007A78]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-4 flex items-center gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Kembali"
            className="w-11 h-11 rounded-full bg-[#005E5C] hover:bg-[#1FAFAA] text-white hover:text-[#052625] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>

          {/* Kotak Input Putih Membulat menggunakan komponen reusable TextInput */}
          <div className="flex-1 min-w-0">
            <TextInput
              id="search-story-input"
              name="searchQuery"
              type="search"
              inputMode="search"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari judul cerita, kategori"
              rightElement={<Search className="w-5 h-5 text-[#062D2C] pointer-events-none" />}
            />
          </div>

          {/* Tombol Hapus / Reset Input (⊗ seperti di File 2 Hal 3 kanan) */}
          <button
            type="button"
            onClick={() => (query ? setQuery('') : navigate('/beranda'))}
            aria-label={query ? 'Bersihkan kata kunci pencarian' : 'Tutup pencarian'}
            className="w-11 h-11 rounded-full flex items-center justify-center text-white hover:bg-white/15 shrink-0 transition-colors cursor-pointer"
          >
            <XCircle className="w-7 h-7 stroke-[2.2]" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[820px] mx-auto px-4 sm:px-6 pt-4 pb-8">
        {/* Pintasan Filter Cepat Kategori */}
        <div className="mb-5 flex flex-wrap gap-2">
          {availableCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setQuery(query === cat ? '' : cat)}
              className={`sub-chip min-h-[38px] px-3.5 py-1.5 rounded-full transition-colors cursor-pointer ${
                query.toLowerCase() === cat.toLowerCase()
                  ? 'bg-[#E07030] text-white'
                  : 'bg-[#005E5C] text-[#FFE9B0] hover:bg-[#1FAFAA] hover:text-[#052625]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <h1 className="font-heading font-extrabold text-xl sm:text-2xl text-[#FFE9B0] mb-4">
          Hasil Pencarian{' '}
          <span className="sub-label text-white/80">
            ({searchResults.length} cerita)
          </span>
        </h1>

        {/* Bagian Hasil Pencarian (Hanya bagian ini yang berubah saat mengetik) */}
        <div className="w-full">
          {searchResults.length > 0 ? (
            <div className="flex flex-col gap-3">
              {searchResults.map((story) => (
                <Link
                  key={story.id}
                  to={`/cerita/${story.id}`}
                  className="group flex items-center justify-between gap-4 p-3 sm:p-4 rounded-[22px] bg-[#005E5C]/90 hover:bg-[#1FAFAA] border-2 border-[#1FAFAA]/40 hover:border-[#FFE9B0] shadow-md transition-all"
                >
                  <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
                    {/* Thumbnail persegi membulat */}
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-[#E07030] p-1 shrink-0 shadow-inner">
                      <div className="w-full h-full rounded-xl overflow-hidden">
                        <StoryIllustration
                          variant={story.cover}
                          showCoverTitle={false}
                        />
                      </div>
                    </div>

                    {/* Judul & Kategori | Usia */}
                    <div className="min-w-0 text-left">
                      <h2 className="font-heading font-extrabold text-base sm:text-lg text-white group-hover:text-[#052625] truncate">
                        {story.judul}
                      </h2>
                      <p className="sub-label mt-0.5 text-[#FFE9B0] group-hover:text-[#052625]/85">
                        {story.kategori} &nbsp;|&nbsp; {story.usia}
                      </p>
                      <p className="sub-help mt-1 text-white/80 group-hover:text-[#052625]/80 line-clamp-1 hidden sm:block">
                        {story.sinopsis}
                      </p>
                    </div>
                  </div>

                  {/* Ikon Panah Kanan (▷) sesuai File 1 Hal 5 kanan */}
                  <div className="w-10 h-10 rounded-full bg-white/10 group-hover:bg-[#052625]/15 flex items-center justify-center shrink-0">
                    <Play className="w-5 h-5 text-[#FFE9B0] group-hover:text-[#052625]" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* Empty State "Cerita tidak ditemukan" */
            <div className="mt-8 bg-[#005E5C]/90 border-2 border-[#1FAFAA]/50 rounded-[30px] p-8 sm:p-10 text-center">
              <Sparkles className="w-12 h-12 text-[#FFE9B0] mx-auto mb-3" />
              <h2 className="font-heading font-extrabold text-2xl text-[#FFE9B0]">
                Cerita tidak ditemukan
              </h2>
              <p className="sub-section mt-1.5 text-white/90 max-w-md mx-auto">
                Maaf, kami tidak menemukan cerita dengan kata kunci{' '}
                <strong className="text-[#FFE9B0]">"{query}"</strong>. Coba gunakan kata kunci lain seperti "Kucing", "Petualangan", atau "Fantasi".
              </p>
              <button
                type="button"
                onClick={() => setQuery('')}
                className="mt-5 min-h-[46px] px-6 py-2.5 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-bold text-sm cursor-pointer"
              >
                Tampilkan Semua Cerita
              </button>
            </div>
          )}
        </div>
      </main>

      <Navigation />
    </div>
  );
}
