import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Heart,
  Bookmark,
  Sparkles,
  Play,
  Edit3,
  Download,
} from 'lucide-react';
import StoryIllustration from '../components/StoryIllustration';
import Navigation from '../components/Navigation';
import { useBukuna } from '../context/BukunaContext';

/**
 * Halaman 9: Detail Cerita (sesuai File 1 Hal 4 tengah & File 2 Hal 2 kanan)
 * - Tombol kembali (<)
 * - Cover besar persegi membulat
 * - Judul cerita, baris info: Kategori • Rentang Usia • Jumlah Halaman
 * - Sinopsis lengkap
 * - Tombol ikon Favorit & Tambah ke Koleksi (+ Edit / Ekspor JSON untuk cerita buatan pengguna)
 * - Tombol besar oranye "Mulai Membaca"
 */
export default function StoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getAnyStoryById,
    isFavorite,
    toggleFavorite,
    isInCollection,
    toggleCollection,
    getStoryProgress,
    hasQuizForStory,
    exportUserStory,
    showToast,
  } = useBukuna();

  const story = getAnyStoryById(id);
  const fav = isFavorite(story.id);
  const inCol = isInCollection(story.id);
  const progress = getStoryProgress(story.id);
  const isUserStory = story.sumber === 'pengguna';
  const hasQuiz = hasQuizForStory ? hasQuizForStory(story.id) : false;

  const handleExportBackup = async () => {
    try {
      const jsonStr = await exportUserStory(story.id);
      window.__LAST_EXPORTED_STORY_JSON__ = jsonStr;
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${story.id}.bukuna.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // Abaikan
        }
      }, 1500);
      showToast('File cadangan cerita (.json) berhasil diunduh!');
    } catch {
      showToast('Gagal mengekspor cerita.');
    }
  };

  return (
    <div className="bukuna-doodle-bg min-h-screen flex flex-col pb-24 lg:pb-12">
      {/* Bar Atas dengan Tombol Kembali (<) sesuai File 2 Hal 2 kanan */}
      <header className="w-full max-w-[1000px] mx-auto px-4 sm:px-6 pt-4 pb-2 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Kembali"
          className="min-w-[44px] min-h-[44px] px-3 rounded-full bg-[#005E5C]/80 hover:bg-[#1FAFAA] text-white hover:text-[#052625] flex items-center gap-1.5 font-bold text-sm transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-6 h-6 stroke-[2.5]" />
          <span className="hidden sm:inline">Kembali</span>
        </button>

        {/* Aksi Cepat Favorit, Koleksi, & Edit (jika cerita pengguna) di Kanan Atas */}
        <div className="flex flex-wrap items-center gap-2">
          {isUserStory && (
            <Link
              to={`/cerita/${story.id}/edit`}
              className="min-h-[44px] px-4 py-2 rounded-full font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all bg-[#062D2C]/90 border-2 border-[#FFE9B0] text-[#FFE9B0] hover:bg-[#FFE9B0] hover:text-[#052625]"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Cerita</span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => toggleFavorite(story.id)}
            aria-label={fav ? 'Hapus dari Favorit' : 'Tambahkan ke Favorit'}
            className={`min-h-[44px] px-4 py-2 rounded-full font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all cursor-pointer border-2 ${
              fav
                ? 'bg-[#E07030] border-[#FFE9B0] text-white shadow-md'
                : 'bg-[#005E5C]/90 border-white/20 text-white hover:bg-white/15'
            }`}
          >
            <Heart className={`w-4 h-4 ${fav ? 'fill-white' : ''}`} />
            <span>{fav ? 'Favorit ✓' : 'Favorit'}</span>
          </button>

          <button
            type="button"
            onClick={() => toggleCollection(story.id)}
            aria-label={inCol ? 'Hapus dari Koleksi' : 'Simpan ke Koleksi'}
            className={`min-h-[44px] px-4 py-2 rounded-full font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 transition-all cursor-pointer border-2 ${
              inCol
                ? 'bg-[#1FAFAA] border-[#FFE9B0] text-[#052625] shadow-md'
                : 'bg-[#005E5C]/90 border-white/20 text-white hover:bg-white/15'
            }`}
          >
            <Bookmark className={`w-4 h-4 ${inCol ? 'fill-[#052625]' : ''}`} />
            <span>{inCol ? 'Tersimpan di Koleksi' : '+ Koleksi'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-[1000px] mx-auto px-4 sm:px-6 pt-2 pb-8">
        <div className="bg-[#005E5C]/75 backdrop-blur-md border-2 border-[#1FAFAA]/40 rounded-[32px] p-5 sm:p-8 shadow-2xl grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-center">
          {/* Sampul Cerita Besar (sesuai File 2 Hal 2 kanan & File 1 Hal 4 tengah) */}
          <div className="md:col-span-5 lg:col-span-5">
            <div className="w-full max-w-[340px] mx-auto aspect-square rounded-[26px] overflow-hidden shadow-[0_12px_30px_rgba(0,0,0,0.4)] border-4 border-[#1FAFAA]/50 relative">
              <StoryIllustration
                variant={story.cover}
                title={story.judul}
                alt={story.coverAlt || story.judul}
                showCoverTitle={true}
                sizeVariant="lg"
                fit="cover"
                loading="eager"
                objectPosition={story.objectPosition || 'center center'}
              />
              {isUserStory && (
                <div className="sub-chip absolute bottom-3 left-3 px-3 py-1 rounded-full bg-[#E07030] text-white shadow-md">
                  Buatanku ({story.status === 'terbit' ? 'Terbit' : 'Draf'})
                </div>
              )}
            </div>
          </div>

          {/* Detail Informasi Cerita & Sinopsis */}
          <div className="md:col-span-7 lg:col-span-7 flex flex-col text-left">
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl lg:text-4xl text-[#FFE9B0] leading-tight">
              {story.judul}
            </h1>

            {/* Baris Kategori, Rentang Usia, Jumlah Halaman (sesuai File 1 Hal 4 tengah) */}
            <div className="sub-chip mt-3 flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-4 py-2.5 px-4 rounded-2xl bg-[#007A78] border border-[#1FAFAA]/40 text-[#FFE9B0]">
              <span>{story.kategori}</span>
              <span className="text-white/40">•</span>
              <span>{story.usia}</span>
              <span className="text-white/40">•</span>
              <span>{story.pages.length} Halaman</span>
            </div>

            {/* Sinopsis */}
            <div className="mt-5">
              <h2 className="sub-label uppercase tracking-wider text-[#1FAFAA] mb-1.5">
                Sinopsis Cerita
              </h2>
              <p className="sub-body text-white/95">
                {story.sinopsis || 'Mari ikuti kisah seru dan penuh makna ini bersama-sama!'}
              </p>
            </div>

            {progress && (
              <div className="sub-help mt-4 inline-flex items-center gap-2 text-[#FFE9B0] bg-white/10 px-3.5 py-2 rounded-xl self-start">
                <Sparkles className="w-4 h-4" />
                <span>
                  {progress.completed
                    ? 'Kamu sudah pernah menyelesaikan cerita ini!'
                    : `Terakhir dibaca sampai Halaman ${progress.lastPage} dari ${progress.totalPages}`}
                </span>
              </div>
            )}

            {/* Tombol Besar Oranye "Mulai Membaca" & Tombol Bergambar "Main Kuis" */}
            <div className="mt-7 flex flex-col sm:flex-row flex-wrap items-center gap-3">
              <Link
                to={`/baca/${story.id}`}
                className="w-full sm:flex-1 min-h-[56px] py-4 px-8 rounded-full bg-[#E07030] hover:bg-[#C95B1E] text-white font-heading font-extrabold text-xl tracking-wide shadow-[0_8px_20px_rgba(224,112,48,0.45)] hover:shadow-[0_10px_26px_rgba(224,112,48,0.65)] transition-all flex items-center justify-center gap-2.5"
              >
                <Play className="w-6 h-6 fill-white" />
                <span>Mulai Membaca</span>
              </Link>

              {hasQuiz && (
                <Link
                  to={`/kuis/${story.id}`}
                  className="w-full sm:w-auto min-h-[56px] py-3.5 px-6 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] border-2 border-[#FFE9B0] font-heading font-extrabold text-lg shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <span className="text-xl leading-none">🎯</span>
                  <span>Main Kuis</span>
                </Link>
              )}

              {isUserStory && (
                <button
                  type="button"
                  onClick={handleExportBackup}
                  className="w-full sm:w-auto min-h-[56px] px-5 py-3 rounded-full bg-[#1FAFAA] hover:bg-[#159A95] text-[#052625] font-heading font-extrabold text-sm inline-flex items-center justify-center gap-2 shadow-md transition-colors cursor-pointer shrink-0"
                >
                  <Download className="w-5 h-5" />
                  <span>Ekspor (.json)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <Navigation />
    </div>
  );
}
